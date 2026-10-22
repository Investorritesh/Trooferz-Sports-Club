"""
Unit & Integration Tests for Phase 5: Weather Advisory & ML Demand Forecasting
"""

from datetime import date, time, timedelta
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from users.models import User, UserRole
from facilities.models import Facility, Sport, Court
from bookings.models import Booking, BookingStatus, Slot, SlotStatus
from memberships.models import Membership, MembershipPlan, MembershipTier, SubscriptionStatus

from analytics.weather_service import (
    fetch_live_pune_weather,
    evaluate_slot_weather,
    _simulate_pune_weather
)
from analytics.forecasting import get_demand_forecaster


class WeatherAndAnalyticsTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Users
        self.member = User.objects.create_user(
            username='member_weather',
            email='member.weather@trooferz.com',
            password='TestPassword123!',
            full_name='Vikram Weather',
            phone='9876543290',
            role=UserRole.MEMBER,
            wallet_balance=Decimal('2500.00')
        )
        self.staff = User.objects.create_user(
            username='staff_weather',
            email='staff.weather@trooferz.com',
            password='TestPassword123!',
            full_name='Staff Member',
            phone='9876543291',
            role=UserRole.STAFF
        )
        self.admin = User.objects.create_user(
            username='admin_weather',
            email='admin.weather@trooferz.com',
            password='TestPassword123!',
            full_name='Club Admin',
            phone='9876543292',
            role=UserRole.ADMIN
        )

        # Facilities & Sports
        self.facility = Facility.objects.create(
            name='Trooferz Baner Hub',
            address='Main Road, Baner, Pune',
            city='Pune',
            is_active=True
        )
        self.cricket_sport = Sport.objects.create(
            name='Box Cricket',
            slug='box-cricket',
            is_active=True
        )
        self.badminton_sport = Sport.objects.create(
            name='Badminton',
            slug='badminton',
            is_active=True
        )

        # Outdoor Court vs Indoor Court
        self.outdoor_court = Court.objects.create(
            facility=self.facility,
            sport=self.cricket_sport,
            name='Main Turf - Box Cricket (Outdoor)',
            hourly_base_price=Decimal('1000.00'),
            is_active=True
        )
        self.indoor_court = Court.objects.create(
            facility=self.facility,
            sport=self.badminton_sport,
            name='Badminton Court 1 (Indoor Wooden AC)',
            hourly_base_price=Decimal('500.00'),
            is_active=True
        )

        # Create a sample slot and booking
        self.today = timezone.localdate()
        self.slot = Slot.objects.create(
            court=self.outdoor_court,
            date=self.today,
            start_time=time(18, 0),
            end_time=time(19, 0),
            status=SlotStatus.BOOKED
        )
        self.booking = Booking.objects.create(
            booking_code='TRF-TEST-WTHR-01',
            user=self.member,
            court=self.outdoor_court,
            slot=self.slot,
            booking_date=self.today,
            start_time=time(18, 0),
            end_time=time(19, 0),
            base_price=Decimal('1000.00'),
            dynamic_multiplier=Decimal('1.00'),
            discount_amount=Decimal('0.00'),
            total_amount=Decimal('1000.00'),
            status=BookingStatus.CONFIRMED
        )

    def test_weather_service_pune_data(self):
        """Tests that weather service returns valid Pune coordinates and forecast structure."""
        weather = fetch_live_pune_weather()
        self.assertIn('Baner, Pune', weather['location'])
        self.assertIn('current', weather)
        self.assertIn('temperature_c', weather['current'])
        self.assertTrue(len(weather['hourly']) > 0)

    def test_outdoor_vs_indoor_court_weather_advisory(self):
        """
        Tests that indoor courts are marked Weather-Proof (FAVORABLE),
        while outdoor courts evaluate precipitation risks.
        """
        # Test Indoor court
        indoor_adv = evaluate_slot_weather(self.indoor_court, self.today, time(18, 0))
        self.assertTrue(indoor_adv['is_indoor'])
        self.assertFalse(indoor_adv['is_outdoor'])
        self.assertEqual(indoor_adv['status'], 'FAVORABLE')
        self.assertEqual(indoor_adv['badge_color'], 'green')
        self.assertIn('Weather-Proof', indoor_adv['advisory_title'])

        # Test Outdoor court
        outdoor_adv = evaluate_slot_weather(self.outdoor_court, self.today, time(18, 0))
        self.assertFalse(outdoor_adv['is_indoor'])
        self.assertTrue(outdoor_adv['is_outdoor'])
        self.assertIn(outdoor_adv['status'], ['FAVORABLE', 'CAUTION', 'UNFAVORABLE'])
        self.assertIn(outdoor_adv['badge_color'], ['green', 'amber', 'red'])

    def test_demand_forecaster_predictions(self):
        """Tests ML Ridge regression occupancy predictions and dynamic multiplier bounds."""
        forecaster = get_demand_forecaster()
        pred = forecaster.predict_slot_occupancy(self.outdoor_court, self.today, 19)

        # Verification of bounded outputs
        self.assertGreaterEqual(pred['occupancy_percentage'], 5.0)
        self.assertLessEqual(pred['occupancy_percentage'], 98.0)
        self.assertIn(pred['demand_level'], ['PEAK_SURGE', 'HIGH', 'MODERATE', 'OFF_PEAK'])
        self.assertGreaterEqual(pred['recommended_dynamic_multiplier'], 0.90)
        self.assertLessEqual(pred['recommended_dynamic_multiplier'], 1.30)

    def test_demand_heatmap_matrix_structure(self):
        """Tests 7-day x 16-hour demand heatmap generator."""
        forecaster = get_demand_forecaster()
        heatmap = forecaster.generate_demand_heatmap(self.outdoor_court)

        self.assertEqual(len(heatmap['matrix']), 7)
        for row in heatmap['matrix']:
            self.assertIn('day', row)
            self.assertIn('slots', row)
            self.assertEqual(len(row['slots']), 17)  # 06:00 to 22:00

    def test_7_day_forward_occupancy_forecast(self):
        """Tests 7-day forward-looking booking & revenue forecast."""
        forecaster = get_demand_forecaster()
        fc = forecaster.forecast_upcoming_week()

        self.assertEqual(len(fc['daily_forecast']), 7)
        self.assertGreater(fc['total_projected_revenue'], 0)
        self.assertGreater(fc['total_projected_bookings'], 0)
        self.assertGreaterEqual(fc['average_occupancy_pct'], 10.0)

    def test_public_weather_advisory_endpoint(self):
        """Tests GET /api/analytics/weather-advisory/ returns 200 OK without requiring authentication."""
        url = f"/api/analytics/weather-advisory/?court_id={self.outdoor_court.id}&date={self.today}&time=18:00"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('target_evaluation', response.data)
        self.assertEqual(response.data['target_evaluation']['court_id'], self.outdoor_court.id)
        self.assertIn('hourly_forecast', response.data)

    def test_occupancy_forecast_endpoint_permissions(self):
        """Tests GET /api/analytics/occupancy-forecast/ requires Staff/Admin role."""
        url = "/api/analytics/occupancy-forecast/"

        # Unauthenticated: 401
        res_unauth = self.client.get(url)
        self.assertEqual(res_unauth.status_code, status.HTTP_401_UNAUTHORIZED)

        # Member: 403 Forbidden
        self.client.force_authenticate(user=self.member)
        res_member = self.client.get(url)
        self.assertEqual(res_member.status_code, status.HTTP_403_FORBIDDEN)

        # Staff: 200 OK
        self.client.force_authenticate(user=self.staff)
        res_staff = self.client.get(url)
        self.assertEqual(res_staff.status_code, status.HTTP_200_OK)
        self.assertIn('daily_forecast', res_staff.data)
        self.assertEqual(len(res_staff.data['daily_forecast']), 7)

    def test_demand_heatmap_endpoint(self):
        """Tests GET /api/analytics/heatmap/ returns complete 7-day matrix."""
        url = f"/api/analytics/heatmap/?court_id={self.indoor_court.id}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('matrix', response.data)
        self.assertEqual(len(response.data['matrix']), 7)

    def test_revenue_insights_admin_endpoint(self):
        """Tests GET /api/analytics/revenue-insights/ provides ARPU and cancellation stats."""
        url = "/api/analytics/revenue-insights/"

        # Staff cannot access Admin-only revenue insights
        self.client.force_authenticate(user=self.staff)
        res_staff = self.client.get(url)
        self.assertEqual(res_staff.status_code, status.HTTP_403_FORBIDDEN)

        # Admin can access
        self.client.force_authenticate(user=self.admin)
        res_admin = self.client.get(url)
        self.assertEqual(res_admin.status_code, status.HTTP_200_OK)
        self.assertIn('arpu', res_admin.data)
        self.assertIn('total_revenue', res_admin.data)
        self.assertIn('cancellation_rate_pct', res_admin.data)

    def test_booking_price_calculation_includes_weather_advisory(self):
        """Tests that /api/bookings/calculate-price/ enriches pricing response with live weather advisory."""
        self.client.force_authenticate(user=self.member)
        payload = {
            'court_id': self.outdoor_court.id,
            'date': self.today.strftime('%Y-%m-%d'),
            'start_time': '18:00'
        }
        response = self.client.post('/api/bookings/calculate-price/', payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('weather_advisory', response.data)
        self.assertIsNotNone(response.data['weather_advisory'])
        self.assertEqual(response.data['weather_advisory']['court_id'], self.outdoor_court.id)
        self.assertIn('status', response.data['weather_advisory'])
