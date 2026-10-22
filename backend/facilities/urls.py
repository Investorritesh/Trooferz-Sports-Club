from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SportViewSet, 
    FacilityViewSet, 
    CourtViewSet, 
    OfferViewSet, 
    AnnouncementViewSet, 
    PublicContentView
)

router = DefaultRouter()
router.register(r'sports', SportViewSet, basename='sport')
router.register(r'facilities', FacilityViewSet, basename='facility')
router.register(r'courts', CourtViewSet, basename='court')
router.register(r'content/offers', OfferViewSet, basename='content-offer')
router.register(r'offers', OfferViewSet, basename='offer')
router.register(r'content/announcements', AnnouncementViewSet, basename='content-announcement')
router.register(r'announcements', AnnouncementViewSet, basename='announcement')

urlpatterns = [
    path('content/public/', PublicContentView.as_view(), name='content-public'),
    path('content/public', PublicContentView.as_view(), name='content-public-noslash'),
    path('', include(router.urls)),
]
