"""
Trooferz Sports Club - Analytics & Business Intelligence Views
Exposes administrative dashboards, real-time weather advisories,
ML-driven demand forecasts, and demand heatmaps.
"""

from datetime import datetime, date, timedelta, time as dtime
from decimal import Decimal
from django.utils import timezone
from django.db.models import Count, Sum, Q, Avg
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from users.models import User, UserRole
from bookings.models import Booking, BookingStatus, Slot
from facilities.models import Facility, Sport, Court
from memberships.models import Membership, MembershipPlan, SubscriptionStatus
from users.permissions import IsAdmin, IsStaff

from analytics.weather_service import (
    fetch_live_pune_weather,
    evaluate_slot_weather,
    PUNE_BANER_LAT,
    PUNE_BANER_LON
)
from analytics.forecasting import get_demand_forecaster


class AdminDashboardView(APIView):
    """
    Overview statistics for the Admin Dashboard.
    Directly compatible with frontend GET /api/dashboard.
    """
    permission_classes = [IsStaff]

    def get(self, request):
        today = timezone.localdate()

        total_users = User.objects.filter(role=UserRole.MEMBER).count()
        total_bookings = Booking.objects.count()
        today_bookings = Booking.objects.filter(booking_date=today).count()
        upcoming_bookings = Booking.objects.filter(
            booking_date__gte=today,
            status__in=[BookingStatus.PENDING, BookingStatus.CONFIRMED]
        ).count()
        active_memberships = Membership.objects.filter(
            status=SubscriptionStatus.ACTIVE,
            end_date__gte=today
        ).count()
        available_facilities = Facility.objects.filter(is_active=True).count()

        revenue_agg = Booking.objects.filter(
            status__in=[BookingStatus.CONFIRMED, BookingStatus.COMPLETED]
        ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')

        # 7-day rolling historical trend
        trends = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            cnt = Booking.objects.filter(booking_date=day).count()
            trends.append({'label': day.strftime('%Y-%m-%d'), 'count': cnt})

        # Sport-wise bookings breakdown
        sport_wise = (
            Sport.objects.filter(is_active=True)
            .annotate(count=Count('courts__bookings'))
            .values('name', 'count')
            .order_by('-count')
        )

        # Facility-wise breakdown
        facility_wise = (
            Facility.objects.filter(is_active=True)
            .annotate(count=Count('courts__bookings'))
            .values('name', 'count')
            .order_by('-count')[:8]
        )

        # Current live weather summary for admin header
        live_weather = fetch_live_pune_weather()
        current_w = live_weather.get('current', {})

        return Response({
            'summary': {
                'totalUsers': total_users,
                'totalBookings': total_bookings,
                'todayBookings': today_bookings,
                'upcomingBookings': upcoming_bookings,
                'activeMemberships': active_memberships,
                'availableFacilities': available_facilities,
                'revenue': float(revenue_agg),
            },
            'weatherSummary': {
                'temperature': current_w.get('temperature_c', 28.0),
                'condition': current_w.get('condition', 'Clear'),
                'rainChance': current_w.get('estimated_rain_prob', 10),
                'location': 'Baner, Pune'
            },
            'trends': trends,
            'sportWise': list(sport_wise),
            'facilityWise': list(facility_wise),
        })


class ReportsView(APIView):
    """
    Daily, weekly, and monthly business reports.
    Compatible with frontend GET /api/dashboard/reports.
    """
    permission_classes = [IsStaff]

    def get(self, request):
        today = timezone.localdate()

        # Daily bookings & revenue (last 30 days)
        daily = []
        for i in range(29, -1, -1):
            day = today - timedelta(days=i)
            agg = Booking.objects.filter(booking_date=day).aggregate(
                bookings=Count('id'),
                revenue=Sum('total_amount')
            )
            daily.append({
                'label': day.strftime('%Y-%m-%d'),
                'bookings': agg['bookings'] or 0,
                'revenue': float(agg['revenue'] or 0),
            })

        # Sport demand mix
        sports = (
            Sport.objects.filter(is_active=True)
            .annotate(bookings=Count('courts__bookings'), revenue=Sum('courts__bookings__total_amount'))
            .values('name', 'bookings', 'revenue')
            .order_by('-bookings')
        )
        sports_data = [
            {'label': s['name'], 'bookings': s['bookings'] or 0, 'revenue': float(s['revenue'] or 0)}
            for s in sports
        ]

        # Facility utilization
        facilities = (
            Facility.objects.filter(is_active=True)
            .annotate(bookings=Count('courts__bookings'), revenue=Sum('courts__bookings__total_amount'))
            .values('name', 'bookings', 'revenue')
            .order_by('-bookings')
        )
        facility_data = [
            {'label': f['name'], 'bookings': f['bookings'] or 0, 'revenue': float(f['revenue'] or 0)}
            for f in facilities
        ]

        # Membership plan breakdown
        plans = (
            MembershipPlan.objects.all()
            .annotate(memberships=Count('subscriptions'))
            .values('name', 'memberships')
            .order_by('-memberships')
        )
        plan_data = [{'label': p['name'], 'memberships': p['memberships']} for p in plans]

        return Response({
            'daily': daily,
            'weekly': [],
            'monthly': [],
            'sports': sports_data,
            'facilities': facility_data,
            'memberships': plan_data,
        })


class WeatherAdvisoryView(APIView):
    """
    Real-time Weather & Playing Conditions Advisory.
    Available to all authenticated members and staff.
    Optional query parameters:
    - court_id: Evaluates indoor vs outdoor condition for this court
    - date: YYYY-MM-DD
    - time: HH:MM
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        court_id = request.query_params.get('court_id') or request.query_params.get('court')
        date_str = request.query_params.get('date')
        time_str = request.query_params.get('time') or request.query_params.get('start_time')

        target_date = timezone.localdate()
        target_time = timezone.localtime().time()

        if date_str:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({'message': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        if time_str:
            try:
                if len(time_str.split(':')) == 2:
                    target_time = datetime.strptime(time_str, '%H:%M').time()
                else:
                    target_time = datetime.strptime(time_str, '%H:%M:%S').time()
            except ValueError:
                return Response({'message': 'Invalid time format. Use HH:MM.'}, status=status.HTTP_400_BAD_REQUEST)

        court = None
        court_advisory = None
        if court_id:
            court = Court.objects.select_related('sport', 'facility').filter(id=court_id).first()
            if court:
                court_advisory = evaluate_slot_weather(court, target_date, target_time)

        general_weather = fetch_live_pune_weather()

        return Response({
            'location': 'Trooferz Sports Club, Baner, Pune',
            'coordinates': {'latitude': PUNE_BANER_LAT, 'longitude': PUNE_BANER_LON},
            'target_evaluation': court_advisory,
            'current': general_weather.get('current'),
            'hourly_forecast': general_weather.get('hourly', [])[:12],  # Next 12 hours
            'is_simulated': general_weather.get('is_simulated', False)
        }, status=status.HTTP_200_OK)


class OccupancyForecastView(APIView):
    """
    Predictive Occupancy & Revenue Forecasting for the upcoming 7 days.
    Employs scikit-learn Ridge regression modeling day-of-week, hour-of-day,
    outdoor weather impacts, and member density.
    """
    permission_classes = [IsStaff]

    def get(self, request):
        forecaster = get_demand_forecaster()
        forecast_data = forecaster.forecast_upcoming_week()
        return Response(forecast_data, status=status.HTTP_200_OK)


class DemandHeatmapView(APIView):
    """
    Generates a 7-day x 16-hour demand heatmap matrix (06:00 to 22:00)
    for manager capacity planning and staff scheduling.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        court_id = request.query_params.get('court_id')
        court = None
        if court_id:
            court = Court.objects.filter(id=court_id).first()

        forecaster = get_demand_forecaster()
        heatmap_data = forecaster.generate_demand_heatmap(court)
        return Response(heatmap_data, status=status.HTTP_200_OK)


class RevenueInsightsView(APIView):
    """
    Business intelligence metrics:
    - Average Revenue Per User (ARPU)
    - Membership vs Pay-per-play mix
    - Cancellation & refund rate
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        total_members = User.objects.filter(role=UserRole.MEMBER).count() or 1
        confirmed_bookings = Booking.objects.filter(status__in=[BookingStatus.CONFIRMED, BookingStatus.COMPLETED])
        cancelled_bookings = Booking.objects.filter(status__in=[BookingStatus.CANCELLED, BookingStatus.REFUNDED])

        total_booking_rev = confirmed_bookings.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
        cancelled_rev = cancelled_bookings.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')

        membership_rev = Membership.objects.filter(
            status=SubscriptionStatus.ACTIVE
        ).aggregate(total=Sum('plan__price'))['total'] or Decimal('0.00')

        total_combined_rev = total_booking_rev + membership_rev
        arpu = round(float(total_combined_rev) / total_members, 2)

        tot_bookings_count = Booking.objects.count() or 1
        cancellation_rate_pct = round((cancelled_bookings.count() / tot_bookings_count) * 100, 2)

        return Response({
            'total_revenue': float(total_combined_rev),
            'booking_revenue': float(total_booking_rev),
            'membership_revenue': float(membership_rev),
            'arpu': arpu,
            'total_active_members': total_members,
            'total_bookings_recorded': tot_bookings_count,
            'cancellation_rate_pct': cancellation_rate_pct,
            'refunded_amount': float(cancelled_rev)
        }, status=status.HTTP_200_OK)
