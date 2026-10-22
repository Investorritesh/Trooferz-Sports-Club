from datetime import time, timedelta, datetime
from decimal import Decimal
from django.utils import timezone
from .models import Slot, SlotStatus
from facilities.models import Court, PricingRule, DayType


# Operational hours: 6 AM to 11 PM (1-hour slots)
STANDARD_OPERATING_HOURS = [
    (6, 7), (7, 8), (8, 9), (9, 10), (10, 11), (11, 12),
    (12, 13), (13, 14), (14, 15), (15, 16), (16, 17), (17, 18),
    (18, 19), (19, 20), (20, 21), (21, 22), (22, 23)
]


def calculate_dynamic_slot_price(court: Court, target_date, start_time: time):
    """
    Evaluates pricing_rules to compute the dynamic price multiplier
    for a court at a specific date and time (e.g. weekend surge, evening prime hours).
    """
    multiplier = Decimal('1.00')

    # Determine day type (0 = Monday, ..., 5 = Saturday, 6 = Sunday)
    is_weekend = target_date.weekday() in [5, 6]
    day_type_filter = [DayType.ALL]
    if is_weekend:
        day_type_filter.append(DayType.WEEKEND)
    else:
        day_type_filter.append(DayType.WEEKDAY)

    # Fetch active pricing rules for this court or club-wide
    rules = PricingRule.objects.filter(
        is_active=True,
        day_type__in=day_type_filter
    ).filter(
        court__isnull=True
    ) | PricingRule.objects.filter(
        is_active=True,
        court=court,
        day_type__in=day_type_filter
    )

    for rule in rules:
        time_matches = True
        if rule.start_time and rule.end_time:
            time_matches = rule.start_time <= start_time < rule.end_time

        if time_matches:
            multiplier = max(multiplier, rule.price_multiplier)

    final_price = (court.hourly_base_price * multiplier).quantize(Decimal('0.01'))
    return multiplier, final_price


def get_or_create_court_slots(court: Court, target_date):
    """
    Retrieves all slots for a court on a date.
    If none exist yet, automatically seeds the standard operational grid.
    """
    slots = list(Slot.objects.filter(court=court, date=target_date).order_by('start_time'))

    if not slots:
        new_slots = []
        for start_h, end_h in STANDARD_OPERATING_HOURS:
            new_slots.append(
                Slot(
                    court=court,
                    date=target_date,
                    start_time=time(start_h, 0),
                    end_time=time(end_h, 0),
                    status=SlotStatus.AVAILABLE
                )
            )
        Slot.objects.bulk_create(new_slots, ignore_conflicts=True)
        slots = list(Slot.objects.filter(court=court, date=target_date).order_by('start_time'))

    # Decorate slots with dynamic pricing metadata
    results = []
    for s in slots:
        multiplier, dynamic_price = calculate_dynamic_slot_price(court, target_date, s.start_time)
        results.append({
            'id': s.id,
            'court_id': court.id,
            'court_name': court.name,
            'facility_name': court.facility.name,
            'sport_name': court.sport.name,
            'date': s.date.strftime('%Y-%m-%d'),
            'start_time': s.start_time.strftime('%H:%M'),
            'end_time': s.end_time.strftime('%H:%M'),
            'status': s.status,
            'is_available': s.status == SlotStatus.AVAILABLE,
            'available_for_date': s.status == SlotStatus.AVAILABLE,
            'booked_on_date': s.status == SlotStatus.BOOKED,
            'blocked_on_date': s.status in [SlotStatus.BLOCKED, SlotStatus.MAINTENANCE],
            'base_price': float(court.hourly_base_price),
            'price_multiplier': float(multiplier),
            'dynamic_price': float(dynamic_price),
        })

    return results
