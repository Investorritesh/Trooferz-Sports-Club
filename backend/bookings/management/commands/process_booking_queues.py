from datetime import timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from bookings.models import (
    Booking, BookingStatus, BookingPlayer, PlayerPaymentStatus,
    SlotStatus, Waitlist, WaitlistStatus
)
from payments.models import WalletTransaction, WalletTransactionType, WalletCategory
from users.models import Notification, NotificationType


class Command(BaseCommand):
    help = 'Processes expired split payments (refunds paid players and frees slots) and rotates expired waitlist offers to the next candidate.'

    def handle(self, *args, **options):
        now = timezone.now()
        self.stdout.write(self.style.NOTICE(f"[INFO] Running booking queue audit at {now.strftime('%Y-%m-%d %H:%M:%S')}"))

        expired_splits_count = 0
        refunded_players_count = 0
        rotated_waitlist_count = 0

        # 1. Process Expired Split Payments
        with transaction.atomic():
            expired_splits = Booking.objects.select_related('court', 'slot', 'user').prefetch_related('players').filter(
                status=BookingStatus.PENDING,
                is_split_payment=True,
                split_expiry__lt=now
            )

            for booking in expired_splits:
                # Refund players who paid their share
                for player in booking.players.filter(payment_status=PlayerPaymentStatus.PAID):
                    if player.user and player.share_amount > Decimal('0.00'):
                        player.user.wallet_balance += player.share_amount
                        player.user.save(update_fields=['wallet_balance'])

                        WalletTransaction.objects.create(
                            user=player.user,
                            transaction_type=WalletTransactionType.CREDIT,
                            category=WalletCategory.CANCELLATION_REFUND,
                            amount=player.share_amount,
                            balance_after=player.user.wallet_balance,
                            reference_id=booking.booking_code,
                            description=f"Auto-refund: Split booking {booking.booking_code} expired before all shares were paid"
                        )
                        refunded_players_count += 1

                    player.payment_status = PlayerPaymentStatus.REFUNDED
                    player.save(update_fields=['payment_status'])

                # Free the slot
                if booking.slot:
                    booking.slot.status = SlotStatus.AVAILABLE
                    booking.slot.save(update_fields=['status'])

                booking.status = BookingStatus.CANCELLED
                booking.save(update_fields=['status', 'updated_at'])
                expired_splits_count += 1

                Notification.objects.create(
                    user=booking.user,
                    title="Split Booking Cancelled",
                    message=f"Split booking {booking.booking_code} expired because not all shares were paid within the 2-hour window. Any paid shares have been credited back to member wallets.",
                    notification_type=NotificationType.BOOKING
                )

                # Check waitlist for this newly freed slot
                top_waitlist = Waitlist.objects.filter(
                    court=booking.court,
                    date=booking.booking_date,
                    start_time=booking.start_time,
                    status=WaitlistStatus.WAITING
                ).order_by('-priority_score', 'created_at').first()

                if top_waitlist:
                    top_waitlist.status = WaitlistStatus.OFFERED
                    top_waitlist.offered_at = now
                    top_waitlist.offer_expires_at = now + timedelta(minutes=15)
                    top_waitlist.save(update_fields=['status', 'offered_at', 'offer_expires_at'])

                    Notification.objects.create(
                        user=top_waitlist.user,
                        title="Slot Available! (Waitlist Offer)",
                        message=f"A slot for {booking.court.name} on {booking.booking_date} at {booking.start_time.strftime('%H:%M')} has opened up! You have 15 minutes to claim it.",
                        notification_type=NotificationType.BOOKING
                    )

        # 2. Rotate Expired Waitlist Offers
        with transaction.atomic():
            expired_offers = Waitlist.objects.select_related('court', 'user').filter(
                status=WaitlistStatus.OFFERED,
                offer_expires_at__lt=now
            )

            for entry in expired_offers:
                entry.status = WaitlistStatus.EXPIRED
                entry.save(update_fields=['status'])
                rotated_waitlist_count += 1

                # Promote next candidate in line
                next_candidate = Waitlist.objects.filter(
                    court=entry.court,
                    date=entry.date,
                    start_time=entry.start_time,
                    status=WaitlistStatus.WAITING
                ).order_by('-priority_score', 'created_at').first()

                if next_candidate:
                    next_candidate.status = WaitlistStatus.OFFERED
                    next_candidate.offered_at = now
                    next_candidate.offer_expires_at = now + timedelta(minutes=15)
                    next_candidate.save(update_fields=['status', 'offered_at', 'offer_expires_at'])

                    Notification.objects.create(
                        user=next_candidate.user,
                        title="Slot Available! (Waitlist Offer)",
                        message=f"A slot for {entry.court.name} on {entry.date} at {entry.start_time.strftime('%H:%M')} is now offered to you! Claim within 15 minutes.",
                        notification_type=NotificationType.BOOKING
                    )

        self.stdout.write(self.style.SUCCESS(
            f"[SUCCESS] Audit completed: {expired_splits_count} expired split bookings cancelled, "
            f"{refunded_players_count} player shares refunded to wallet, "
            f"{rotated_waitlist_count} expired waitlist offers rotated."
        ))
