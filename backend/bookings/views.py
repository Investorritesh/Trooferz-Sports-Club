import uuid
import io
import qrcode
from decimal import Decimal
from datetime import datetime, timedelta
from django.db import transaction, models, IntegrityError, OperationalError
from django.utils import timezone
from django.http import HttpResponse
from django.core.exceptions import ValidationError
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action

from .models import Slot, Booking, BookingPlayer, Waitlist, SlotStatus, BookingStatus, PlayerPaymentStatus, WaitlistStatus
from .serializers import SlotSerializer, BookingSerializer, BookingPlayerSerializer, WaitlistSerializer
from .lifecycle import validate_status_transition, execute_booking_cancellation, calculate_cancellation_refund
from .slots_service import get_or_create_court_slots, calculate_dynamic_slot_price
from .pricing_engine import calculate_booking_price
from facilities.models import Court, Facility
from payments.models import (
    Payment, PaymentMethod, PaymentStatus,
    WalletTransaction, WalletTransactionType, WalletCategory
)
from payments.razorpay_service import create_razorpay_order
from memberships.models import Membership, SubscriptionStatus, MembershipTier
from users.models import Notification, NotificationType
from users.permissions import IsAdmin, IsStaff, IsMember, IsOwnerOrAdmin


class SlotAvailabilityView(APIView):
    """
    Live slot availability query for a court and date.
    Calculates dynamic pricing and automatically provisions operational hours.
    Directly compatible with React frontend slot picker.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        date_str = request.query_params.get('date')
        court_id = request.query_params.get('courtId') or request.query_params.get('court_id')
        facility_id = request.query_params.get('facilityId') or request.query_params.get('facility_id')

        # Fallback to today if no date specified
        if not date_str:
            target_date = timezone.localdate()
        else:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({'message': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        # Resolve court: either by explicit court_id or default court for facility
        court = None
        if court_id:
            try:
                court = Court.objects.select_related('facility', 'sport').get(id=court_id, is_active=True)
            except Court.DoesNotExist:
                return Response({'message': 'Court not found.'}, status=status.HTTP_404_NOT_FOUND)
        elif facility_id:
            court = Court.objects.select_related('facility', 'sport').filter(facility_id=facility_id, is_active=True).first()

        if court:
            slots_data = get_or_create_court_slots(court, target_date)
            return Response(slots_data)

        # If neither court nor facility given, return all active slots for the date
        qs = Slot.objects.filter(date=target_date)
        return Response(SlotSerializer(qs, many=True).data)


class SlotViewSet(viewsets.ModelViewSet):
    queryset = Slot.objects.select_related('court', 'court__facility', 'court__sport').all().order_by('date', 'start_time')
    serializer_class = SlotSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsStaff()]

    def list(self, request, *args, **kwargs):
        court_id = request.query_params.get('courtId') or request.query_params.get('court_id')
        facility_id = request.query_params.get('facilityId') or request.query_params.get('facility_id')
        sport_id = request.query_params.get('sportId') or request.query_params.get('sport_id')
        date_str = request.query_params.get('date')

        if court_id or facility_id or sport_id or date_str:
            target_date = timezone.localdate()
            if date_str:
                try:
                    target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                except ValueError:
                    return Response({'message': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

            court = None
            if court_id:
                court = Court.objects.select_related('facility', 'sport').filter(id=court_id, is_active=True).first()
            elif facility_id and sport_id:
                court = Court.objects.select_related('facility', 'sport').filter(facility_id=facility_id, sport_id=sport_id, is_active=True).first()
            elif sport_id:
                court = Court.objects.select_related('facility', 'sport').filter(sport_id=sport_id, is_active=True).first()
            elif facility_id:
                court = Court.objects.select_related('facility', 'sport').filter(facility_id=facility_id, is_active=True).first()

            if court:
                slots_data = get_or_create_court_slots(court, target_date)
                return Response(slots_data)

            if date_str:
                qs = Slot.objects.select_related('court', 'court__facility', 'court__sport').filter(date=target_date)
                return Response(SlotSerializer(qs, many=True).data)

        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=['post'], permission_classes=[IsStaff])
    def block(self, request):
        """
        Locks a slot for tournaments or maintenance on a specific date.
        """
        slot_id = request.data.get('time_slot_id') or request.data.get('slot_id')
        reason = request.data.get('reason', 'Maintenance')

        try:
            slot = Slot.objects.get(id=slot_id)
        except Slot.DoesNotExist:
            return Response({'message': 'Slot not found.'}, status=status.HTTP_404_NOT_FOUND)

        if slot.status == SlotStatus.BOOKED:
            return Response({'message': 'Cannot block a slot that has an active booking.'}, status=status.HTTP_409_CONFLICT)

        slot.status = SlotStatus.BLOCKED
        slot.save()
        return Response({'message': f'Slot blocked for {reason}.', 'status': slot.status})


class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Booking.objects.none()

        qs = Booking.objects.select_related('court', 'court__sport', 'court__facility', 'user', 'slot').all()

        if user.role not in ['ADMIN', 'STAFF'] and not user.is_superuser:
            qs = qs.filter(user=user)
        else:
            # Query filters for admin/staff view
            user_id = self.request.query_params.get('userId')
            date = self.request.query_params.get('date')
            sport_id = self.request.query_params.get('sportId')
            facility_id = self.request.query_params.get('facilityId')
            booking_status = self.request.query_params.get('status')
            search = self.request.query_params.get('search', '').strip()

            if user_id:
                qs = qs.filter(user_id=user_id)
            if date:
                qs = qs.filter(booking_date=date)
            if sport_id:
                qs = qs.filter(court__sport_id=sport_id)
            if facility_id:
                qs = qs.filter(court__facility_id=facility_id)
            if booking_status:
                qs = qs.filter(status=booking_status)
            if search:
                qs = qs.filter(
                    models.Q(booking_code__icontains=search) |
                    models.Q(user__full_name__icontains=search) |
                    models.Q(user__email__icontains=search)
                )

        return qs.order_by('-booking_date', '-start_time')

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        """
        Creates a new court booking with ACID concurrency protection:
        1. Uses transaction.atomic() with select_for_update() row locking.
        2. Strictly verifies that slot.status == 'AVAILABLE'.
        3. Returns HTTP 409 Conflict if already taken.
        4. Calculates dynamic price, membership discounts, and free credits.
        5. Supports WALLET, RAZORPAY, DIRECT, and TEAM SPLIT payment methods.
        """
        slot_id = request.data.get('slot_id') or request.data.get('time_slot_id')
        payment_method = request.data.get('payment_method', 'DIRECT').upper()
        use_credit = request.data.get('use_credit') in (True, 'true', 'True', '1', 1)
        is_split_payment = request.data.get('is_split_payment') in (True, 'true', 'True', '1', 1)
        players_data = request.data.get('players', [])

        if not slot_id:
            return Response({'message': 'slot_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                # Acquire exclusive row lock on the selected slot
                try:
                    slot = Slot.objects.select_for_update().select_related('court').get(id=slot_id)
                except Slot.DoesNotExist:
                    return Response({'message': 'The requested time slot does not exist.'}, status=status.HTTP_404_NOT_FOUND)

                # Strict double-booking check
                if slot.status != SlotStatus.AVAILABLE:
                    return Response(
                        {'message': 'This slot has already been reserved by another customer. Please choose another time.'},
                        status=status.HTTP_409_CONFLICT
                    )

                court = slot.court
                target_date = slot.date

                # Calculate price inside transaction
                pricing = calculate_booking_price(court, target_date, slot.start_time, user=request.user, use_credit=use_credit)
                multiplier = Decimal(str(pricing['dynamic_multiplier']))
                discount_amount = Decimal(str(pricing['discount_amount']))
                final_price = Decimal(str(pricing['final_price']))
                credits_used = pricing['credits_used']

                # Generate unique booking reference code
                unique_suffix = uuid.uuid4().hex[:6].upper()
                booking_code = f"TRF-{target_date.strftime('%Y%m%d')}-{unique_suffix}"

                # 1. Team Split Payment Booking Flow
                if is_split_payment:
                    if not players_data:
                        return Response({'message': 'players array is required when is_split_payment is true.'}, status=status.HTTP_400_BAD_REQUEST)

                    try:
                        total_shares = sum(Decimal(str(p.get('share_amount', 0))) for p in players_data)
                    except Exception:
                        return Response({'message': 'Invalid share_amount in players list.'}, status=status.HTTP_400_BAD_REQUEST)

                    if abs(total_shares - final_price) > Decimal('0.05'):
                        return Response({
                            'message': f"Total player shares (₹{total_shares}) must equal the booking price (₹{final_price})."
                        }, status=status.HTTP_400_BAD_REQUEST)

                    split_expiry = timezone.now() + timedelta(hours=2)

                    booking = Booking.objects.create(
                        booking_code=booking_code,
                        user=request.user,
                        court=court,
                        slot=slot,
                        booking_date=target_date,
                        start_time=slot.start_time,
                        end_time=slot.end_time,
                        base_price=court.hourly_base_price,
                        dynamic_multiplier=multiplier,
                        discount_amount=discount_amount,
                        credits_used=credits_used,
                        total_amount=final_price,
                        status=BookingStatus.PENDING,
                        is_split_payment=True,
                        split_expiry=split_expiry
                    )

                    # Reserve slot while teammates settle shares
                    slot.status = SlotStatus.BOOKED
                    slot.save(update_fields=['status'])

                    for p_info in players_data:
                        p_name = p_info.get('name', 'Teammate')
                        p_email = p_info.get('email', '')
                        p_phone = p_info.get('phone', '')
                        p_share = Decimal(str(p_info.get('share_amount', 0)))
                        is_organizer = p_info.get('is_organizer', False) or (p_email and p_email.lower() == request.user.email.lower())

                        p_status = PlayerPaymentStatus.PENDING
                        p_paid_at = None
                        p_user = request.user if is_organizer else None

                        if is_organizer and payment_method == 'WALLET':
                            if request.user.wallet_balance < p_share:
                                return Response({
                                    'message': f"Insufficient wallet balance for organizer share (₹{request.user.wallet_balance:.2f}). Required: ₹{p_share:.2f}."
                                }, status=status.HTTP_400_BAD_REQUEST)
                            request.user.wallet_balance -= p_share
                            request.user.save(update_fields=['wallet_balance'])
                            p_status = PlayerPaymentStatus.PAID
                            p_paid_at = timezone.now()

                            ref = f"PAY-SPLIT-WLT-{uuid.uuid4().hex[:8].upper()}"
                            Payment.objects.create(
                                payment_reference=ref,
                                booking=booking,
                                user=request.user,
                                amount=p_share,
                                payment_method=PaymentMethod.WALLET,
                                status=PaymentStatus.SUCCESS
                            )
                            WalletTransaction.objects.create(
                                user=request.user,
                                transaction_type=WalletTransactionType.DEBIT,
                                category=WalletCategory.BOOKING_PAYMENT,
                                amount=p_share,
                                balance_after=request.user.wallet_balance,
                                reference_id=booking_code,
                                description=f"Organizer share for split booking {booking_code} ({court.name})"
                            )
                        elif is_organizer and payment_method == 'UPI':
                            p_status = PlayerPaymentStatus.PAID
                            p_paid_at = timezone.now()
                            upi_id = request.data.get('upi_id', '')
                            ref = f"PAY-SPLIT-UPI-{uuid.uuid4().hex[:8].upper()}"
                            Payment.objects.create(
                                payment_reference=ref,
                                booking=booking,
                                user=request.user,
                                amount=p_share,
                                payment_method=PaymentMethod.UPI,
                                gateway_payment_id=upi_id or f"UPI-{uuid.uuid4().hex[:8].upper()}@oktrooferz",
                                status=PaymentStatus.SUCCESS
                            )
                        elif is_organizer and payment_method in ['DIRECT', 'CASH']:
                            p_status = PlayerPaymentStatus.PAID
                            p_paid_at = timezone.now()
                            ref = f"PAY-SPLIT-DIR-{uuid.uuid4().hex[:8].upper()}"
                            Payment.objects.create(
                                payment_reference=ref,
                                booking=booking,
                                user=request.user,
                                amount=p_share,
                                payment_method=PaymentMethod.CASH,
                                status=PaymentStatus.SUCCESS
                            )

                        BookingPlayer.objects.create(
                            booking=booking,
                            user=p_user,
                            name=p_name,
                            email=p_email,
                            phone=p_phone,
                            share_amount=p_share,
                            payment_status=p_status,
                            paid_at=p_paid_at
                        )

                    # Check if all players already paid (e.g. single payer or pre-paid)
                    if all(p.payment_status == PlayerPaymentStatus.PAID for p in booking.players.all()):
                        booking.status = BookingStatus.CONFIRMED
                        booking.qr_code_token = f"QR-PASS-{booking_code}-{uuid.uuid4().hex[:8]}"
                        booking.save(update_fields=['status', 'qr_code_token'])

                    Notification.objects.create(
                        user=request.user,
                        title="Split Booking Initiated",
                        message=f"Split booking {booking_code} created. Teammates have 2 hours to settle their shares.",
                        notification_type=NotificationType.BOOKING
                    )

                    response_data = self.get_serializer(booking).data
                    response_data['pricing_breakdown'] = pricing
                    return Response(response_data, status=status.HTTP_201_CREATED)

                # 2. Standard Single-Payer Booking Flow
                # Check and debit wallet atomically inside transaction
                if payment_method == 'WALLET' and final_price > Decimal('0.00'):
                    user = request.user
                    if user.wallet_balance < final_price:
                        return Response({
                            'message': f"Insufficient wallet balance (₹{user.wallet_balance:.2f}). Required: ₹{final_price:.2f}. Please top up your wallet or choose another payment method."
                        }, status=status.HTTP_400_BAD_REQUEST)
                    user.wallet_balance -= final_price
                    user.save(update_fields=['wallet_balance'])

                # Deduct membership credit if applicable
                if credits_used > 0 and pricing['membership_id']:
                    mem = Membership.objects.select_for_update().filter(id=pricing['membership_id'], credits_left__gt=0).first()
                    if mem:
                        mem.credits_left -= 1
                        mem.save(update_fields=['credits_left'])

                # Digital QR pass token
                qr_token = f"QR-PASS-{booking_code}-{uuid.uuid4().hex[:8]}"

                booking = Booking.objects.create(
                    booking_code=booking_code,
                    user=request.user,
                    court=court,
                    slot=slot,
                    booking_date=target_date,
                    start_time=slot.start_time,
                    end_time=slot.end_time,
                    base_price=court.hourly_base_price,
                    dynamic_multiplier=multiplier,
                    discount_amount=discount_amount,
                    credits_used=credits_used,
                    total_amount=final_price,
                    status=BookingStatus.CONFIRMED,
                    qr_code_token=qr_token
                )

                # Mark slot as booked atomically
                slot.status = SlotStatus.BOOKED
                slot.save(update_fields=['status'])

                # Record Payment & Wallet transactions
                razorpay_order = None
                if payment_method == 'WALLET' and final_price > Decimal('0.00'):
                    ref = f"PAY-WLT-{uuid.uuid4().hex[:8].upper()}"
                    Payment.objects.create(
                        payment_reference=ref,
                        booking=booking,
                        user=request.user,
                        amount=final_price,
                        payment_method=PaymentMethod.WALLET,
                        status=PaymentStatus.SUCCESS
                    )
                    WalletTransaction.objects.create(
                        user=request.user,
                        transaction_type=WalletTransactionType.DEBIT,
                        category=WalletCategory.BOOKING_PAYMENT,
                        amount=final_price,
                        balance_after=request.user.wallet_balance,
                        reference_id=booking_code,
                        description=f"Court booking for {court.name} on {target_date} ({booking_code})"
                    )
                elif payment_method == 'RAZORPAY' and final_price > Decimal('0.00'):
                    razorpay_order = create_razorpay_order(
                        final_price,
                        notes={'booking_code': booking_code, 'user_id': request.user.id}
                    )
                    ref = f"PAY-RZP-{uuid.uuid4().hex[:8].upper()}"
                    Payment.objects.create(
                        payment_reference=ref,
                        booking=booking,
                        user=request.user,
                        amount=final_price,
                        payment_method=PaymentMethod.RAZORPAY,
                        gateway_order_id=razorpay_order['order_id'],
                        status=PaymentStatus.INITIATED
                    )
                elif payment_method == 'UPI' and final_price > Decimal('0.00'):
                    upi_id = request.data.get('upi_id', '')
                    ref = f"PAY-UPI-{uuid.uuid4().hex[:8].upper()}"
                    Payment.objects.create(
                        payment_reference=ref,
                        booking=booking,
                        user=request.user,
                        amount=final_price,
                        payment_method=PaymentMethod.UPI,
                        gateway_payment_id=upi_id or f"UPI-{uuid.uuid4().hex[:8].upper()}@oktrooferz",
                        status=PaymentStatus.SUCCESS
                    )
                else:
                    # Direct demo / cash / 100% free credit
                    ref = f"PAY-DIR-{uuid.uuid4().hex[:8].upper()}"
                    Payment.objects.create(
                        payment_reference=ref,
                        booking=booking,
                        user=request.user,
                        amount=final_price,
                        payment_method=PaymentMethod.WALLET if final_price == Decimal('0.00') else PaymentMethod.CASH,
                        status=PaymentStatus.SUCCESS
                    )

                # Send in-app confirmation notification
                Notification.objects.create(
                    user=request.user,
                    title="Booking Confirmed",
                    message=f"Your booking {booking_code} for {court.name} on {target_date} is confirmed.",
                    notification_type=NotificationType.BOOKING
                )

                response_data = self.get_serializer(booking).data
                response_data['pricing_breakdown'] = pricing
                if razorpay_order:
                    response_data['razorpay_order'] = razorpay_order

                return Response(response_data, status=status.HTTP_201_CREATED)

        except (IntegrityError, OperationalError):
            # Under intense concurrency or database lock contention, safely reject duplicate
            return Response(
                {'message': 'This slot has already been reserved by another customer. Please choose another time.'},
                status=status.HTTP_409_CONFLICT
            )

    @action(detail=True, methods=['post', 'delete'])
    def cancel(self, request, pk=None):
        """
        Cancels a booking according to the cancellation policy:
        >24h: 100% refund, 24h-6h: 50% refund, <6h: 0% refund.
        Credits refund to user wallet and frees up the slot.
        """
        booking = self.get_object()

        # Check permissions: owner or club admin/staff
        if booking.user != request.user and request.user.role not in ['ADMIN', 'STAFF'] and not request.user.is_superuser:
            return Response({'message': 'You do not have permission to cancel this booking.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            result = execute_booking_cancellation(booking, request.user, reason=request.data.get('reason', ''))
            return Response(result, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def reschedule(self, request, pk=None):
        """
        Reschedules an active confirmed booking to a new available slot without penalty.
        Atomically releases the old slot and reserves the new slot.
        """
        booking = self.get_object()

        # Permissions: owner or staff/admin
        if booking.user != request.user and request.user.role not in ['ADMIN', 'STAFF'] and not request.user.is_superuser:
            return Response({'message': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        if booking.status != BookingStatus.CONFIRMED:
            return Response({'message': f'Cannot reschedule a booking in status {booking.status}. Only CONFIRMED bookings can be rescheduled.'}, status=status.HTTP_400_BAD_REQUEST)

        new_slot_id = request.data.get('new_slot_id')
        if not new_slot_id:
            return Response({'message': 'new_slot_id is required for rescheduling.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            try:
                new_slot = Slot.objects.select_for_update().get(id=new_slot_id)
            except Slot.DoesNotExist:
                return Response({'message': 'New slot not found.'}, status=status.HTTP_404_NOT_FOUND)

            if new_slot.status != SlotStatus.AVAILABLE:
                return Response({'message': 'The newly requested slot is not available.'}, status=status.HTTP_409_CONFLICT)

            # Release old slot
            old_slot = booking.slot
            old_slot.status = SlotStatus.AVAILABLE
            old_slot.save(update_fields=['status'])

            # Reserve new slot
            new_slot.status = SlotStatus.BOOKED
            new_slot.save(update_fields=['status'])

            # Update booking
            booking.slot = new_slot
            booking.court = new_slot.court
            booking.booking_date = new_slot.date
            booking.start_time = new_slot.start_time
            booking.end_time = new_slot.end_time
            booking.save()

            Notification.objects.create(
                user=booking.user,
                title="Booking Rescheduled",
                message=f"Booking {booking.booking_code} rescheduled to {new_slot.court.name} on {new_slot.date} at {new_slot.start_time.strftime('%H:%M')}.",
                notification_type=NotificationType.BOOKING
            )

            return Response({
                'message': 'Booking rescheduled successfully.',
                'booking': self.get_serializer(booking).data
            }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch', 'put'], permission_classes=[IsStaff])
    def update_status(self, request, pk=None):
        """
        Enforces strict booking lifecycle state transitions.
        """
        booking = self.get_object()
        new_status = request.data.get('status')

        if not new_status:
            return Response({'message': 'status field is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_status_transition(booking.status, new_status)
            booking.status = new_status
            booking.save(update_fields=['status', 'updated_at'])
            return Response({'message': f"Booking status updated to {new_status}.", 'status': new_status})
        except ValidationError as e:
            return Response({'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        booking = self.get_object()
        new_status = request.data.get('status')
        if new_status and len(request.data) == 1:
            try:
                validate_status_transition(booking.status, new_status)
                booking.status = new_status
                booking.save(update_fields=['status', 'updated_at'])
                return Response(self.get_serializer(booking).data)
            except ValidationError as e:
                return Response({'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        booking = self.get_object()
        new_status = request.data.get('status')
        if new_status:
            try:
                validate_status_transition(booking.status, new_status)
                booking.status = new_status
                booking.save(update_fields=['status', 'updated_at'])
                return Response(self.get_serializer(booking).data)
            except ValidationError as e:
                return Response({'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def my_bookings(self, request):
        """Returns all bookings for the currently authenticated member."""
        bookings = Booking.objects.filter(user=request.user).order_by('-booking_date', '-start_time')
        return Response(self.get_serializer(bookings, many=True).data)

    @action(detail=False, methods=['post'], url_path='calculate-price')
    def calculate_price_action(self, request):
        """Calculates dynamic price and discounts for a selected slot."""
        return CalculatePriceView().post(request)

    @action(detail=False, methods=['post'], url_path='split-pay')
    def split_pay(self, request):
        """
        Allows an individual teammate to settle their share of a group split booking.
        When all shares reach PAID, automatically confirms booking and generates digital QR pass.
        """
        booking_id = request.data.get('booking_id')
        booking_code = request.data.get('booking_code')
        player_id = request.data.get('player_id')
        player_email = request.data.get('email')
        payment_method = request.data.get('payment_method', 'WALLET').upper()

        booking = None
        if booking_id:
            booking = Booking.objects.filter(id=booking_id).first()
        elif booking_code:
            booking = Booking.objects.filter(booking_code=booking_code).first()

        if not booking:
            return Response({'message': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not booking.is_split_payment:
            return Response({'message': 'This booking is not configured for split payments.'}, status=status.HTTP_400_BAD_REQUEST)

        if booking.status != BookingStatus.PENDING:
            return Response({'message': f"Cannot pay share for booking in status '{booking.status}'."}, status=status.HTTP_400_BAD_REQUEST)

        if booking.split_expiry and booking.split_expiry < timezone.now():
            return Response({'message': 'This split booking has expired. The court slot has been released.'}, status=status.HTTP_400_BAD_REQUEST)

        # Locate player
        player = None
        if player_id:
            player = booking.players.filter(id=player_id).first()
        elif player_email:
            player = booking.players.filter(email__iexact=player_email).first()

        if not player:
            return Response({'message': 'Player not found in this split booking.'}, status=status.HTTP_404_NOT_FOUND)

        if player.payment_status == PlayerPaymentStatus.PAID:
            return Response({'message': 'This player share has already been paid.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            share_amount = player.share_amount

            if payment_method == 'WALLET':
                user = request.user
                if user.wallet_balance < share_amount:
                    return Response({
                        'message': f"Insufficient wallet balance (₹{user.wallet_balance:.2f}). Required: ₹{share_amount:.2f}. Please top up your wallet."
                    }, status=status.HTTP_400_BAD_REQUEST)
                user.wallet_balance -= share_amount
                user.save(update_fields=['wallet_balance'])

                ref = f"PAY-SPLIT-WLT-{uuid.uuid4().hex[:8].upper()}"
                Payment.objects.create(
                    payment_reference=ref,
                    booking=booking,
                    user=request.user,
                    amount=share_amount,
                    payment_method=PaymentMethod.WALLET,
                    status=PaymentStatus.SUCCESS
                )
                WalletTransaction.objects.create(
                    user=request.user,
                    transaction_type=WalletTransactionType.DEBIT,
                    category=WalletCategory.BOOKING_PAYMENT,
                    amount=share_amount,
                    balance_after=user.wallet_balance,
                    reference_id=booking.booking_code,
                    description=f"Share payment for {booking.booking_code} ({booking.court.name})"
                )
            elif payment_method == 'UPI':
                upi_id = request.data.get('upi_id', '')
                ref = f"PAY-SPLIT-UPI-{uuid.uuid4().hex[:8].upper()}"
                Payment.objects.create(
                    payment_reference=ref,
                    booking=booking,
                    user=request.user,
                    amount=share_amount,
                    payment_method=PaymentMethod.UPI,
                    gateway_payment_id=upi_id or f"UPI-{uuid.uuid4().hex[:8].upper()}@oktrooferz",
                    status=PaymentStatus.SUCCESS
                )
            else:
                ref = f"PAY-SPLIT-DIR-{uuid.uuid4().hex[:8].upper()}"
                Payment.objects.create(
                    payment_reference=ref,
                    booking=booking,
                    user=request.user,
                    amount=share_amount,
                    payment_method=PaymentMethod.CASH,
                    status=PaymentStatus.SUCCESS
                )

            player.user = request.user
            player.payment_status = PlayerPaymentStatus.PAID
            player.paid_at = timezone.now()
            player.save(update_fields=['user', 'payment_status', 'paid_at'])

            # Check if all players have paid
            remaining_unpaid = booking.players.filter(payment_status=PlayerPaymentStatus.PENDING).count()
            all_settled = (remaining_unpaid == 0)

            if all_settled:
                booking.status = BookingStatus.CONFIRMED
                booking.qr_code_token = f"QR-PASS-{booking.booking_code}-{uuid.uuid4().hex[:8]}"
                booking.save(update_fields=['status', 'qr_code_token', 'updated_at'])

                Notification.objects.create(
                    user=booking.user,
                    title="Split Booking Confirmed",
                    message=f"All teammate shares for {booking.booking_code} have been settled! Booking is confirmed.",
                    notification_type=NotificationType.BOOKING
                )

            return Response({
                'message': 'Share payment successful.' + (' All teammates have paid! Booking is CONFIRMED.' if all_settled else f' Waiting for {remaining_unpaid} more teammate(s).'),
                'payment_status': 'PAID',
                'booking_status': booking.status,
                'remaining_unpaid': remaining_unpaid,
                'qr_code_token': booking.qr_code_token if all_settled else None
            }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='qr-code')
    def qr_code(self, request, pk=None):
        """
        Dynamically renders a signed digital QR pass in PNG format.
        """
        booking = self.get_object()

        if booking.user != request.user and request.user.role not in ['ADMIN', 'STAFF'] and not request.user.is_superuser:
            return Response({'message': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        if not booking.qr_code_token:
            if booking.status == BookingStatus.CONFIRMED:
                booking.qr_code_token = f"QR-PASS-{booking.booking_code}-{uuid.uuid4().hex[:8]}"
                booking.save(update_fields=['qr_code_token'])
            else:
                return Response({'message': f'QR Pass is only available for CONFIRMED bookings. Current status: {booking.status}.'}, status=status.HTTP_400_BAD_REQUEST)

        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=4,
        )
        qr.add_data(booking.qr_code_token)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)

        return HttpResponse(buf.getvalue(), content_type='image/png')

    @action(detail=False, methods=['post'], url_path='verify-qr', permission_classes=[IsStaff])
    def verify_qr(self, request):
        """
        Front-Desk Staff Check-In Scanner endpoint:
        Validates token authenticity, checks date, and executes atomic check-in.
        Prevents duplicate check-ins.
        """
        token = request.data.get('token') or request.data.get('qr_code_token')
        if not token:
            return Response({'message': 'token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        booking = Booking.objects.select_related('court', 'court__facility', 'court__sport', 'user').filter(qr_code_token=token).first()
        if not booking:
            return Response({'message': 'Invalid QR pass. No matching booking found.'}, status=status.HTTP_404_NOT_FOUND)

        if booking.status == BookingStatus.CHECKED_IN:
            checked_by = booking.checked_in_by.email if booking.checked_in_by else 'Staff'
            checked_time = booking.qr_checked_in_at.strftime('%H:%M') if booking.qr_checked_in_at else ''
            return Response({
                'message': f"Duplicate scan! Pass has already been used at {checked_time} by {checked_by}."
            }, status=status.HTTP_400_BAD_REQUEST)

        if booking.status != BookingStatus.CONFIRMED:
            return Response({
                'message': f"Cannot check in booking with status '{booking.status}'. Only CONFIRMED bookings can be checked in."
            }, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            booking.status = BookingStatus.CHECKED_IN
            booking.qr_checked_in_at = timezone.now()
            booking.checked_in_by = request.user
            booking.save(update_fields=['status', 'qr_checked_in_at', 'checked_in_by', 'updated_at'])

            Notification.objects.create(
                user=booking.user,
                title="Checked In Successfully",
                message=f"Welcome to Trooferz Baner! Your check-in for {booking.court.name} is verified. Have a great match!",
                notification_type=NotificationType.BOOKING
            )

        return Response({
            'message': f"Check-in verified successfully for {booking.user.full_name or booking.user.email}!",
            'booking_code': booking.booking_code,
            'court_name': booking.court.name,
            'sport': booking.court.sport.name,
            'date': booking.booking_date.strftime('%Y-%m-%d'),
            'time': f"{booking.start_time.strftime('%H:%M')} - {booking.end_time.strftime('%H:%M')}",
            'status': booking.status,
            'checked_in_at': booking.qr_checked_in_at.isoformat(),
            'checked_in_by': request.user.email
        }, status=status.HTTP_200_OK)


class CalculatePriceView(APIView):
    """
    Public / Member endpoint to preview exact booking price breakdown:
    - Base price
    - Dynamic surge multiplier (peak / weekend)
    - Membership tier discount or free booking credits
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        court_id = request.data.get('court_id') or request.data.get('facility_id')
        date_str = request.data.get('date') or request.data.get('booking_date')
        time_str = request.data.get('start_time') or request.data.get('time')
        use_credit = request.data.get('use_credit') in (True, 'true', 'True', '1', 1)

        if not court_id or not date_str or not time_str:
            return Response({'message': 'court_id, date, and start_time are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'message': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if len(time_str.split(':')) == 2:
                target_time = datetime.strptime(time_str, '%H:%M').time()
            else:
                target_time = datetime.strptime(time_str, '%H:%M:%S').time()
        except ValueError:
            return Response({'message': 'Invalid start_time format. Use HH:MM.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            court = Court.objects.get(id=court_id)
        except Court.DoesNotExist:
            return Response({'message': 'Court not found.'}, status=status.HTTP_404_NOT_FOUND)

        calc = calculate_booking_price(court, target_date, target_time, user=request.user, use_credit=use_credit)
        try:
            from analytics.weather_service import evaluate_slot_weather
            calc['weather_advisory'] = evaluate_slot_weather(court, target_date, target_time)
        except Exception:
            calc['weather_advisory'] = None
        return Response(calc, status=status.HTTP_200_OK)


class WaitlistViewSet(viewsets.ModelViewSet):
    """
    Automated Priority Waitlist Queue for fully booked slots.
    Prioritizes Platinum (30) > Gold (20) > Silver (10) > Non-Members (0).
    Auto-promotes when cancellations occur.
    """
    serializer_class = WaitlistSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['ADMIN', 'STAFF'] or user.is_superuser:
            return Waitlist.objects.select_related('court', 'court__sport', 'user').all().order_by('-priority_score', 'created_at')
        return Waitlist.objects.select_related('court', 'court__sport', 'user').filter(user=user).order_by('-created_at')

    @action(detail=False, methods=['get'])
    def mine(self, request):
        """Returns the authenticated user's waitlist entries."""
        qs = self.get_queryset().filter(user=request.user)
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=['post'], url_path='join')
    def join(self, request):
        """
        Enqueues a user into the waitlist for a specific court and slot.
        Calculates priority score based on active membership tier.
        """
        slot_id = request.data.get('slot_id')
        court_id = request.data.get('court_id')
        date_str = request.data.get('date') or request.data.get('booking_date')
        time_str = request.data.get('start_time') or request.data.get('time')

        target_court = None
        target_date = None
        target_time = None

        if slot_id:
            try:
                slot = Slot.objects.select_related('court').get(id=slot_id)
                target_court = slot.court
                target_date = slot.date
                target_time = slot.start_time
            except Slot.DoesNotExist:
                return Response({'message': 'Slot not found.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            if not court_id or not date_str or not time_str:
                return Response({'message': 'court_id, date, and start_time are required.'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                target_court = Court.objects.get(id=court_id)
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                if len(time_str.split(':')) == 2:
                    target_time = datetime.strptime(time_str, '%H:%M').time()
                else:
                    target_time = datetime.strptime(time_str, '%H:%M:%S').time()
            except (Court.DoesNotExist, ValueError) as e:
                return Response({'message': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # Pre-check: if slot is currently available, direct to booking
        avail_slot = Slot.objects.filter(court=target_court, date=target_date, start_time=target_time, status=SlotStatus.AVAILABLE).first()
        if avail_slot:
            return Response({
                'message': 'This slot is currently AVAILABLE for booking! No waitlist needed.',
                'slot_id': avail_slot.id
            }, status=status.HTTP_200_OK)

        # Pre-check: already waiting or offered?
        already_waiting = Waitlist.objects.filter(
            user=request.user,
            court=target_court,
            date=target_date,
            start_time=target_time,
            status__in=[WaitlistStatus.WAITING, WaitlistStatus.OFFERED]
        ).first()

        if already_waiting:
            return Response({
                'message': f"You are already in the waitlist for this slot in status '{already_waiting.status}'.",
                'waitlist': self.get_serializer(already_waiting).data
            }, status=status.HTTP_400_BAD_REQUEST)

        # Compute priority score
        score = 0
        active_mem = Membership.objects.select_related('plan').filter(
            user=request.user,
            status=SubscriptionStatus.ACTIVE,
            is_frozen=False,
            end_date__gte=target_date
        ).first()

        if active_mem:
            if active_mem.plan.tier == MembershipTier.PLATINUM:
                score = 30
            elif active_mem.plan.tier == MembershipTier.GOLD:
                score = 20
            elif active_mem.plan.tier == MembershipTier.SILVER:
                score = 10

        entry = Waitlist.objects.create(
            user=request.user,
            court=target_court,
            date=target_date,
            start_time=target_time,
            priority_score=score,
            status=WaitlistStatus.WAITING
        )

        # Calculate position in queue
        ahead_count = Waitlist.objects.filter(
            court=target_court,
            date=target_date,
            start_time=target_time,
            status=WaitlistStatus.WAITING
        ).filter(
            models.Q(priority_score__gt=score) |
            models.Q(priority_score=score, created_at__lt=entry.created_at)
        ).count()
        position = ahead_count + 1

        Notification.objects.create(
            user=request.user,
            title="Joined Waitlist Queue",
            message=f"You are #{position} in line for {target_court.name} on {target_date} at {target_time.strftime('%H:%M')}.",
            notification_type=NotificationType.BOOKING
        )

        return Response({
            'message': f"Successfully joined waitlist at position #{position}.",
            'waitlist': self.get_serializer(entry).data,
            'position': position,
            'priority_score': score
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='claim')
    def claim(self, request, pk=None):
        """
        Claims an OFFERED waitlist slot within the 15-minute offer window.
        """
        entry = self.get_object()

        if entry.user != request.user and request.user.role not in ['ADMIN', 'STAFF'] and not request.user.is_superuser:
            return Response({'message': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        if entry.status != WaitlistStatus.OFFERED:
            return Response({'message': f"Cannot claim waitlist in status '{entry.status}'. Only OFFERED slots can be claimed."}, status=status.HTTP_400_BAD_REQUEST)

        if entry.offer_expires_at and entry.offer_expires_at < timezone.now():
            entry.status = WaitlistStatus.EXPIRED
            entry.save(update_fields=['status'])
            return Response({'message': 'The 15-minute offer window for this slot has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Get slot
            slot = Slot.objects.select_for_update().filter(court=entry.court, date=entry.date, start_time=entry.start_time).first()
            if not slot or slot.status != SlotStatus.AVAILABLE:
                return Response({'message': 'The slot is no longer available.'}, status=status.HTTP_409_CONFLICT)

            # Reserve slot
            slot.status = SlotStatus.BOOKED
            slot.save(update_fields=['status'])

            # Pricing
            pricing = calculate_booking_price(entry.court, entry.date, entry.start_time, user=request.user)
            final_price = Decimal(str(pricing['final_price']))

            booking_code = f"TRF-{entry.date.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
            qr_token = f"QR-PASS-{booking_code}-{uuid.uuid4().hex[:8]}"

            booking = Booking.objects.create(
                booking_code=booking_code,
                user=request.user,
                court=entry.court,
                slot=slot,
                booking_date=entry.date,
                start_time=entry.start_time,
                end_time=slot.end_time,
                base_price=entry.court.hourly_base_price,
                dynamic_multiplier=Decimal(str(pricing['dynamic_multiplier'])),
                discount_amount=Decimal(str(pricing['discount_amount'])),
                total_amount=final_price,
                status=BookingStatus.CONFIRMED,
                qr_code_token=qr_token
            )

            # Payment
            ref = f"PAY-WTL-{uuid.uuid4().hex[:8].upper()}"
            Payment.objects.create(
                payment_reference=ref,
                booking=booking,
                user=request.user,
                amount=final_price,
                payment_method=PaymentMethod.CASH if final_price > Decimal('0.00') else PaymentMethod.WALLET,
                status=PaymentStatus.SUCCESS
            )

            entry.status = WaitlistStatus.ACCEPTED
            entry.save(update_fields=['status'])

            Notification.objects.create(
                user=request.user,
                title="Waitlist Slot Claimed!",
                message=f"Booking {booking_code} for {entry.court.name} is confirmed.",
                notification_type=NotificationType.BOOKING
            )

            return Response({
                'message': 'Waitlist slot claimed successfully! Booking is confirmed.',
                'booking': BookingSerializer(booking).data
            }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_waitlist(self, request, pk=None):
        """Cancels a waitlist entry."""
        entry = self.get_object()
        if entry.user != request.user and request.user.role not in ['ADMIN', 'STAFF'] and not request.user.is_superuser:
            return Response({'message': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        entry.status = WaitlistStatus.CANCELLED
        entry.save(update_fields=['status'])
        return Response({'message': 'Waitlist entry cancelled.', 'status': entry.status})


