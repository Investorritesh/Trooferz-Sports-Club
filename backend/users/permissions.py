from rest_framework.permissions import BasePermission
from .models import UserRole


class IsMember(BasePermission):
    """Allows access to authenticated members and club administrators."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_active)


class IsStaff(BasePermission):
    """Allows access to staff members (desk/check-in) and administrators."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_active and
            (request.user.role in [UserRole.STAFF, UserRole.ADMIN] or request.user.is_staff or request.user.is_superuser)
        )


class IsAdmin(BasePermission):
    """Allows access only to full club administrators and superusers."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_active and
            (request.user.role == UserRole.ADMIN or request.user.is_superuser)
        )


class IsOwnerOrAdmin(BasePermission):
    """
    Object-level permission allowing users to edit/view their own records,
    while permitting club administrators full access.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role == UserRole.ADMIN or request.user.is_superuser:
            return True
        user_field = getattr(obj, 'user', None)
        return user_field == request.user if user_field else False
