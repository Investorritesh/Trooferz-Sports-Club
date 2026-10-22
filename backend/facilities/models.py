from decimal import Decimal
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class Sport(models.Model):
    """
    Catalog of sports offered at Trooferz Sports Club (Cricket, Football, Tennis, etc.)
    """
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=100, blank=True)
    image_url = models.CharField(max_length=500, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sports'
        ordering = ['name']

    def __str__(self):
        return self.name


class Facility(models.Model):
    """
    Physical venue complex in Baner, Pune.
    Houses multiple courts and amenities.
    """
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    address = models.CharField(max_length=255, default='Near Balewadi High Street, Baner, Pune, Maharashtra 411045')
    city = models.CharField(max_length=100, default='Pune')
    area = models.CharField(max_length=100, default='Baner')
    opening_time = models.TimeField(default='06:00:00')
    closing_time = models.TimeField(default='23:00:00')
    image_url = models.CharField(max_length=500, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'facilities'
        ordering = ['name']
        verbose_name_plural = 'Facilities'

    def __str__(self):
        return f"{self.name} ({self.area}, {self.city})"


class CourtType(models.TextChoices):
    INDOOR = 'INDOOR', 'Indoor'
    OUTDOOR = 'OUTDOOR', 'Outdoor'


class Court(models.Model):
    """
    Specific playing surface / turf pitch under a facility.
    Supports granular conflict-free scheduling and weather warnings for outdoor turfs.
    """
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='courts')
    sport = models.ForeignKey(Sport, on_delete=models.CASCADE, related_name='courts')
    name = models.CharField(max_length=100)  # e.g., 'Box Cricket Turf A', 'Badminton Court 1'
    court_type = models.CharField(max_length=20, choices=CourtType.choices, default=CourtType.OUTDOOR)
    surface_type = models.CharField(max_length=100, default='Synthetic Grass Turf')
    capacity = models.PositiveIntegerField(default=10)
    hourly_base_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('800.00'))
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'courts'
        ordering = ['facility', 'sport', 'name']

    def __str__(self):
        return f"{self.name} - {self.sport.name} ({self.facility.name})"


class DayType(models.TextChoices):
    ALL = 'ALL', 'All Days'
    WEEKDAY = 'WEEKDAY', 'Weekday (Mon-Fri)'
    WEEKEND = 'WEEKEND', 'Weekend (Sat-Sun)'
    HOLIDAY = 'HOLIDAY', 'Public Holiday'


class PricingRule(models.Model):
    """
    Dynamic pricing rules engine.
    Applies peak hour surges, weekend rates, and occupancy thresholds.
    """
    name = models.CharField(max_length=100)
    court = models.ForeignKey(Court, on_delete=models.CASCADE, null=True, blank=True, related_name='pricing_rules')
    day_type = models.CharField(max_length=20, choices=DayType.choices, default=DayType.ALL)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    price_multiplier = models.DecimalField(max_digits=4, decimal_places=2, default=Decimal('1.00'))
    occupancy_threshold_pct = models.PositiveIntegerField(null=True, blank=True)  # e.g., 75%
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pricing_rules'
        ordering = ['-price_multiplier']

    def __str__(self):
        return f"{self.name} (x{self.price_multiplier} on {self.day_type})"


class Equipment(models.Model):
    """
    Rental equipment inventory for sports (bats, rackets, balls, protective pads).
    """
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='equipment')
    sport = models.ForeignKey(Sport, on_delete=models.CASCADE, related_name='equipment')
    name = models.CharField(max_length=100)
    total_quantity = models.PositiveIntegerField(default=10)
    available_quantity = models.PositiveIntegerField(default=10)
    rental_price_per_hour = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('50.00'))
    deposit_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'equipment'
        verbose_name_plural = 'Equipment'

    def __str__(self):
        return f"{self.name} ({self.available_quantity}/{self.total_quantity} avail)"


class RentalStatus(models.TextChoices):
    RESERVED = 'RESERVED', 'Reserved'
    ISSUED = 'ISSUED', 'Issued'
    RETURNED = 'RETURNED', 'Returned'
    LOST = 'LOST', 'Lost / Damaged'


class EquipmentRental(models.Model):
    """
    Desk check-out logs for equipment rented during a court booking.
    """
    booking = models.ForeignKey('bookings.Booking', on_delete=models.CASCADE, null=True, blank=True, related_name='rentals')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='equipment_rentals')
    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE, related_name='rentals')
    quantity = models.PositiveIntegerField(default=1)
    total_fee = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(max_length=20, choices=RentalStatus.choices, default=RentalStatus.RESERVED)
    issued_at = models.DateTimeField(null=True, blank=True)
    returned_at = models.DateTimeField(null=True, blank=True)
    issued_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='issued_rentals')

    class Meta:
        db_table = 'equipment_rentals'

    def __str__(self):
        return f"{self.equipment.name} x {self.quantity} - {self.user.email} ({self.status})"


class Review(models.Model):
    """
    Verified customer reviews for courts and facilities.
    Only confirmed bookings can leave 1 review per booking.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews')
    court = models.ForeignKey(Court, on_delete=models.CASCADE, related_name='reviews')
    booking = models.OneToOneField('bookings.Booking', on_delete=models.CASCADE, related_name='review')
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(blank=True)
    is_verified = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'reviews'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.rating}★ by {self.user.email} for {self.court.name}"


class Offer(models.Model):
    """
    Promotional discounts and marketing campaign codes.
    """
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('10.00'))
    valid_until = models.DateField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'offers'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.discount_percent}% off)"


class Announcement(models.Model):
    """
    Club-wide operational notices displayed on customer dashboard.
    """
    title = models.CharField(max_length=150)
    message = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'announcements'
        ordering = ['-created_at']

    def __str__(self):
        return self.title
