import threading
from datetime import time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo
from django.test import TransactionTestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.management import call_command
from rest_framework.test import APIClient

from .models import Slot, Booking, BookingPlayer, Waitlist, SlotStatus, BookingStatus, PlayerPaymentStatus, WaitlistStatus
from facilities.models import Sport, Facility, Court, CourtType
from memberships.models import MembershipPlan, Membership, SubscriptionStatus, MembershipTier

User = get_user_model()


class BookingConcurrencyAndLifecycleTests(TransactionTestCase):
    """
    Unit & Concurrency Tests for Trooferz Sports Club:
    1. Simultaneous double-booking race condition prevention (SELECT FOR UPDATE).
    2. Strict lifecycle state machine transitions.
    3. Tiered cancellation refund logic.
    4. Conflict-free rescheduling.
    """

    def setUp(self):
        # 1. Setup Test Users
        self.user1 = User.objects.create_user(
            username='player1',
            email='player1@trooferz.demo',
            password='TestPassword@123',
            role='MEMBER',
            wallet_balance=Decimal('2000.00')
        )
        self.user2 = User.objects.create_user(
            username='player2',
            email='player2@trooferz.demo',
            password='TestPassword@123',
            role='MEMBER',
            wallet_balance=Decimal('2000.00')
        )
        self.admin = User.objects.create_user(
            username='club_admin',
            email='admin_test@trooferz.demo',
            password='TestPassword@123',
            role='ADMIN',
            is_staff=True,
            is_superuser=True
        )

        # 2. Setup Venue, Sport, and Court
        self.sport = Sport.objects.create(
            name='Test Box Cricket',
            slug='test-cricket',
            description='Turf arena for tests'
        )
        self.facility = Facility.objects.create(
            name='Trooferz Baner Arena',
            city='Pune',
            area='Baner'
        )
        self.court = Court.objects.create(
            facility=self.facility,
            sport=self.sport,
            name='Main Pitch A',
            court_type=CourtType.OUTDOOR,
            hourly_base_price=Decimal('1000.00'),
            is_active=True
        )

        # 3. Setup Target Slot
        self.target_date = timezone.localdate() + timedelta(days=2)
        self.slot = Slot.objects.create(
            court=self.court,
            date=self.target_date,
            start_time=time(19, 0),
            end_time=time(20, 0),
            status=SlotStatus.AVAILABLE
        )

    def test_concurrent_double_booking_prevention(self):
        """
        Concurrency Proof:
        Simulates two players attempting to book the exact same slot at the exact same millisecond.
        Guarantees that:
        - Exactly ONE request succeeds (HTTP 201 Created).
        - Exactly ONE request is rejected (HTTP 409 Conflict).
        - Exactly ONE Booking row exists in the database.
        - The slot status transitions to BOOKED.
        """
        results = []

        def attempt_booking(user):
            from django.db import connection
            try:
                client = APIClient()
                client.force_authenticate(user=user)
                response = client.post('/api/bookings/', {
                    'court_id': self.court.id,
                    'slot_id': self.slot.id,
                    'booking_date': self.target_date.strftime('%Y-%m-%d')
                }, format='json')
                results.append((response.status_code, response.data))
            finally:
                connection.close()

        t1 = threading.Thread(target=attempt_booking, args=(self.user1,))
        t2 = threading.Thread(target=attempt_booking, args=(self.user2,))

        # Launch both threads simultaneously
        t1.start()
        t2.start()

        t1.join()
        t2.join()

        status_codes = [r[0] for r in results]

        # Verify that one succeeded and the other was rejected with HTTP 409
        self.assertIn(201, status_codes, "One booking must succeed with HTTP 201 Created.")
        self.assertIn(409, status_codes, "The colliding booking must fail with HTTP 409 Conflict.")

        # Verify database integrity
        self.assertEqual(Booking.objects.filter(slot=self.slot).count(), 1)
        self.slot.refresh_from_db()
        self.assertEqual(self.slot.status, SlotStatus.BOOKED)

    def test_booking_lifecycle_state_machine(self):
        """
        Validates valid state progression and catches illegal transitions.
        """
        client = APIClient()
        client.force_authenticate(user=self.admin)

        booking = Booking.objects.create(
            booking_code='TRF-TEST-001',
            user=self.user1,
            court=self.court,
            slot=self.slot,
            booking_date=self.target_date,
            start_time=self.slot.start_time,
            end_time=self.slot.end_time,
            base_price=Decimal('1000.00'),
            total_amount=Decimal('1000.00'),
            status=BookingStatus.CONFIRMED
        )

        # 1. Valid: CONFIRMED -> CHECKED_IN
        r1 = client.patch(f'/api/bookings/{booking.id}/update_status/', {'status': BookingStatus.CHECKED_IN})
        self.assertEqual(r1.status_code, 200)

        # 2. Valid: CHECKED_IN -> COMPLETED
        r2 = client.patch(f'/api/bookings/{booking.id}/update_status/', {'status': BookingStatus.COMPLETED})
        self.assertEqual(r2.status_code, 200)

        # 3. Illegal: COMPLETED -> CANCELLED (Terminal state violation)
        r3 = client.patch(f'/api/bookings/{booking.id}/update_status/', {'status': BookingStatus.CANCELLED})
        self.assertEqual(r3.status_code, 400)
        self.assertIn("Illegal booking state transition", r3.data.get('message', ''))

    def test_cancellation_tiered_refund_and_slot_release(self):
        """
        Tests cancellation >24h prior:
        - 100% refund credited to user's wallet.
        - Slot returned to AVAILABLE.
        - Booking marked CANCELLED.
        """
        client = APIClient()
        client.force_authenticate(user=self.user1)

        # Slot 48 hours in the future
        future_date = timezone.localdate() + timedelta(days=3)
        future_slot = Slot.objects.create(
            court=self.court,
            date=future_date,
            start_time=time(18, 0),
            end_time=time(19, 0),
            status=SlotStatus.BOOKED
        )

        initial_wallet = self.user1.wallet_balance

        booking = Booking.objects.create(
            booking_code='TRF-CANCEL-TEST',
            user=self.user1,
            court=self.court,
            slot=future_slot,
            booking_date=future_date,
            start_time=future_slot.start_time,
            end_time=future_slot.end_time,
            base_price=Decimal('1000.00'),
            total_amount=Decimal('1000.00'),
            status=BookingStatus.CONFIRMED
        )

        # Cancel the booking
        r = client.post(f'/api/bookings/{booking.id}/cancel/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['refund_percentage'], 100.0)
        self.assertEqual(Decimal(str(r.data['refund_amount'])), Decimal('1000.00'))

        # Check wallet balance updated
        self.user1.refresh_from_db()
        self.assertEqual(self.user1.wallet_balance, initial_wallet + Decimal('1000.00'))

        # Check slot freed
        future_slot.refresh_from_db()
        self.assertEqual(future_slot.status, SlotStatus.AVAILABLE)

    def test_reschedule_booking(self):
        """
        Tests moving an active confirmed booking to a new available slot:
        - Old slot transitions to AVAILABLE.
        - New slot transitions to BOOKED.
        - Booking date/time updated.
        """
        client = APIClient()
        client.force_authenticate(user=self.user1)

        # Existing booking
        booking = Booking.objects.create(
            booking_code='TRF-RESCHEDULE-01',
            user=self.user1,
            court=self.court,
            slot=self.slot,
            booking_date=self.target_date,
            start_time=self.slot.start_time,
            end_time=self.slot.end_time,
            base_price=Decimal('1000.00'),
            total_amount=Decimal('1000.00'),
            status=BookingStatus.CONFIRMED
        )
        self.slot.status = SlotStatus.BOOKED
        self.slot.save()

        # Target new slot
        new_slot = Slot.objects.create(
            court=self.court,
            date=self.target_date,
            start_time=time(21, 0),
            end_time=time(22, 0),
            status=SlotStatus.AVAILABLE
        )

        r = client.post(f'/api/bookings/{booking.id}/reschedule/', {'new_slot_id': new_slot.id})
        self.assertEqual(r.status_code, 200)

        # Verify old slot released
        self.slot.refresh_from_db()
        self.assertEqual(self.slot.status, SlotStatus.AVAILABLE)

        # Verify new slot reserved
        new_slot.refresh_from_db()
        self.assertEqual(new_slot.status, SlotStatus.BOOKED)

        # Verify booking updated
        booking.refresh_from_db()
        self.assertEqual(booking.slot, new_slot)

    def test_split_team_booking_creation_and_settlement(self):
        """
        Tests team split payments:
        1. Organizer initiates split booking with 2 shares of 500 each.
        2. Organizer pays their share immediately from wallet.
        3. Teammate pays their share via split-pay endpoint.
        4. Booking automatically transitions from PENDING to CONFIRMED.
        """
        client1 = APIClient()
        client1.force_authenticate(user=self.user1)

        # Organizer wallet = 2000
        response = client1.post('/api/bookings/', {
            'slot_id': self.slot.id,
            'is_split_payment': True,
            'payment_method': 'WALLET',
            'players': [
                {'name': 'Player One (Organizer)', 'email': self.user1.email, 'share_amount': '500.00', 'is_organizer': True},
                {'name': 'Player Two (Teammate)', 'email': self.user2.email, 'share_amount': '500.00'}
            ]
        }, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['status'], BookingStatus.PENDING)
        booking_id = response.data['id']

        # Verify organizer wallet deducted by 500
        self.user1.refresh_from_db()
        self.assertEqual(self.user1.wallet_balance, Decimal('1500.00'))

        # Teammate pays their share
        client2 = APIClient()
        client2.force_authenticate(user=self.user2)

        pay_resp = client2.post('/api/bookings/split-pay/', {
            'booking_id': booking_id,
            'email': self.user2.email,
            'payment_method': 'WALLET'
        })
        self.assertEqual(pay_resp.status_code, 200)
        self.assertEqual(pay_resp.data['booking_status'], BookingStatus.CONFIRMED)

        # Verify booking is now CONFIRMED and has QR pass token
        booking = Booking.objects.get(id=booking_id)
        self.assertEqual(booking.status, BookingStatus.CONFIRMED)
        self.assertIsNotNone(booking.qr_code_token)
        self.assertTrue(booking.qr_code_token.startswith('QR-PASS-'))

    def test_qr_code_generation_and_staff_checkin(self):
        """
        Tests signed digital QR pass generation and front-desk staff check-in.
        Guarantees duplicate scan prevention.
        """
        # Create a confirmed booking
        booking = Booking.objects.create(
            booking_code='TRF-QR-TEST-01',
            user=self.user1,
            court=self.court,
            slot=self.slot,
            booking_date=self.target_date,
            start_time=self.slot.start_time,
            end_time=self.slot.end_time,
            base_price=Decimal('1000.00'),
            total_amount=Decimal('1000.00'),
            status=BookingStatus.CONFIRMED,
            qr_code_token='QR-PASS-TRF-QR-TEST-01-SECURETOKEN'
        )

        client = APIClient()
        client.force_authenticate(user=self.user1)

        # 1. Download/view QR Code image
        qr_resp = client.get(f'/api/bookings/{booking.id}/qr-code/')
        self.assertEqual(qr_resp.status_code, 200)
        self.assertEqual(qr_resp['Content-Type'], 'image/png')
        self.assertGreater(len(qr_resp.content), 100)

        # 2. Staff scans QR pass at venue
        staff_client = APIClient()
        staff_client.force_authenticate(user=self.admin)

        scan_resp = staff_client.post('/api/bookings/verify-qr/', {
            'token': 'QR-PASS-TRF-QR-TEST-01-SECURETOKEN'
        })
        self.assertEqual(scan_resp.status_code, 200)
        self.assertEqual(scan_resp.data['status'], BookingStatus.CHECKED_IN)

        booking.refresh_from_db()
        self.assertEqual(booking.status, BookingStatus.CHECKED_IN)
        self.assertIsNotNone(booking.qr_checked_in_at)
        self.assertEqual(booking.checked_in_by, self.admin)

        # 3. Duplicate scan attempt rejected
        dup_resp = staff_client.post('/api/bookings/verify-qr/', {
            'token': 'QR-PASS-TRF-QR-TEST-01-SECURETOKEN'
        })
        self.assertEqual(dup_resp.status_code, 400)
        self.assertIn("Duplicate scan", dup_resp.data['message'])

    def test_waitlist_priority_ordering_and_auto_promotion(self):
        """
        Tests priority queue ordering (Platinum > Gold > Regular)
        and automatic promotion to OFFERED when a slot is cancelled.
        """
        # Slot is booked
        self.slot.status = SlotStatus.BOOKED
        self.slot.save()

        # Create Platinum user
        plat_user = User.objects.create_user(
            username='plat_user',
            email='plat@trooferz.demo',
            password='TestPassword@123',
            role='MEMBER'
        )
        plat_plan = MembershipPlan.objects.create(
            tier=MembershipTier.PLATINUM,
            name='Platinum VIP',
            price=Decimal('3999.00'),
            duration_days=90,
            discount_percent=Decimal('30.00'),
            free_booking_credits=5
        )
        Membership.objects.create(
            user=plat_user,
            plan=plat_plan,
            start_date=timezone.localdate(),
            end_date=timezone.localdate() + timedelta(days=90),
            credits_left=5,
            status=SubscriptionStatus.ACTIVE
        )

        # Regular user joins waitlist (priority 0)
        client_reg = APIClient()
        client_reg.force_authenticate(user=self.user1)
        r1 = client_reg.post('/api/waitlist/join/', {'slot_id': self.slot.id})
        self.assertEqual(r1.status_code, 201)
        self.assertEqual(r1.data['priority_score'], 0)

        # Platinum user joins waitlist (priority 30 -> jumps to #1)
        client_plat = APIClient()
        client_plat.force_authenticate(user=plat_user)
        r2 = client_plat.post('/api/waitlist/join/', {'slot_id': self.slot.id})
        self.assertEqual(r2.status_code, 201)
        self.assertEqual(r2.data['priority_score'], 30)
        self.assertEqual(r2.data['position'], 1)

        # Create active booking for slot and cancel it
        booking = Booking.objects.create(
            booking_code='TRF-CANCEL-WTL',
            user=self.user2,
            court=self.court,
            slot=self.slot,
            booking_date=self.target_date,
            start_time=self.slot.start_time,
            end_time=self.slot.end_time,
            base_price=Decimal('1000.00'),
            total_amount=Decimal('1000.00'),
            status=BookingStatus.CONFIRMED
        )

        client_cancel = APIClient()
        client_cancel.force_authenticate(user=self.user2)
        cancel_resp = client_cancel.post(f'/api/bookings/{booking.id}/cancel/')
        self.assertEqual(cancel_resp.status_code, 200)

        # Check Platinum user was auto-promoted to OFFERED
        plat_entry = Waitlist.objects.get(user=plat_user, court=self.court, date=self.target_date)
        self.assertEqual(plat_entry.status, WaitlistStatus.OFFERED)
        self.assertIsNotNone(plat_entry.offer_expires_at)

        # Platinum user claims the offer
        claim_resp = client_plat.post(f'/api/waitlist/{plat_entry.id}/claim/')
        self.assertEqual(claim_resp.status_code, 200)
        plat_entry.refresh_from_db()
        self.assertEqual(plat_entry.status, WaitlistStatus.ACCEPTED)

    def test_process_booking_queues_command(self):
        """
        Tests management command auto-cancelling expired split bookings
        and refunding paid player shares to wallet.
        """
        # Create an expired split booking
        past_expiry = timezone.now() - timedelta(minutes=15)
        expired_booking = Booking.objects.create(
            booking_code='TRF-EXP-SPLIT',
            user=self.user1,
            court=self.court,
            slot=self.slot,
            booking_date=self.target_date,
            start_time=self.slot.start_time,
            end_time=self.slot.end_time,
            base_price=Decimal('1000.00'),
            total_amount=Decimal('1000.00'),
            status=BookingStatus.PENDING,
            is_split_payment=True,
            split_expiry=past_expiry
        )
        self.slot.status = SlotStatus.BOOKED
        self.slot.save()

        # Player 1 paid 500, Player 2 did not pay
        BookingPlayer.objects.create(
            booking=expired_booking,
            user=self.user1,
            name='Player One',
            email=self.user1.email,
            share_amount=Decimal('500.00'),
            payment_status=PlayerPaymentStatus.PAID
        )
        BookingPlayer.objects.create(
            booking=expired_booking,
            user=self.user2,
            name='Player Two',
            email=self.user2.email,
            share_amount=Decimal('500.00'),
            payment_status=PlayerPaymentStatus.PENDING
        )

        initial_balance = self.user1.wallet_balance

        # Run queue processor
        call_command('process_booking_queues')

        # Booking must be CANCELLED and slot freed
        expired_booking.refresh_from_db()
        self.assertEqual(expired_booking.status, BookingStatus.CANCELLED)
        self.slot.refresh_from_db()
        self.assertEqual(self.slot.status, SlotStatus.AVAILABLE)

        # Player 1 wallet refunded 500
        self.user1.refresh_from_db()
        self.assertEqual(self.user1.wallet_balance, initial_balance + Decimal('500.00'))

