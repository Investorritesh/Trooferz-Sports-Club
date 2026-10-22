from decimal import Decimal
from django.db import models
from django.conf import settings


class PaymentMethod(models.TextChoices):
    RAZORPAY = 'RAZORPAY', 'Razorpay (Card/UPI/NetBanking)'
    UPI = 'UPI', 'Instant UPI / QR (Google Pay / PhonePe / Paytm)'
    WALLET = 'WALLET', 'Club Wallet'
    SPLIT = 'SPLIT', 'Split Team Payment'
    CASH = 'CASH', 'Cash at Front Desk'


class PaymentStatus(models.TextChoices):
    INITIATED = 'INITIATED', 'Initiated'
    SUCCESS = 'SUCCESS', 'Success'
    FAILED = 'FAILED', 'Failed'
    REFUNDED = 'REFUNDED', 'Refunded'


class Payment(models.Model):
    """
    Financial payment transaction.
    Records Razorpay order IDs, gateway payment signatures, and status for audit compliance.
    """
    payment_reference = models.CharField(max_length=100, unique=True, db_index=True)
    booking = models.ForeignKey('bookings.Booking', on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    membership = models.ForeignKey('memberships.Membership', on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=30, choices=PaymentMethod.choices, default=PaymentMethod.RAZORPAY)
    gateway_order_id = models.CharField(max_length=100, blank=True)
    gateway_payment_id = models.CharField(max_length=100, blank=True)
    gateway_signature = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.INITIATED, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payments'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.payment_reference} - ₹{self.amount} via {self.payment_method} [{self.status}]"


class WalletTransactionType(models.TextChoices):
    CREDIT = 'CREDIT', 'Credit (+)'
    DEBIT = 'DEBIT', 'Debit (-)'


class WalletCategory(models.TextChoices):
    TOP_UP = 'TOP_UP', 'Top-up Deposit'
    BOOKING_PAYMENT = 'BOOKING_PAYMENT', 'Court Booking Fee'
    CANCELLATION_REFUND = 'CANCELLATION_REFUND', 'Booking Cancellation Refund'
    WEATHER_REFUND = 'WEATHER_REFUND', 'Weather Free Reschedule Refund'
    MEMBERSHIP_BONUS = 'MEMBERSHIP_BONUS', 'Membership Welcome Bonus'


class WalletTransaction(models.Model):
    """
    Audit ledger tracking every change in a user's wallet balance.
    Guarantees transparent financial defense for viva voce.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wallet_transactions')
    transaction_type = models.CharField(max_length=20, choices=WalletTransactionType.choices)
    category = models.CharField(max_length=30, choices=WalletCategory.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    balance_after = models.DecimalField(max_digits=10, decimal_places=2)
    reference_id = models.CharField(max_length=100, blank=True)
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'wallet_transactions'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.transaction_type} ₹{self.amount} ({self.category})"
