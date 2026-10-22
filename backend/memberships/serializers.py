from rest_framework import serializers
from .models import MembershipPlan, Membership


class MembershipPlanSerializer(serializers.ModelSerializer):
    benefits = serializers.CharField(source='benefits_summary', required=False, allow_blank=True)
    tier = serializers.CharField(required=False)

    class Meta:
        model = MembershipPlan
        fields = [
            'id', 'tier', 'name', 'price', 'duration_days',
            'discount_percent', 'free_booking_credits', 'priority_booking_days',
            'benefits', 'benefits_summary', 'is_active', 'created_at'
        ]

    def validate(self, attrs):
        if not attrs.get('tier'):
            name = attrs.get('name', 'TIER')
            clean_tier = "".join(c for c in name.upper() if c.isalnum() or c == '_').replace(' ', '_')[:30]
            # Ensure unique tier if duplicate
            base_tier = clean_tier or 'CUSTOM'
            tier_candidate = base_tier
            counter = 1
            while MembershipPlan.objects.exclude(pk=getattr(self.instance, 'pk', None)).filter(tier=tier_candidate).exists():
                tier_candidate = f"{base_tier[:25]}_{counter}"
                counter += 1
            attrs['tier'] = tier_candidate
        return attrs


class MembershipSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    plan_tier = serializers.CharField(source='plan.tier', read_only=True)
    price = serializers.DecimalField(source='plan.price', max_digits=10, decimal_places=2, read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = Membership
        fields = [
            'id', 'user', 'user_name', 'email', 'plan', 'plan_name', 'plan_tier',
            'price', 'start_date', 'end_date', 'credits_left', 'status',
            'is_frozen', 'frozen_at', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'start_date', 'end_date', 'created_at']
