from django.contrib import admin
from .models import Slot, Booking, BookingPlayer, Waitlist


@admin.register(Slot)
class SlotAdmin(admin.ModelAdmin):
    list_display = ('court', 'date', 'start_time', 'end_time', 'status')
    list_filter = ('status', 'date', 'court__sport')
    search_fields = ('court__name', 'court__facility__name')
    ordering = ('date', 'start_time')


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('booking_code', 'user', 'court', 'booking_date', 'start_time', 'total_amount', 'status', 'created_at')
    list_filter = ('status', 'booking_date', 'court__sport')
    search_fields = ('booking_code', 'user__email', 'user__full_name', 'court__name')
    ordering = ('-booking_date', '-start_time')


@admin.register(BookingPlayer)
class BookingPlayerAdmin(admin.ModelAdmin):
    list_display = ('booking', 'name', 'email', 'share_amount', 'payment_status', 'paid_at')
    list_filter = ('payment_status',)
    search_fields = ('name', 'email', 'booking__booking_code')


@admin.register(Waitlist)
class WaitlistAdmin(admin.ModelAdmin):
    list_display = ('user', 'court', 'date', 'start_time', 'status', 'priority_score', 'created_at')
    list_filter = ('status', 'date')
    search_fields = ('user__email', 'court__name')
