from decimal import Decimal
from django.db import models
from django.conf import settings


class SlotStatus(models.TextChoices):
    AVAILABLE = 'AVAILABLE', 'Available'
    BOOKED = 'BOOKED', 'Booked'
    BLOCKED = 'BLOCKED', 'Blocked'
    MAINTENANCE = 'MAINTENANCE', 'Maintenance'


class Slot(models.Model):
    """
    Operational time slot for a court on a specific date.
    Strict unique constraint on (court, date, start_time) guarantees 0 double-bookings.
    """
    court = models.ForeignKey('facilities.Court', on_delete=models.CASCADE, related_name='slots')
    date = models.DateField(db_index=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(
        max_length=20,
        choices=SlotStatus.choices,
        default=SlotStatus.AVAILABLE,
        db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'slots'
        ordering = ['date', 'start_time']
        constraints = [
            models.UniqueConstraint(fields=['court', 'date', 'start_time'], name='unique_court_slot')
        ]

    def __str__(self):
        return f"{self.court.name} | {self.date} {self.start_time.strftime('%H:%M')}-{self.end_time.strftime('%H:%M')} [{self.status}]"


class BookingStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    CONFIRMED = 'CONFIRMED', 'Confirmed'
    CHECKED_IN = 'CHECKED_IN', 'Checked-In'
    COMPLETED = 'COMPLETED', 'Completed'
    CANCELLED = 'CANCELLED', 'Cancelled'
    REFUNDED = 'REFUNDED', 'Refunded'


class Booking(models.Model):
    """
    Court reservation transaction.
    Encapsulates lifecycle transitions, dynamic pricing, discount deductions,
    split payment tracking, weather advisories, and digital signed QR passes.
    """
    booking_code = models.CharField(max_length=50, unique=True, db_index=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bookings')
    court = models.ForeignKey('facilities.Court', on_delete=models.CASCADE, related_name='bookings')
    slot = models.ForeignKey(Slot, on_delete=models.CASCADE, related_name='bookings')
    booking_date = models.DateField(db_index=True)
    start_time = models.TimeField()
    end_time = models.TimeField()

    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    dynamic_multiplier = models.DecimalField(max_digits=4, decimal_places=2, default=Decimal('1.00'))
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    credits_used = models.PositiveIntegerField(default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)

    status = models.CharField(
        max_length=20,
        choices=BookingStatus.choices,
        default=BookingStatus.PENDING,
        db_index=True
    )

    is_split_payment = models.BooleanField(default=False)
    split_expiry = models.DateTimeField(null=True, blank=True)

    qr_code_token = models.CharField(max_length=255, unique=True, null=True, blank=True)
    qr_checked_in_at = models.DateTimeField(null=True, blank=True)
    checked_in_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_checkins'
    )

    weather_warning = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bookings'
        ordering = ['-booking_date', '-start_time']

    def __str__(self):
        return f"{self.booking_code} - {self.court.name} ({self.status}) for {self.user.email}"


class PlayerPaymentStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    PAID = 'PAID', 'Paid'
    REFUNDED = 'REFUNDED', 'Refunded'


class BookingPlayer(models.Model):
    """
    Participants in a group/team split payment booking.
    """
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='players')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='split_shares')
    name = models.CharField(max_length=120)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    share_amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_status = models.CharField(
        max_length=20,
        choices=PlayerPaymentStatus.choices,
        default=PlayerPaymentStatus.PENDING
    )
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'booking_players'

    def __str__(self):
        return f"{self.name} ({self.email}) - ₹{self.share_amount} [{self.payment_status}]"


class WaitlistStatus(models.TextChoices):
    WAITING = 'WAITING', 'Waiting'
    OFFERED = 'OFFERED', 'Offered'
    ACCEPTED = 'ACCEPTED', 'Accepted'
    EXPIRED = 'EXPIRED', 'Expired'
    CANCELLED = 'CANCELLED', 'Cancelled'


class Waitlist(models.Model):
    """
    Queue for fully booked slots.
    Automatically notified/promoted via Celery when a booking is cancelled.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='waitlist_entries')
    court = models.ForeignKey('facilities.Court', on_delete=models.CASCADE, related_name='waitlist_entries')
    date = models.DateField(db_index=True)
    start_time = models.TimeField()
    status = models.CharField(
        max_length=20,
        choices=WaitlistStatus.choices,
        default=WaitlistStatus.WAITING,
        db_index=True
    )
    offered_at = models.DateTimeField(null=True, blank=True)
    offer_expires_at = models.DateTimeField(null=True, blank=True)
    priority_score = models.IntegerField(default=0)  # Elevated for Gold/Platinum members
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'waitlist'
        ordering = ['-priority_score', 'created_at']

    def __str__(self):
        return f"Waitlist: {self.user.email} for {self.court.name} on {self.date} {self.start_time} [{self.status}]"
