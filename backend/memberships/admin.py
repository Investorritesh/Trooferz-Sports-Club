from django.contrib import admin
from .models import MembershipPlan, Membership


@admin.register(MembershipPlan)
class MembershipPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'tier', 'price', 'duration_days', 'discount_percent', 'free_booking_credits', 'is_active')
    list_filter = ('tier', 'is_active')
    search_fields = ('name', 'benefits_summary')


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ('user', 'plan', 'start_date', 'end_date', 'credits_left', 'status', 'is_frozen')
    list_filter = ('status', 'is_frozen', 'plan__tier')
    search_fields = ('user__email', 'user__full_name', 'plan__name')
