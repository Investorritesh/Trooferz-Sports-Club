from decimal import Decimal
from django.contrib.auth.models import AbstractUser
from django.db import models


class UserRole(models.TextChoices):
    MEMBER = 'MEMBER', 'Member'
    STAFF = 'STAFF', 'Staff'
    ADMIN = 'ADMIN', 'Admin'


class User(AbstractUser):
    """
    Custom user model for Trooferz Sports Club.
    Supports 3 roles: Member, Staff, Admin.
    Uses email as primary login identification with wallet support.
    """
    email = models.EmailField(unique=True, db_index=True)
    full_name = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.MEMBER,
        db_index=True
    )
    wallet_balance = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        db_table = 'users_user'
        ordering = ['-date_joined']
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.full_name or self.username} ({self.role}) - {self.email}"

    @property
    def is_member(self):
        return self.role == UserRole.MEMBER

    @property
    def is_club_staff(self):
        return self.role in [UserRole.STAFF, UserRole.ADMIN]

    @property
    def is_club_admin(self):
        return self.role == UserRole.ADMIN or self.is_superuser


class NotificationType(models.TextChoices):
    BOOKING = 'BOOKING', 'Booking'
    MEMBERSHIP = 'MEMBERSHIP', 'Membership'
    WAITLIST = 'WAITLIST', 'Waitlist'
    WEATHER = 'WEATHER', 'Weather Alert'
    WALLET = 'WALLET', 'Wallet'
    SPLIT_PAYMENT = 'SPLIT_PAYMENT', 'Split Payment'
    SYSTEM = 'SYSTEM', 'System'


class Notification(models.Model):
    """
    In-app notifications sent to members regarding bookings,
    memberships, cancellations, waitlist status, and weather alerts.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=150)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM
    )
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.notification_type}] {self.title} -> {self.user.email}"
