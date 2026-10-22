from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SlotViewSet, BookingViewSet, SlotAvailabilityView, CalculatePriceView, WaitlistViewSet

router = DefaultRouter()
router.register(r'slots', SlotViewSet, basename='slot')
router.register(r'bookings', BookingViewSet, basename='booking')
router.register(r'waitlist', WaitlistViewSet, basename='waitlist')

urlpatterns = [
    path('slots/availability/', SlotAvailabilityView.as_view(), name='slot-availability'),
    path('slots/availability', SlotAvailabilityView.as_view(), name='slot-availability-noslash'),
    path('bookings/calculate-price/', CalculatePriceView.as_view(), name='booking-calculate-price'),
    path('bookings/calculate-price', CalculatePriceView.as_view(), name='booking-calculate-price-noslash'),
    path('', include(router.urls)),
]
