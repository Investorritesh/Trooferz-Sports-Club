from django.contrib import admin
from .models import (
    Sport, Facility, Court, PricingRule,
    Equipment, EquipmentRental, Review, Offer, Announcement
)


@admin.register(Sport)
class SportAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Facility)
class FacilityAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'area', 'opening_time', 'closing_time', 'is_active')
    list_filter = ('city', 'area', 'is_active')
    search_fields = ('name', 'address', 'area')


@admin.register(Court)
class CourtAdmin(admin.ModelAdmin):
    list_display = ('name', 'facility', 'sport', 'court_type', 'hourly_base_price', 'capacity', 'is_active')
    list_filter = ('court_type', 'is_active', 'facility', 'sport')
    search_fields = ('name', 'facility__name', 'sport__name')


@admin.register(PricingRule)
class PricingRuleAdmin(admin.ModelAdmin):
    list_display = ('name', 'court', 'day_type', 'price_multiplier', 'is_active')
    list_filter = ('day_type', 'is_active')
    search_fields = ('name',)


@admin.register(Equipment)
class EquipmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'facility', 'sport', 'available_quantity', 'total_quantity', 'rental_price_per_hour', 'is_active')
    list_filter = ('facility', 'sport', 'is_active')
    search_fields = ('name',)


@admin.register(EquipmentRental)
class EquipmentRentalAdmin(admin.ModelAdmin):
    list_display = ('equipment', 'user', 'quantity', 'total_fee', 'status', 'issued_at')
    list_filter = ('status', 'issued_at')
    search_fields = ('equipment__name', 'user__email')


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('court', 'user', 'rating', 'is_verified', 'created_at')
    list_filter = ('rating', 'is_verified')
    search_fields = ('court__name', 'user__email', 'comment')


@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = ('title', 'discount_percent', 'valid_until', 'is_active')
    list_filter = ('is_active', 'valid_until')
    search_fields = ('title', 'description')


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ('title', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('title', 'message')
