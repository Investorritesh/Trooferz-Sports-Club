from datetime import time, timedelta
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model

from facilities.models import Sport, Facility, Court, CourtType, PricingRule, DayType, Offer, Announcement
from memberships.models import MembershipPlan, MembershipTier
from bookings.models import Slot, SlotStatus

User = get_user_model()


class Command(BaseCommand):
    help = 'Seeds initial demonstration data: admin/staff/member users, sports, facilities, courts, plans, and slots.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Seeding Trooferz Sports Club demonstration data...'))

        # 1. Create Default Users (Admin, Staff, Member)
        admin_user, _ = User.objects.get_or_create(
            email='admin@trooferz.demo',
            defaults={
                'username': 'admin_trooferz',
                'full_name': 'Trooferz Admin',
                'phone': '+91 9876543210',
                'role': 'ADMIN',
                'is_staff': True,
                'is_superuser': True,
                'wallet_balance': Decimal('5000.00'),
            }
        )
        admin_user.set_password('ChangeMe@123')
        admin_user.save()

        staff_user, _ = User.objects.get_or_create(
            email='staff@trooferz.demo',
            defaults={
                'username': 'staff_rohit',
                'full_name': 'Rohit Sharma (Front Desk Staff)',
                'phone': '+91 9876543211',
                'role': 'STAFF',
                'is_staff': True,
                'is_superuser': False,
                'wallet_balance': Decimal('1000.00'),
            }
        )
        staff_user.set_password('Staff@123')
        staff_user.save()

        member_user, _ = User.objects.get_or_create(
            email='user@trooferz.demo',
            defaults={
                'username': 'member_amit',
                'full_name': 'Amit Deshmukh',
                'phone': '+91 9876543212',
                'role': 'MEMBER',
                'is_staff': False,
                'is_superuser': False,
                'wallet_balance': Decimal('2500.00'),
            }
        )
        member_user.set_password('User@123')
        member_user.save()

        self.stdout.write(self.style.SUCCESS('  [OK] Created demo accounts (Admin, Staff, Member)'))

        # 2. Sports Catalog
        sports_data = [
            {'name': 'Box Cricket', 'slug': 'box-cricket', 'description': 'Enclosed turf arena with high rebound nets, floodlights, and premium synthetic turf.'},
            {'name': 'Football Turf', 'slug': 'football', 'description': 'FIFA certified synthetic turf with shock pad, boundary netting, and spectator dugout.'},
            {'name': 'Badminton', 'slug': 'badminton', 'description': 'Indoor BWF standard synthetic rubber courts with anti-glare overhead illumination.'},
            {'name': 'Lawn Tennis', 'slug': 'tennis', 'description': 'Hard court acrylic surface with accurate ball bounce and tournament line markings.'},
            {'name': 'Pickleball', 'slug': 'pickleball', 'description': 'Dedicated outdoor pickleball courts for fast-paced singles and doubles play.'},
        ]
        sports = {}
        for s in sports_data:
            obj, _ = Sport.objects.get_or_create(name=s['name'], defaults=s)
            sports[s['slug']] = obj

        self.stdout.write(self.style.SUCCESS(f'  [OK] Registered {len(sports)} sports in catalog'))

        # 3. Main Facility in Baner, Pune
        facility, _ = Facility.objects.get_or_create(
            name='Trooferz Sports Club - Baner Arena',
            defaults={
                'description': 'Premier multi-sport turf and indoor racquet club near Balewadi High Street, Baner, Pune.',
                'address': 'Survey No. 42, Near Balewadi High Street, Baner, Pune, Maharashtra 411045',
                'city': 'Pune',
                'area': 'Baner',
                'opening_time': time(6, 0),
                'closing_time': time(23, 0),
                'is_active': True,
            }
        )

        # 4. Courts under the facility
        courts_data = [
            {'name': 'Main Arena Turf Pitch 1', 'sport': sports['box-cricket'], 'court_type': CourtType.OUTDOOR, 'surface_type': 'FIFA Synthetic Turf', 'capacity': 14, 'price': Decimal('1200.00')},
            {'name': 'Cage Turf Pitch 2', 'sport': sports['box-cricket'], 'court_type': CourtType.OUTDOOR, 'surface_type': 'High Density Synthetic Turf', 'capacity': 12, 'price': Decimal('1000.00')},
            {'name': '5-a-Side Football Ground', 'sport': sports['football'], 'court_type': CourtType.OUTDOOR, 'surface_type': '50mm Monofilament Turf', 'capacity': 10, 'price': Decimal('1400.00')},
            {'name': 'Badminton Court 1 (Indoor)', 'sport': sports['badminton'], 'court_type': CourtType.INDOOR, 'surface_type': 'BWF Synthetic Mat', 'capacity': 4, 'price': Decimal('500.00')},
            {'name': 'Badminton Court 2 (Indoor)', 'sport': sports['badminton'], 'court_type': CourtType.INDOOR, 'surface_type': 'BWF Synthetic Mat', 'capacity': 4, 'price': Decimal('500.00')},
            {'name': 'Championship Tennis Court', 'sport': sports['tennis'], 'court_type': CourtType.OUTDOOR, 'surface_type': '8-layer Acrylic Hardcourt', 'capacity': 4, 'price': Decimal('800.00')},
        ]
        created_courts = []
        for c in courts_data:
            court, _ = Court.objects.get_or_create(
                facility=facility,
                name=c['name'],
                defaults={
                    'sport': c['sport'],
                    'court_type': c['court_type'],
                    'surface_type': c['surface_type'],
                    'capacity': c['capacity'],
                    'hourly_base_price': c['price'],
                    'is_active': True,
                }
            )
            created_courts.append(court)

        self.stdout.write(self.style.SUCCESS(f'  [OK] Created {len(created_courts)} courts under {facility.name}'))

        # 5. Membership Plans (Silver, Gold, Platinum)
        plans_data = [
            {'tier': MembershipTier.SILVER, 'name': 'Silver Pass', 'price': Decimal('1499.00'), 'duration_days': 30, 'discount_percent': Decimal('10.00'), 'free_booking_credits': 1, 'priority_booking_days': 7, 'benefits_summary': '10% discount on all bookings, 1 free hourly booking credit, 7-day advance booking window.'},
            {'tier': MembershipTier.GOLD, 'name': 'Gold Elite', 'price': Decimal('3499.00'), 'duration_days': 90, 'discount_percent': Decimal('20.00'), 'free_booking_credits': 4, 'priority_booking_days': 14, 'benefits_summary': '20% discount on all bookings, 4 free booking credits, 14-day advance booking window, free equipment rental.'},
            {'tier': MembershipTier.PLATINUM, 'name': 'Platinum Club VIP', 'price': Decimal('9999.00'), 'duration_days': 365, 'discount_percent': Decimal('30.00'), 'free_booking_credits': 15, 'priority_booking_days': 30, 'benefits_summary': '30% discount on all bookings, 15 free booking credits, 30-day advance booking, VIP lounge access, 1-month freeze privilege.'},
        ]
        for p in plans_data:
            MembershipPlan.objects.get_or_create(tier=p['tier'], defaults=p)

        self.stdout.write(self.style.SUCCESS('  [OK] Created Tiered Membership Plans (Silver, Gold, Platinum)'))

        # 6. Pricing Rules
        PricingRule.objects.get_or_create(
            name='Weekend Peak Surge (Saturday & Sunday)',
            defaults={
                'day_type': DayType.WEEKEND,
                'price_multiplier': Decimal('1.25'),
                'is_active': True,
            }
        )
        PricingRule.objects.get_or_create(
            name='Evening Floodlight Prime Hours (6 PM - 11 PM)',
            defaults={
                'day_type': DayType.ALL,
                'start_time': time(18, 0),
                'end_time': time(23, 0),
                'price_multiplier': Decimal('1.15'),
                'is_active': True,
            }
        )

        # 7. Seed Operational Slots for the next 7 days for the first court
        primary_court = created_courts[0]
        today = timezone.localdate()
        slot_hours = [(6, 7), (7, 8), (8, 9), (9, 10), (16, 17), (17, 18), (18, 19), (19, 20), (20, 21), (21, 22), (22, 23)]

        slots_created = 0
        for day_offset in range(7):
            slot_date = today + timedelta(days=day_offset)
            for start_h, end_h in slot_hours:
                _, created = Slot.objects.get_or_create(
                    court=primary_court,
                    date=slot_date,
                    start_time=time(start_h, 0),
                    defaults={
                        'end_time': time(end_h, 0),
                        'status': SlotStatus.AVAILABLE,
                    }
                )
                if created:
                    slots_created += 1

        self.stdout.write(self.style.SUCCESS(f'  [OK] Generated {slots_created} slots across 7 days for {primary_court.name}'))

        # 8. Promotional Offer & Announcement
        Offer.objects.get_or_create(
            title='Monsoon Turf Night Pass',
            defaults={
                'description': 'Flat 20% off on all Box Cricket & Football bookings after 8 PM on weekdays.',
                'discount_percent': Decimal('20.00'),
                'valid_until': today + timedelta(days=60),
                'is_active': True,
            }
        )
        Announcement.objects.get_or_create(
            title='New Tournament-Grade Badminton Lighting Installed',
            defaults={
                'message': 'We have upgraded all indoor badminton courts with non-glare 600 Lux LED floodlighting.',
                'is_active': True,
            }
        )

        self.stdout.write(self.style.SUCCESS('\n[SUCCESS] Demo seeding complete! Ready for evaluation & testing.'))
