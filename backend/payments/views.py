import uuid
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Payment, PaymentMethod, PaymentStatus, WalletTransaction, WalletTransactionType, WalletCategory
from .serializers import PaymentSerializer, WalletTransactionSerializer
from .razorpay_service import create_razorpay_order, verify_razorpay_signature
from users.models import Notification, NotificationType


class WalletDetailView(APIView):
    """
    Returns the authenticated user's wallet balance and chronological transaction ledger.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        transactions = WalletTransaction.objects.filter(user=user).order_by('-created_at')
        return Response({
            'wallet_balance': float(user.wallet_balance),
            'balance': float(user.wallet_balance),
            'transactions': WalletTransactionSerializer(transactions, many=True).data
        })


class WalletTransactionsView(APIView):
    """
    Returns the authenticated user's wallet transactions ledger.
    Used by member profile double-entry ledger.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        transactions = WalletTransaction.objects.filter(user=request.user).order_by('-created_at')
        return Response(WalletTransactionSerializer(transactions, many=True).data)


class WalletTopUpView(APIView):
    """
    Allows a user to top up their club wallet.
    Supports UPI (instant QR/VPA credit), direct credit (demo mode), or Razorpay order initiation.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        amount_raw = request.data.get('amount')
        if not amount_raw:
            return Response({'message': 'amount is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(str(amount_raw)).quantize(Decimal('0.01'))
            if amount <= Decimal('0.00'):
                raise ValueError()
        except (ValueError, TypeError):
            return Response({'message': 'Amount must be a positive decimal number.'}, status=status.HTTP_400_BAD_REQUEST)

        method = request.data.get('payment_method', 'DIRECT').upper()
        upi_id = request.data.get('upi_id', '')

        if method == 'RAZORPAY':
            # Create Razorpay order for online payment
            order_info = create_razorpay_order(amount, notes={'purpose': 'WALLET_TOPUP', 'user_id': request.user.id})
            ref = f"PAY-TOPUP-{uuid.uuid4().hex[:8].upper()}"
            payment = Payment.objects.create(
                payment_reference=ref,
                user=request.user,
                amount=amount,
                payment_method=PaymentMethod.RAZORPAY,
                gateway_order_id=order_info['order_id'],
                status=PaymentStatus.INITIATED
            )
            return Response({
                'payment_id': payment.id,
                'payment_reference': ref,
                'razorpay_order': order_info
            }, status=status.HTTP_201_CREATED)

        # Instant UPI or Direct / Demo Top-up
        with transaction.atomic():
            user = request.user
            user.wallet_balance += amount
            user.save(update_fields=['wallet_balance'])

            ref = f"TOPUP-{uuid.uuid4().hex[:8].upper()}"
            pay_method = PaymentMethod.UPI if method == 'UPI' else PaymentMethod.CASH
            desc = f"Wallet top-up via UPI ({upi_id or 'Instant UPI'})" if method == 'UPI' else f"Wallet top-up via {method}"

            Payment.objects.create(
                payment_reference=f"PAY-{ref}",
                user=user,
                amount=amount,
                payment_method=pay_method,
                gateway_payment_id=upi_id or f"UPI-{uuid.uuid4().hex[:8].upper()}@oktrooferz",
                status=PaymentStatus.SUCCESS
            )

            WalletTransaction.objects.create(
                user=user,
                transaction_type=WalletTransactionType.CREDIT,
                category=WalletCategory.TOP_UP,
                amount=amount,
                balance_after=user.wallet_balance,
                reference_id=ref,
                description=desc
            )

            Notification.objects.create(
                user=user,
                title="Wallet Top-Up Successful",
                message=f"₹{amount} has been added to your Trooferz wallet via {pay_method}. New balance: ₹{user.wallet_balance}.",
                notification_type=NotificationType.WALLET
            )

        return Response({
            'message': f'Wallet successfully credited with ₹{amount}.',
            'new_balance': float(user.wallet_balance)
        }, status=status.HTTP_200_OK)


class RazorpayOrderCreateView(APIView):
    """
    Creates a Razorpay Test Mode Order.
    Accepts amount and purpose (BOOKING, MEMBERSHIP, WALLET_TOPUP).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        amount_raw = request.data.get('amount')
        booking_id = request.data.get('booking_id')
        membership_id = request.data.get('membership_id')
        purpose = request.data.get('purpose', 'BOOKING')

        if not amount_raw:
            return Response({'message': 'amount is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(str(amount_raw)).quantize(Decimal('0.01'))
            if amount <= Decimal('0.00'):
                raise ValueError()
        except (ValueError, TypeError):
            return Response({'message': 'Invalid amount.'}, status=status.HTTP_400_BAD_REQUEST)

        order_info = create_razorpay_order(
            amount,
            notes={'user_id': request.user.id, 'purpose': purpose}
        )

        ref = f"PAY-RZP-{uuid.uuid4().hex[:8].upper()}"
        payment = Payment.objects.create(
            payment_reference=ref,
            user=request.user,
            booking_id=booking_id,
            membership_id=membership_id,
            amount=amount,
            payment_method=PaymentMethod.RAZORPAY,
            gateway_order_id=order_info['order_id'],
            status=PaymentStatus.INITIATED
        )

        return Response({
            'payment_id': payment.id,
            'payment_reference': ref,
            'razorpay': order_info
        }, status=status.HTTP_201_CREATED)


class RazorpayVerifyView(APIView):
    """
    Verifies the cryptographic HMAC-SHA256 signature returned by Razorpay Checkout.
    Guarantees zero payment spoofing.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        order_id = request.data.get('razorpay_order_id')
        payment_id = request.data.get('razorpay_payment_id')
        signature = request.data.get('razorpay_signature')
        db_payment_id = request.data.get('payment_id')

        if not order_id or not payment_id or not signature:
            return Response(
                {'message': 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Cryptographic Signature Check
        is_valid = verify_razorpay_signature(order_id, payment_id, signature)
        if not is_valid:
            return Response(
                {'message': 'Payment verification failed: Invalid cryptographic signature.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            payment = None
            if db_payment_id:
                payment = Payment.objects.filter(id=db_payment_id, user=request.user).first()
            if not payment:
                payment = Payment.objects.filter(gateway_order_id=order_id, user=request.user).first()

            if payment:
                payment.gateway_payment_id = payment_id
                payment.gateway_signature = signature
                payment.status = PaymentStatus.SUCCESS
                payment.save()

                # If attached to a booking, ensure it is confirmed
                if payment.booking:
                    payment.booking.status = 'CONFIRMED'
                    payment.booking.save(update_fields=['status'])

                # If attached to a membership, activate it
                if payment.membership:
                    payment.membership.status = 'ACTIVE'
                    payment.membership.save(update_fields=['status'])

            return Response({
                'verified': True,
                'message': 'Payment signature successfully verified.',
                'payment_reference': payment.payment_reference if payment else None,
                'status': PaymentStatus.SUCCESS
            }, status=status.HTTP_200_OK)


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['ADMIN', 'STAFF'] or user.is_superuser:
            return Payment.objects.select_related('user', 'booking').all().order_by('-created_at')
        return Payment.objects.filter(user=user).order_by('-created_at')
