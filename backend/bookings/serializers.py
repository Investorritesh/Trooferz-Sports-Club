from rest_framework import serializers
from .models import Slot, Booking, BookingPlayer, Waitlist


class SlotSerializer(serializers.ModelSerializer):
    facility_name = serializers.CharField(source='court.facility.name', read_only=True)
    sport_name = serializers.CharField(source='court.sport.name', read_only=True)
    court_name = serializers.CharField(source='court.name', read_only=True)
    available_for_date = serializers.SerializerMethodField()

    class Meta:
        model = Slot
        fields = [
            'id', 'court', 'court_name', 'facility_name', 'sport_name',
            'date', 'start_time', 'end_time', 'status', 'available_for_date'
        ]

    def get_available_for_date(self, obj):
        return obj.status == 'AVAILABLE'


class BookingPlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingPlayer
        fields = '__all__'


class BookingSerializer(serializers.ModelSerializer):
    sport_name = serializers.CharField(source='court.sport.name', read_only=True)
    facility_name = serializers.CharField(source='court.facility.name', read_only=True)
    court_name = serializers.CharField(source='court.name', read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    checked_in_by_email = serializers.CharField(source='checked_in_by.email', read_only=True)
    amount = serializers.DecimalField(source='total_amount', max_digits=10, decimal_places=2, read_only=True)
    players = BookingPlayerSerializer(many=True, read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'booking_code', 'user', 'user_name', 'user_email',
            'court', 'court_name', 'sport_name', 'facility_name',
            'slot', 'booking_date', 'start_time', 'end_time',
            'base_price', 'dynamic_multiplier', 'discount_amount',
            'credits_used', 'total_amount', 'amount', 'status',
            'is_split_payment', 'split_expiry', 'players',
            'qr_code_token', 'qr_checked_in_at', 'checked_in_by', 'checked_in_by_email',
            'weather_warning', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'booking_code', 'user', 'amount', 'created_at', 'updated_at'
        ]


class WaitlistSerializer(serializers.ModelSerializer):
    court_name = serializers.CharField(source='court.name', read_only=True)
    sport_name = serializers.CharField(source='court.sport.name', read_only=True)

    class Meta:
        model = Waitlist
        fields = '__all__'
