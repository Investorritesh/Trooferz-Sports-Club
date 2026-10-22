from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from memberships.models import Membership, SubscriptionStatus
from users.models import Notification, NotificationType


class Command(BaseCommand):
    help = 'Checks membership subscriptions, auto-expires overdue ones, and sends renewal warnings for memberships ending within 3 days.'

    def handle(self, *args, **options):
        today = timezone.localdate()
        self.stdout.write(self.style.NOTICE(f"[INFO] Running membership audit for date: {today}"))

        expired_count = 0
        reminded_count = 0

        with transaction.atomic():
            # 1. Auto-expire memberships past their end_date
            overdue_memberships = Membership.objects.select_related('user', 'plan').filter(
                status=SubscriptionStatus.ACTIVE,
                is_frozen=False,
                end_date__lt=today
            )

            for mem in overdue_memberships:
                mem.status = SubscriptionStatus.EXPIRED
                mem.save(update_fields=['status'])
                expired_count += 1

                Notification.objects.create(
                    user=mem.user,
                    title="Membership Expired",
                    message=f"Your {mem.plan.name} membership expired on {mem.end_date}. Renew now to continue enjoying discounts and priority slots.",
                    notification_type=NotificationType.MEMBERSHIP
                )

            # 2. Alert memberships expiring within 3 days
            three_days_later = today + timedelta(days=3)
            expiring_soon = Membership.objects.select_related('user', 'plan').filter(
                status=SubscriptionStatus.ACTIVE,
                is_frozen=False,
                end_date__gte=today,
                end_date__lte=three_days_later
            )

            for mem in expiring_soon:
                days_left = (mem.end_date - today).days
                day_str = "today" if days_left == 0 else f"in {days_left} day{'s' if days_left > 1 else ''}"

                # Avoid sending duplicate reminders on the same day
                already_notified = Notification.objects.filter(
                    user=mem.user,
                    notification_type=NotificationType.MEMBERSHIP,
                    created_at__date=today,
                    title="Membership Expiry Reminder"
                ).exists()

                if not already_notified:
                    Notification.objects.create(
                        user=mem.user,
                        title="Membership Expiry Reminder",
                        message=f"Your {mem.plan.name} membership expires {day_str} ({mem.end_date}). You have {mem.credits_left} booking credit(s) remaining.",
                        notification_type=NotificationType.MEMBERSHIP
                    )
                    reminded_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"[SUCCESS] Audit completed: {expired_count} memberships expired, {reminded_count} renewal reminders dispatched."
        ))
