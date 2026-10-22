from decimal import Decimal
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from django.conf import settings
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db import transaction

from .models import Booking, BookingStatus, SlotStatus, Waitlist, WaitlistStatus
from payments.models import WalletTransaction, WalletTransactionType, WalletCategory, Payment, PaymentStatus
from users.models import Notification, NotificationType


# Allowed state machine transitions for Trooferz bookings
VALID_TRANSITIONS = {
    BookingStatus.PENDING: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
    BookingStatus.CONFIRMED: [BookingStatus.CHECKED_IN, BookingStatus.CANCELLED, BookingStatus.COMPLETED],
    BookingStatus.CHECKED_IN: [BookingStatus.COMPLETED],
    BookingStatus.CANCELLED: [BookingStatus.REFUNDED],
    BookingStatus.COMPLETED: [],
    BookingStatus.REFUNDED: [],
}


def validate_status_transition(current_status: str, new_status: str):
    """
    Validates whether a booking can legally transition from current_status to new_status.
    Prevents illegal states (e.g. attempting to cancel an already completed game).
    """
    if current_status == new_status:
        return True

    allowed = VALID_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        raise ValidationError(
            f"Illegal booking state transition: '{current_status}' cannot be transitioned to '{new_status}'. "
            f"Permitted next states: {', '.join(allowed) if allowed else 'None (Terminal state)'}."
        )
    return True


def calculate_cancellation_refund(booking: Booking, now=None):
    """
    Calculates the exact refund amount and percentage based on how many hours
    remain before the booking's scheduled start time.

    Configurable Rules:
    - Over 24 hours prior: 100% full refund
    - Between 24h and 6h prior: 50% partial refund
    - Under 6 hours prior: 0% refund (slot blocked with insufficient re-sale time)
    """
    if not now:
        now = timezone.now()

    tz_name = getattr(settings, 'TIME_ZONE', 'Asia/Kolkata')
    tz = ZoneInfo(tz_name)

    if timezone.is_naive(now):
        now = now.replace(tzinfo=tz)
    else:
        now = now.astimezone(tz)

    # Construct the localized match start datetime
    match_dt = datetime.combine(booking.booking_date, booking.start_time, tzinfo=tz)

    seconds_remaining = (match_dt - now).total_seconds()
    hours_remaining = seconds_remaining / 3600.0

    full_hours = getattr(settings, 'CANCELLATION_FULL_REFUND_HOURS', 24)
    partial_hours = getattr(settings, 'CANCELLATION_PARTIAL_REFUND_HOURS', 6)
    partial_pct = Decimal(str(getattr(settings, 'CANCELLATION_PARTIAL_REFUND_PERCENT', 50.0)))

    if hours_remaining >= full_hours:
        pct = Decimal('100.0')
        refund_amount = booking.total_amount
    elif hours_remaining >= partial_hours:
        pct = partial_pct
        refund_amount = (booking.total_amount * (partial_pct / Decimal('100.0'))).quantize(Decimal('0.01'))
    else:
        pct = Decimal('0.0')
        refund_amount = Decimal('0.00')

    return {
        'hours_remaining': round(hours_remaining, 2),
        'refund_percentage': float(pct),
        'refund_amount': refund_amount,
    }


def execute_booking_cancellation(booking: Booking, cancelled_by, reason: str = ''):
    """
    Executes a complete booking cancellation inside an atomic transaction:
    1. Validates state transition to CANCELLED.
    2. Calculates eligible refund.
    3. Credits user wallet and logs WalletTransaction.
    4. Releases the court Slot back to AVAILABLE.
    5. Dispatches an in-app Notification.
    """
    with transaction.atomic():
        validate_status_transition(booking.status, BookingStatus.CANCELLED)

        refund_info = calculate_cancellation_refund(booking)
        refund_amount = refund_info['refund_amount']
        refund_pct = refund_info['refund_percentage']

        user = booking.user

        # Credit user's wallet balance if eligible
        if refund_amount > Decimal('0.00'):
            user.wallet_balance += refund_amount
            user.save(update_fields=['wallet_balance'])

            WalletTransaction.objects.create(
                user=user,
                transaction_type=WalletTransactionType.CREDIT,
                category=WalletCategory.CANCELLATION_REFUND,
                amount=refund_amount,
                balance_after=user.wallet_balance,
                reference_id=booking.booking_code,
                description=f"Refund of {refund_pct}% for cancelled booking {booking.booking_code}"
            )

        # Release the slot back to available so others can book
        slot = booking.slot
        slot.status = SlotStatus.AVAILABLE
        slot.save(update_fields=['status'])

        # Update booking status
        booking.status = BookingStatus.CANCELLED
        booking.save(update_fields=['status', 'updated_at'])

        # Check for waitlisted members and auto-offer to the highest priority candidate
        top_waitlist = Waitlist.objects.filter(
            court=slot.court,
            date=slot.date,
            start_time=slot.start_time,
            status=WaitlistStatus.WAITING
        ).order_by('-priority_score', 'created_at').first()

        if top_waitlist:
            top_waitlist.status = WaitlistStatus.OFFERED
            top_waitlist.offered_at = timezone.now()
            top_waitlist.offer_expires_at = timezone.now() + timedelta(minutes=15)
            top_waitlist.save(update_fields=['status', 'offered_at', 'offer_expires_at'])

            Notification.objects.create(
                user=top_waitlist.user,
                title="Slot Available! (Waitlist Offer)",
                message=(
                    f"A slot for {slot.court.name} on {slot.date} at {slot.start_time.strftime('%H:%M')} "
                    f"has opened up! You have 15 minutes to claim it."
                ),
                notification_type=NotificationType.BOOKING
            )

        # Notify the customer
        Notification.objects.create(
            user=user,
            title="Booking Cancelled",
            message=(
                f"Your booking {booking.booking_code} for {booking.court.name} on {booking.booking_date} "
                f"has been cancelled. Refund credited to your wallet: ₹{refund_amount} ({refund_pct}%)."
            ),
            notification_type=NotificationType.BOOKING
        )

        return {
            'booking_code': booking.booking_code,
            'status': BookingStatus.CANCELLED,
            'refund_amount': float(refund_amount),
            'refund_percentage': refund_pct,
            'hours_prior': refund_info['hours_remaining'],
            'new_wallet_balance': float(user.wallet_balance),
        }
