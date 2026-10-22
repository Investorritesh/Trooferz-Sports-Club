import hmac
import hashlib
from decimal import Decimal
from datetime import time, timedelta
from django.test import TransactionTestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.conf import settings
from rest_framework.test import APIClient

from payments.models import Payment, PaymentMethod, PaymentStatus, WalletTransaction, WalletTransactionType, WalletCategory
from facilities.models import Sport, Facility, Court, CourtType
from bookings.models import Slot, Booking, SlotStatus, BookingStatus

User = get_user_model()


class PaymentAndWalletTests(TransactionTestCase):
    """
    Unit tests for Trooferz Financial Services:
    1. Wallet top-up (direct demo).
    2. Wallet transaction audit ledger.
    3. Razorpay order generation & HMAC-SHA256 signature verification.
    4. Anti-tampering rejection for forged payment signatures.
    5. Booking payment via Wallet with atomic debit.
    6. Insufficient wallet balance rejection.
    """

    def setUp(self):
        self.client = APIClient()
        self.member = User.objects.create_user(
            username='wallet_user',
            email='wallet_user@trooferz.demo',
            password='TestPassword@123',
            role='MEMBER',
            wallet_balance=Decimal('500.00')
        )
        self.client.force_authenticate(user=self.member)

        # Setup sport, facility, and court
        self.sport = Sport.objects.create(name='Cricket Arena', slug='cricket-arena')
        self.facility = Facility.objects.create(name='Trooferz Baner', city='Pune', area='Baner')
        self.court = Court.objects.create(
            facility=self.facility,
            sport=self.sport,
            name='Turf Pitch 1',
            court_type=CourtType.OUTDOOR,
            hourly_base_price=Decimal('1000.00'),
            is_active=True
        )

        self.test_date = timezone.localdate() + timedelta(days=2)
        self.slot = Slot.objects.create(
            court=self.court,
            date=self.test_date,
            start_time=time(10, 0),
            end_time=time(11, 0),
            status=SlotStatus.AVAILABLE
        )

    def test_wallet_top_up_direct(self):
        """Tests crediting money to the club wallet."""
        response = self.client.post('/api/payments/wallet/top-up/', {
            'amount': '1500.00',
            'payment_method': 'DIRECT'
        })
        self.assertEqual(response.status_code, 200)
        self.member.refresh_from_db()
        self.assertEqual(self.member.wallet_balance, Decimal('2000.00'))

        # Verify audit ledger
        tx = WalletTransaction.objects.filter(user=self.member, category=WalletCategory.TOP_UP).first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.amount, Decimal('1500.00'))
        self.assertEqual(tx.transaction_type, WalletTransactionType.CREDIT)

    def test_wallet_detail_and_ledger(self):
        """Tests fetching wallet balance and transaction ledger."""
        # Add a transaction
        self.client.post('/api/payments/wallet/top-up/', {'amount': '300.00'})
        response = self.client.get('/api/payments/wallet/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['wallet_balance'], 800.0)
        self.assertGreaterEqual(len(response.data['transactions']), 1)

    def test_razorpay_order_creation(self):
        """Tests creating a Razorpay order in test mode."""
        response = self.client.post('/api/payments/razorpay/create-order/', {
            'amount': '1000.00',
            'purpose': 'BOOKING'
        })
        self.assertEqual(response.status_code, 201)
        self.assertIn('razorpay', response.data)
        self.assertIn('order_id', response.data['razorpay'])
        self.assertEqual(response.data['razorpay']['amount'], 100000)  # In paise

    def test_razorpay_signature_verification_success(self):
        """Tests cryptographic HMAC-SHA256 signature verification."""
        key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', 'mock_secret_key')
        order_id = "order_test_999888"
        payment_id = "pay_test_123456"

        # Generate genuine HMAC signature
        msg = f"{order_id}|{payment_id}".encode('utf-8')
        generated_signature = hmac.new(key_secret.encode('utf-8'), msg, hashlib.sha256).hexdigest()

        # Seed payment record
        Payment.objects.create(
            payment_reference="PAY-RZP-TEST1",
            user=self.member,
            amount=Decimal('1000.00'),
            gateway_order_id=order_id,
            status=PaymentStatus.INITIATED
        )

        response = self.client.post('/api/payments/razorpay/verify/', {
            'razorpay_order_id': order_id,
            'razorpay_payment_id': payment_id,
            'razorpay_signature': generated_signature
        })
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['verified'])

        # Verify DB status updated
        pay = Payment.objects.get(gateway_order_id=order_id)
        self.assertEqual(pay.status, PaymentStatus.SUCCESS)

    def test_razorpay_signature_tampering_rejected(self):
        """Guarantees tampered/spoofed signatures are strictly rejected."""
        response = self.client.post('/api/payments/razorpay/verify/', {
            'razorpay_order_id': "order_fake_123",
            'razorpay_payment_id': "pay_fake_456",
            'razorpay_signature': "invalid_forged_signature_hash"
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid cryptographic signature", response.data['message'])

    def test_booking_with_wallet_payment(self):
        """Member with sufficient balance books court slot with WALLET."""
        # Member starts with 500, top up 1000 -> 1500 total
        self.member.wallet_balance = Decimal('1500.00')
        self.member.save()

        response = self.client.post('/api/bookings/', {
            'slot_id': self.slot.id,
            'payment_method': 'WALLET'
        })
        self.assertEqual(response.status_code, 201)

        # Check wallet deducted
        self.member.refresh_from_db()
        self.assertEqual(self.member.wallet_balance, Decimal('500.00'))

        # Check Payment record
        pay = Payment.objects.filter(booking__booking_code=response.data['booking_code']).first()
        self.assertIsNotNone(pay)
        self.assertEqual(pay.status, PaymentStatus.SUCCESS)
        self.assertEqual(pay.payment_method, PaymentMethod.WALLET)

        # Check WalletTransaction
        tx = WalletTransaction.objects.filter(user=self.member, category=WalletCategory.BOOKING_PAYMENT).first()
        self.assertIsNotNone(tx)
        self.assertEqual(tx.amount, Decimal('1000.00'))

    def test_booking_with_insufficient_wallet_balance_rejected(self):
        """Member with insufficient balance is rejected with HTTP 400."""
        self.member.wallet_balance = Decimal('200.00')  # Requires 1000
        self.member.save()

        response = self.client.post('/api/bookings/', {
            'slot_id': self.slot.id,
            'payment_method': 'WALLET'
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn("Insufficient wallet balance", response.data['message'])

        # Slot must remain available
        self.slot.refresh_from_db()
        self.assertEqual(self.slot.status, SlotStatus.AVAILABLE)

    def test_booking_with_instant_upi_success(self):
        """Tests that court booking via UPI completes and records PaymentMethod.UPI."""
        response = self.client.post('/api/bookings/', {
            'slot_id': self.slot.id,
            'payment_method': 'UPI',
            'upi_id': 'member@okaxis'
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['status'], BookingStatus.CONFIRMED)

        # Verify Payment model recorded UPI
        payment = Payment.objects.filter(booking__booking_code=response.data['booking_code']).first()
        self.assertIsNotNone(payment)
        self.assertEqual(payment.payment_method, PaymentMethod.UPI)
        self.assertEqual(payment.status, PaymentStatus.SUCCESS)
        self.assertIn('member@okaxis', payment.gateway_payment_id)

    def test_wallet_topup_via_upi_success(self):
        """Tests topping up digital wallet via instant UPI."""
        initial_balance = self.member.wallet_balance
        response = self.client.post('/api/payments/wallet/topup/', {
            'amount': 750,
            'payment_method': 'UPI',
            'upi_id': 'member@phonepe'
        })
        self.assertEqual(response.status_code, 200)

        self.member.refresh_from_db()
        self.assertEqual(self.member.wallet_balance, initial_balance + Decimal('750.00'))

        # Check transactions endpoint
        tx_resp = self.client.get('/api/payments/wallet/transactions/')
        self.assertEqual(tx_resp.status_code, 200)
        self.assertTrue(len(tx_resp.data) > 0)
        self.assertIn('UPI', tx_resp.data[0]['description'])

