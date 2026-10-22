import uuid
from decimal import Decimal
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action

from .models import MembershipPlan, Membership, SubscriptionStatus
from .serializers import MembershipPlanSerializer, MembershipSerializer
from payments.models import (
    Payment, PaymentMethod, PaymentStatus,
    WalletTransaction, WalletTransactionType, WalletCategory
)
from payments.razorpay_service import create_razorpay_order
from users.models import Notification, NotificationType
from users.permissions import IsAdmin, IsStaff, IsMember


class PlanViewSet(viewsets.ModelViewSet):
    """
    CRUD for tiered membership packages (Silver, Gold, Platinum).
    """
    queryset = MembershipPlan.objects.all().order_by('price')
    serializer_class = MembershipPlanSerializer

    def get_queryset(self):
        # Non-admins only see active plans
        if not self.request.user.is_authenticated or self.request.user.role not in ['ADMIN', 'STAFF']:
            return MembershipPlan.objects.filter(is_active=True).order_by('price')
        return super().get_queryset()

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsStaff()]


class MembershipViewSet(viewsets.ModelViewSet):
    """
    Membership lifecycle management:
    - Lists active and historical subscriptions
    - Subscribe via Wallet, Razorpay, or Direct
    - Freeze and Unfreeze with automatic expiry extension
    """
    serializer_class = MembershipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['ADMIN', 'STAFF'] or user.is_superuser:
            return Membership.objects.select_related('user', 'plan').all().order_by('-end_date')
        return Membership.objects.select_related('user', 'plan').filter(user=user).order_by('-end_date')

    @action(detail=False, methods=['get'])
    def mine(self, request):
        """Returns all subscriptions for the authenticated member."""
        qs = Membership.objects.filter(user=request.user).order_by('-end_date')
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=['post'])
    def subscribe(self, request):
        """Delegates to the subscription creation logic."""
        return SubscribeMembershipView().post(request)

    @action(detail=True, methods=['post'])
    def freeze(self, request, pk=None):
        """
        Pauses an active membership (e.g. for injury or travel).
        Disables discounts and pauses the expiry countdown.
        """
        membership = self.get_object()

        if membership.user != request.user and request.user.role not in ['ADMIN', 'STAFF'] and not request.user.is_superuser:
            return Response({'message': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        if membership.is_frozen or membership.status == SubscriptionStatus.FROZEN:
            return Response({'message': 'This membership is already frozen.'}, status=status.HTTP_400_BAD_REQUEST)

        if membership.status != SubscriptionStatus.ACTIVE:
            return Response({'message': f'Cannot freeze a membership with status {membership.status}. Only ACTIVE memberships can be frozen.'}, status=status.HTTP_400_BAD_REQUEST)

        membership.is_frozen = True
        membership.status = SubscriptionStatus.FROZEN
        membership.frozen_at = timezone.now()
        membership.save(update_fields=['is_frozen', 'status', 'frozen_at'])

        Notification.objects.create(
            user=membership.user,
            title="Membership Frozen",
            message=f"Your {membership.plan.name} membership has been paused. Days will be added to your expiry upon unfreezing.",
            notification_type=NotificationType.MEMBERSHIP
        )

        return Response({
            'message': 'Membership successfully frozen.',
            'membership': self.get_serializer(membership).data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def unfreeze(self, request, pk=None):
        """
        Resumes a paused membership.
        Automatically extends the end_date by the number of days frozen.
        """
        membership = self.get_object()

        if membership.user != request.user and request.user.role not in ['ADMIN', 'STAFF'] and not request.user.is_superuser:
            return Response({'message': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        if not membership.is_frozen:
            return Response({'message': 'This membership is not currently frozen.'}, status=status.HTTP_400_BAD_REQUEST)

        # Calculate paused duration
        frozen_at = membership.frozen_at or timezone.now()
        paused_duration = timezone.now() - frozen_at
        paused_days = max(1, paused_duration.days)

        membership.end_date += timedelta(days=paused_days)
        membership.is_frozen = False
        membership.status = SubscriptionStatus.ACTIVE
        membership.frozen_at = None
        membership.save(update_fields=['end_date', 'is_frozen', 'status', 'frozen_at'])

        Notification.objects.create(
            user=membership.user,
            title="Membership Resumed",
            message=f"Your {membership.plan.name} membership has been resumed. New expiry date: {membership.end_date} (+{paused_days} days added).",
            notification_type=NotificationType.MEMBERSHIP
        )

        return Response({
            'message': f"Membership resumed successfully. Expiry extended by {paused_days} day(s) to {membership.end_date}.",
            'membership': self.get_serializer(membership).data
        }, status=status.HTTP_200_OK)


class MyMembershipsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        memberships = Membership.objects.filter(user=request.user).order_by('-end_date')
        return Response(MembershipSerializer(memberships, many=True).data)


class AdminMembershipsView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        memberships = Membership.objects.select_related('user', 'plan').all().order_by('-end_date')
        return Response(MembershipSerializer(memberships, many=True).data)


class AdminPlansView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        plans = MembershipPlan.objects.all().order_by('price')
        return Response(MembershipPlanSerializer(plans, many=True).data)


class FreezeActiveMembershipView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        membership_id = request.data.get('membership_id') or request.data.get('id')
        if membership_id:
            membership = Membership.objects.filter(id=membership_id).first()
        else:
            membership = Membership.objects.filter(user=request.user, status=SubscriptionStatus.ACTIVE).first()

        if not membership:
            return Response({'message': 'Active membership not found.'}, status=status.HTTP_404_NOT_FOUND)

        if membership.user != request.user and request.user.role not in ['ADMIN', 'STAFF'] and not request.user.is_superuser:
            return Response({'message': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        if membership.is_frozen or membership.status == SubscriptionStatus.FROZEN:
            return Response({'message': 'This membership is already frozen.'}, status=status.HTTP_400_BAD_REQUEST)

        membership.is_frozen = True
        membership.status = SubscriptionStatus.FROZEN
        membership.frozen_at = timezone.now()
        membership.save(update_fields=['is_frozen', 'status', 'frozen_at'])

        Notification.objects.create(
            user=membership.user,
            title="Membership Frozen",
            message=f"Your {membership.plan.name} membership has been paused. Expiry date is paused.",
            notification_type=NotificationType.MEMBERSHIP
        )

        return Response({
            'message': 'Membership successfully frozen.',
            'membership': MembershipSerializer(membership).data
        }, status=status.HTTP_200_OK)


class UnfreezeActiveMembershipView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        membership_id = request.data.get('membership_id') or request.data.get('id')
        if membership_id:
            membership = Membership.objects.filter(id=membership_id).first()
        else:
            membership = Membership.objects.filter(user=request.user, is_frozen=True).first()

        if not membership:
            return Response({'message': 'Frozen membership not found.'}, status=status.HTTP_404_NOT_FOUND)

        if membership.user != request.user and request.user.role not in ['ADMIN', 'STAFF'] and not request.user.is_superuser:
            return Response({'message': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        frozen_at = membership.frozen_at or timezone.now()
        paused_duration = timezone.now() - frozen_at
        paused_days = max(1, paused_duration.days)

        membership.end_date += timedelta(days=paused_days)
        membership.is_frozen = False
        membership.status = SubscriptionStatus.ACTIVE
        membership.frozen_at = None
        membership.save(update_fields=['end_date', 'is_frozen', 'status', 'frozen_at'])

        Notification.objects.create(
            user=membership.user,
            title="Membership Resumed",
            message=f"Your {membership.plan.name} membership has been resumed. New expiry date: {membership.end_date} (+{paused_days} days added).",
            notification_type=NotificationType.MEMBERSHIP
        )

        return Response({
            'message': f"Membership resumed successfully. Expiry extended by {paused_days} day(s) to {membership.end_date}.",
            'membership': MembershipSerializer(membership).data
        }, status=status.HTTP_200_OK)


class SubscribeMembershipView(APIView):
    """
    Subscribes the authenticated user to a membership plan.
    Supports WALLET (atomic balance debit), RAZORPAY (order creation), and DIRECT (demo).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        plan_id = request.data.get('planId') or request.data.get('plan_id')
        payment_method = request.data.get('payment_method', 'DIRECT').upper()

        if not plan_id:
            return Response({'message': 'plan_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            plan = MembershipPlan.objects.get(id=plan_id, is_active=True)
        except MembershipPlan.DoesNotExist:
            return Response({'message': 'Active membership plan not found.'}, status=status.HTTP_404_NOT_FOUND)

        plan_price = plan.price

        # Wallet balance pre-check
        if payment_method == 'WALLET' and request.user.wallet_balance < plan_price:
            return Response({
                'message': f"Insufficient wallet balance (₹{request.user.wallet_balance:.2f}). Required: ₹{plan_price:.2f}. Please top up your wallet."
            }, status=status.HTTP_400_BAD_REQUEST)

        start = timezone.localdate()
        end = start + timedelta(days=plan.duration_days)

        with transaction.atomic():
            # Deactivate any previous active memberships for this user
            Membership.objects.filter(user=request.user, status=SubscriptionStatus.ACTIVE).update(
                status=SubscriptionStatus.EXPIRED
            )

            membership = Membership.objects.create(
                user=request.user,
                plan=plan,
                start_date=start,
                end_date=end,
                credits_left=plan.free_booking_credits,
                status=SubscriptionStatus.ACTIVE
            )

            razorpay_order = None

            if payment_method == 'WALLET':
                user = request.user
                user.wallet_balance -= plan_price
                user.save(update_fields=['wallet_balance'])

                ref = f"PAY-MEM-WLT-{uuid.uuid4().hex[:8].upper()}"
                Payment.objects.create(
                    payment_reference=ref,
                    membership=membership,
                    user=user,
                    amount=plan_price,
                    payment_method=PaymentMethod.WALLET,
                    status=PaymentStatus.SUCCESS
                )

                WalletTransaction.objects.create(
                    user=user,
                    transaction_type=WalletTransactionType.DEBIT,
                    category=WalletCategory.MEMBERSHIP_BONUS,
                    amount=plan_price,
                    balance_after=user.wallet_balance,
                    reference_id=ref,
                    description=f"Subscription to {plan.name} ({plan.tier})"
                )

            elif payment_method in ['UPI', 'GPay', 'PHONEPE', 'PAYTM']:
                ref = f"PAY-MEM-UPI-{uuid.uuid4().hex[:8].upper()}"
                Payment.objects.create(
                    payment_reference=ref,
                    membership=membership,
                    user=request.user,
                    amount=plan_price,
                    payment_method=PaymentMethod.RAZORPAY,
                    status=PaymentStatus.SUCCESS
                )

            elif payment_method in ['CARD', 'DEBIT_CARD', 'CREDIT_CARD']:
                ref = f"PAY-MEM-CRD-{uuid.uuid4().hex[:8].upper()}"
                Payment.objects.create(
                    payment_reference=ref,
                    membership=membership,
                    user=request.user,
                    amount=plan_price,
                    payment_method=PaymentMethod.RAZORPAY,
                    status=PaymentStatus.SUCCESS
                )

            elif payment_method == 'RAZORPAY':
                razorpay_order = create_razorpay_order(
                    plan_price,
                    notes={'purpose': 'MEMBERSHIP', 'plan_name': plan.name, 'user_id': request.user.id}
                )
                ref = f"PAY-MEM-RZP-{uuid.uuid4().hex[:8].upper()}"
                Payment.objects.create(
                    payment_reference=ref,
                    membership=membership,
                    user=request.user,
                    amount=plan_price,
                    payment_method=PaymentMethod.RAZORPAY,
                    gateway_order_id=razorpay_order['order_id'],
                    status=PaymentStatus.INITIATED
                )

            else:
                # Direct / Desk / Cash
                ref = f"PAY-MEM-DIR-{uuid.uuid4().hex[:8].upper()}"
                Payment.objects.create(
                    payment_reference=ref,
                    membership=membership,
                    user=request.user,
                    amount=plan_price,
                    payment_method=PaymentMethod.CASH,
                    status=PaymentStatus.SUCCESS
                )

            Notification.objects.create(
                user=request.user,
                title="Membership Activated",
                message=f"Welcome to Trooferz {plan.name}! You have received {plan.free_booking_credits} free booking credits.",
                notification_type=NotificationType.MEMBERSHIP
            )

        resp_data = {
            'message': f'Subscribed to {plan.name} successfully.',
            'membership': MembershipSerializer(membership).data
        }
        if razorpay_order:
            resp_data['razorpay_order'] = razorpay_order

        return Response(resp_data, status=status.HTTP_201_CREATED)

