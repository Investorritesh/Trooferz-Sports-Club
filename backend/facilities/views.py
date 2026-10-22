from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone

from .models import Sport, Facility, Court, Offer, Announcement
from .serializers import SportSerializer, FacilitySerializer, CourtSerializer, OfferSerializer, AnnouncementSerializer
from users.permissions import IsAdmin, IsStaff
from users.models import User, Notification, NotificationType


class SportViewSet(viewsets.ModelViewSet):
    queryset = Sport.objects.all().order_by('name')
    serializer_class = SportSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsStaff()]

    def destroy(self, request, *args, **kwargs):
        sport = self.get_object()
        sport.is_active = not sport.is_active
        sport.save(update_fields=['is_active'])
        status_text = 'activated' if sport.is_active else 'deactivated'
        return Response({'message': f"Sport successfully {status_text}.", 'is_active': sport.is_active})


class FacilityViewSet(viewsets.ModelViewSet):
    queryset = Facility.objects.all().order_by('name')
    serializer_class = FacilitySerializer

    def get_queryset(self):
        qs = super().get_queryset()
        sport_id = self.request.query_params.get('sportId') or self.request.query_params.get('sport_id')
        if sport_id:
            qs = qs.filter(courts__sport_id=sport_id).distinct()
        return qs

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsStaff()]

    def destroy(self, request, *args, **kwargs):
        facility = self.get_object()
        facility.is_active = not facility.is_active
        facility.save(update_fields=['is_active'])
        status_text = 'activated' if facility.is_active else 'deactivated'
        return Response({'message': f"Facility successfully {status_text}.", 'is_active': facility.is_active})


class CourtViewSet(viewsets.ModelViewSet):
    queryset = Court.objects.all().order_by('name')
    serializer_class = CourtSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        sport_id = self.request.query_params.get('sportId') or self.request.query_params.get('sport_id')
        facility_id = self.request.query_params.get('facilityId') or self.request.query_params.get('facility_id')
        if sport_id:
            qs = qs.filter(sport_id=sport_id)
        if facility_id:
            qs = qs.filter(facility_id=facility_id)
        return qs

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsStaff()]


class OfferViewSet(viewsets.ModelViewSet):
    queryset = Offer.objects.all().order_by('-created_at')
    serializer_class = OfferSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsStaff()]

    def destroy(self, request, *args, **kwargs):
        offer = self.get_object()
        offer.is_active = not offer.is_active
        offer.save(update_fields=['is_active'])
        status_text = 'activated' if offer.is_active else 'deactivated'
        return Response({'message': f"Offer successfully {status_text}.", 'is_active': offer.is_active})


class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.all().order_by('-created_at')
    serializer_class = AnnouncementSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [IsStaff()]

    def perform_create(self, serializer):
        announcement = serializer.save()
        if announcement.is_active:
            active_users = User.objects.filter(is_active=True)
            notifications = [
                Notification(
                    user=u,
                    title=f"Club Notice: {announcement.title}",
                    message=announcement.message,
                    notification_type=NotificationType.SYSTEM
                )
                for u in active_users
            ]
            if notifications:
                Notification.objects.bulk_create(notifications, batch_size=200)

    def destroy(self, request, *args, **kwargs):
        ann = self.get_object()
        ann.is_active = not ann.is_active
        ann.save(update_fields=['is_active'])
        status_text = 'activated' if ann.is_active else 'deactivated'
        return Response({'message': f"Announcement successfully {status_text}.", 'is_active': ann.is_active})


class PublicContentView(APIView):
    """
    Returns public marketing offers and announcements for the home page.
    Compatible with existing frontend GET /api/content/public.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        today = timezone.localdate()
        offers = Offer.objects.filter(is_active=True, valid_until__gte=today).order_by('-created_at')
        announcements = Announcement.objects.filter(is_active=True).order_by('-created_at')
        return Response({
            'offers': OfferSerializer(offers, many=True).data,
            'announcements': AnnouncementSerializer(announcements, many=True).data,
        })
