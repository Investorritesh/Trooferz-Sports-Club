from decimal import Decimal
from datetime import time, timedelta
from django.test import TransactionTestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.management import call_command
from rest_framework.test import APIClient

from memberships.models import MembershipPlan, Membership, SubscriptionStatus, MembershipTier
from facilities.models import Sport, Facility, Court, CourtType
from bookings.models import Slot, Booking, SlotStatus, BookingStatus
from users.models import Notification, NotificationType

User = get_user_model()


class MembershipAndPricingTests(TransactionTestCase):
    """
    Unit tests for Trooferz Membership, Dynamic Discounts, and Credits:
    1. Membership subscription with Wallet balance.
    2. Dynamic tier discount (Gold 20%) applied to court bookings.
    3. Free booking credit redemption (100% discount, ₹0 payable).
    4. Pause & Resume (Freeze/Unfreeze) with automatic expiry date extension.
    5. Scheduled management command: check_membership_expiry.
    """

    def setUp(self):
        self.client = APIClient()
        self.member = User.objects.create_user(
            username='gold_member',
            email='gold_member@trooferz.demo',
            password='TestPassword@123',
            role='MEMBER',
            wallet_balance=Decimal('5000.00')
        )
        self.client.force_authenticate(user=self.member)

        # Create Membership Plans
        self.silver_plan = MembershipPlan.objects.create(
            tier=MembershipTier.SILVER,
            name='Silver Pass',
            price=Decimal('999.00'),
            duration_days=30,
            discount_percent=Decimal('10.00'),
            free_booking_credits=1
        )
        self.gold_plan = MembershipPlan.objects.create(
            tier=MembershipTier.GOLD,
            name='Gold Pass',
            price=Decimal('1999.00'),
            duration_days=30,
            discount_percent=Decimal('20.00'),
            free_booking_credits=2
        )

        # Setup sport, facility, court
        self.sport = Sport.objects.create(name='Tennis Arena', slug='tennis-arena')
        self.facility = Facility.objects.create(name='Trooferz Baner', city='Pune', area='Baner')
        self.court = Court.objects.create(
            facility=self.facility,
            sport=self.sport,
            name='Center Court',
            court_type=CourtType.OUTDOOR,
            hourly_base_price=Decimal('1000.00'),
            is_active=True
        )

        self.test_date = timezone.localdate() + timedelta(days=2)
        # Weekday non-peak slot at 10:00 (multiplier 1.0)
        self.slot = Slot.objects.create(
            court=self.court,
            date=self.test_date,
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=SlotStatus.AVAILABLE
        )

    def test_subscribe_membership_with_wallet(self):
        """Member subscribes to Gold Pass using wallet balance."""
        response = self.client.post('/api/memberships/subscribe/', {
            'plan_id': self.gold_plan.id,
            'payment_method': 'WALLET'
        })
        self.assertEqual(response.status_code, 201)

        # Check wallet deduction: 5000 - 1999 = 3001
        self.member.refresh_from_db()
        self.assertEqual(self.member.wallet_balance, Decimal('3001.00'))

        # Check membership created
        mem = Membership.objects.filter(user=self.member, plan=self.gold_plan).first()
        self.assertIsNotNone(mem)
        self.assertEqual(mem.status, SubscriptionStatus.ACTIVE)
        self.assertEqual(mem.credits_left, 2)

    def test_membership_tier_discount_applied_on_booking(self):
        """Active Gold Member gets 20% discount on court booking."""
        # Subscribe user to Gold
        Membership.objects.create(
            user=self.member,
            plan=self.gold_plan,
            start_date=timezone.localdate(),
            end_date=timezone.localdate() + timedelta(days=30),
            credits_left=2,
            status=SubscriptionStatus.ACTIVE
        )

        # Check calculate-price endpoint
        price_resp = self.client.post('/api/bookings/calculate-price/', {
            'court_id': self.court.id,
            'date': self.test_date.strftime('%Y-%m-%d'),
            'start_time': '10:00',
            'use_credit': False
        })
        self.assertEqual(price_resp.status_code, 200)
        self.assertEqual(price_resp.data['discount_amount'], 200.0)  # 20% of 1000
        self.assertEqual(price_resp.data['final_price'], 800.0)

        # Book slot
        book_resp = self.client.post('/api/bookings/', {
            'slot_id': self.slot.id,
            'payment_method': 'WALLET'
        })
        self.assertEqual(book_resp.status_code, 201)
        self.assertEqual(Decimal(str(book_resp.data['total_amount'])), Decimal('800.00'))
        self.assertEqual(Decimal(str(book_resp.data['discount_amount'])), Decimal('200.00'))

    def test_free_booking_credit_redemption(self):
        """Member redeems 1 free credit for 100% discount (₹0 payable)."""
        mem = Membership.objects.create(
            user=self.member,
            plan=self.gold_plan,
            start_date=timezone.localdate(),
            end_date=timezone.localdate() + timedelta(days=30),
            credits_left=2,
            status=SubscriptionStatus.ACTIVE
        )

        # Book slot using credit
        response = self.client.post('/api/bookings/', {
            'slot_id': self.slot.id,
            'use_credit': True
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Decimal(str(response.data['total_amount'])), Decimal('0.00'))
        self.assertEqual(response.data['credits_used'], 1)

        # Check credits_left decremented
        mem.refresh_from_db()
        self.assertEqual(mem.credits_left, 1)

    def test_freeze_and_unfreeze_extends_end_date(self):
        """Freezing pauses membership and unfreezing extends expiry date."""
        original_end = timezone.localdate() + timedelta(days=20)
        mem = Membership.objects.create(
            user=self.member,
            plan=self.gold_plan,
            start_date=timezone.localdate() - timedelta(days=10),
            end_date=original_end,
            credits_left=2,
            status=SubscriptionStatus.ACTIVE
        )

        # 1. Freeze
        freeze_resp = self.client.post(f'/api/memberships/{mem.id}/freeze/')
        self.assertEqual(freeze_resp.status_code, 200)
        mem.refresh_from_db()
        self.assertTrue(mem.is_frozen)
        self.assertEqual(mem.status, SubscriptionStatus.FROZEN)

        # Simulate 5 days passing while frozen
        mem.frozen_at = timezone.now() - timedelta(days=5)
        mem.save(update_fields=['frozen_at'])

        # 2. Unfreeze
        unfreeze_resp = self.client.post(f'/api/memberships/{mem.id}/unfreeze/')
        self.assertEqual(unfreeze_resp.status_code, 200)
        mem.refresh_from_db()
        self.assertFalse(mem.is_frozen)
        self.assertEqual(mem.status, SubscriptionStatus.ACTIVE)
        # End date must have extended by at least 5 days
        self.assertGreaterEqual(mem.end_date, original_end + timedelta(days=5))

    def test_management_command_check_membership_expiry(self):
        """Management command auto-expires overdue memberships and sends alerts."""
        yesterday = timezone.localdate() - timedelta(days=1)
        overdue_mem = Membership.objects.create(
            user=self.member,
            plan=self.silver_plan,
            start_date=timezone.localdate() - timedelta(days=31),
            end_date=yesterday,
            credits_left=1,
            status=SubscriptionStatus.ACTIVE
        )

        # Run command
        call_command('check_membership_expiry')

        overdue_mem.refresh_from_db()
        self.assertEqual(overdue_mem.status, SubscriptionStatus.EXPIRED)

        # Verify notification created
        notif = Notification.objects.filter(user=self.member, title="Membership Expired").first()
        self.assertIsNotNone(notif)
