from decimal import Decimal
from datetime import time, date
from django.utils import timezone
from .models import Slot
from .slots_service import calculate_dynamic_slot_price
from facilities.models import Court
from memberships.models import Membership, SubscriptionStatus


def calculate_booking_price(court: Court, target_date: date, start_time: time, user=None, use_credit: bool = False):
    """
    Unified Pricing Engine for Trooferz Sports Club:
    Formula: Final Price = (Hourly Base Price * Dynamic Surge Multiplier) - Membership Discount
    Or if Free Booking Credit redeemed: Final Price = ₹0.00
    """
    base_price = court.hourly_base_price
    multiplier, surge_price = calculate_dynamic_slot_price(court, target_date, start_time)

    discount_amount = Decimal('0.00')
    discount_label = None
    credits_used = 0
    active_membership = None

    if user and user.is_authenticated:
        # Find active membership valid on the target booking date
        active_membership = (
            Membership.objects.select_related('plan')
            .filter(
                user=user,
                status=SubscriptionStatus.ACTIVE,
                is_frozen=False,
                end_date__gte=target_date
            )
            .order_by('-plan__discount_percent')
            .first()
        )

    if active_membership:
        if use_credit and active_membership.credits_left > 0:
            # 100% Free Booking Credit
            discount_amount = surge_price
            discount_label = f"Free Booking Credit ({active_membership.plan.name})"
            credits_used = 1
        elif active_membership.plan.discount_percent > Decimal('0.00'):
            # Tier percentage discount (e.g. 10% Silver, 20% Gold, 30% Platinum)
            discount_pct = active_membership.plan.discount_percent
            discount_amount = (surge_price * (discount_pct / Decimal('100.0'))).quantize(Decimal('0.01'))
            discount_label = f"{discount_pct}% Discount ({active_membership.plan.name})"

    final_price = max(Decimal('0.00'), surge_price - discount_amount)

    return {
        'court_id': court.id,
        'court_name': court.name,
        'date': target_date.strftime('%Y-%m-%d'),
        'start_time': start_time.strftime('%H:%M'),
        'base_price': float(base_price),
        'dynamic_multiplier': float(multiplier),
        'surge_price': float(surge_price),
        'discount_amount': float(discount_amount),
        'discount_label': discount_label,
        'final_price': float(final_price),
        'credits_used': credits_used,
        'has_membership': bool(active_membership),
        'membership_id': active_membership.id if active_membership else None,
        'membership_tier': active_membership.plan.tier if active_membership else None,
        'credits_left': active_membership.credits_left if active_membership else 0,
    }
