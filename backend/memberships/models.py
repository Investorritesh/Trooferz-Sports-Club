from decimal import Decimal
from django.db import models
from django.conf import settings


class MembershipTier(models.TextChoices):
    SILVER = 'SILVER', 'Silver'
    GOLD = 'GOLD', 'Gold'
    PLATINUM = 'PLATINUM', 'Platinum'


class MembershipPlan(models.Model):
    """
    Tiered membership packages with quantitative benefits:
    discount percentages, free booking credits, and advance booking windows.
    """
    tier = models.CharField(max_length=30, choices=MembershipTier.choices, unique=True)
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_days = models.PositiveIntegerField(default=30)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('10.00'))
    free_booking_credits = models.PositiveIntegerField(default=2)
    priority_booking_days = models.PositiveIntegerField(default=14)
    benefits_summary = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'membership_plans'
        ordering = ['price']

    def __str__(self):
        return f"{self.name} ({self.tier}) - ₹{self.price} / {self.duration_days} days"


class SubscriptionStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    EXPIRED = 'EXPIRED', 'Expired'
    FROZEN = 'FROZEN', 'Frozen / Paused'
    CANCELLED = 'CANCELLED', 'Cancelled'


class Membership(models.Model):
    """
    Active customer membership subscription.
    Enforces expiry dates, remaining free credits, and freeze/pause logic.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='memberships')
    plan = models.ForeignKey(MembershipPlan, on_delete=models.PROTECT, related_name='subscriptions')
    start_date = models.DateField()
    end_date = models.DateField(db_index=True)
    credits_left = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.ACTIVE,
        db_index=True
    )
    is_frozen = models.BooleanField(default=False)
    frozen_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'memberships'
        ordering = ['-end_date']

    def __str__(self):
        return f"{self.user.email} - {self.plan.name} [{self.status}] (Exp: {self.end_date})"
