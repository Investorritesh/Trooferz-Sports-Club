from rest_framework import serializers
from .models import Sport, Facility, Court, PricingRule, Equipment, EquipmentRental, Review, Offer, Announcement


SPORT_IMAGE_MAPPING = {
    'badminton': '/badminton-court.jpg',
    'box-cricket': '/cricket-turf.jpg',
    'cricket': '/cricket-turf.jpg',
    'football': '/football-court.jpg',
    'football-turf': '/football-court.jpg',
    'tennis': '/tennis-court.jpg',
    'lawn-tennis': '/tennis-court.jpg',
    'pickleball': '/pickleball-court.jpg',
}

SPORT_FALLBACK_PRICES = {
    'badminton': 500,
    'box-cricket': 1000,
    'cricket': 1000,
    'football': 1400,
    'football-turf': 1400,
    'tennis': 800,
    'lawn-tennis': 800,
    'pickleball': 600,
}


class SportSerializer(serializers.ModelSerializer):
    price = serializers.SerializerMethodField()
    base_price = serializers.SerializerMethodField()
    duration_minutes = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Sport
        fields = '__all__'

    def get_image_url(self, obj):
        if obj.image_url:
            return obj.image_url
        key = (obj.slug or obj.name.lower().replace(' ', '-')).strip()
        return SPORT_IMAGE_MAPPING.get(key, '/football-court.jpg')

    def get_price(self, obj):
        active_courts = obj.courts.filter(is_active=True).order_by('hourly_base_price')
        first_court = active_courts.first()
        if first_court:
            return float(first_court.hourly_base_price)
        key = (obj.slug or obj.name.lower().replace(' ', '-')).strip()
        return SPORT_FALLBACK_PRICES.get(key, 800)

    def get_base_price(self, obj):
        return self.get_price(obj)

    def get_duration_minutes(self, obj):
        return 60


class CourtSerializer(serializers.ModelSerializer):
    facility_name = serializers.CharField(source='facility.name', read_only=True)
    sport_name = serializers.CharField(source='sport.name', read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Court
        fields = '__all__'

    def get_image_url(self, obj):
        if hasattr(obj, 'image_url') and obj.image_url:
            return obj.image_url
        key = (obj.sport.slug if obj.sport else '').lower()
        return SPORT_IMAGE_MAPPING.get(key, '/football-court.jpg')


class FacilitySerializer(serializers.ModelSerializer):
    courts = CourtSerializer(many=True, read_only=True)
    price = serializers.SerializerMethodField()
    capacity = serializers.SerializerMethodField()
    sport_name = serializers.SerializerMethodField()
    sport_id = serializers.SerializerMethodField()
    sport_ids = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Facility
        fields = '__all__'

    def get_sport_id(self, obj):
        first_court = obj.courts.filter(is_active=True).first()
        return first_court.sport_id if first_court else None

    def get_sport_ids(self, obj):
        return list(obj.courts.filter(is_active=True).values_list('sport_id', flat=True).distinct())

    def get_price(self, obj):
        active_courts = obj.courts.filter(is_active=True).order_by('hourly_base_price')
        first = active_courts.first()
        return float(first.hourly_base_price) if first else 800.0

    def get_capacity(self, obj):
        active_courts = obj.courts.filter(is_active=True).order_by('-capacity')
        first = active_courts.first()
        return first.capacity if first else 14

    def get_sport_name(self, obj):
        sports = list(obj.courts.filter(is_active=True).values_list('sport__name', flat=True).distinct())
        return ' / '.join(sports[:2]) if sports else 'Multi-Sport Arena'

    def get_image_url(self, obj):
        if obj.image_url:
            return obj.image_url
        return '/cricket-turf.jpg'


class OfferSerializer(serializers.ModelSerializer):
    class Meta:
        model = Offer
        fields = '__all__'


class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = '__all__'
