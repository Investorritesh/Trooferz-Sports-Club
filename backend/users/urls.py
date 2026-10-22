from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    MemberLoginView,
    StaffLoginView,
    AdminLoginView,
    UserProfileView,
    LogoutView,
    NotificationViewSet,
    UserAdminViewSet
)

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'content/notifications', NotificationViewSet, basename='content-notification')
router.register(r'admin/users', UserAdminViewSet, basename='admin-users')
router.register(r'users', UserAdminViewSet, basename='users')

urlpatterns = [
    path('register', RegisterView.as_view(), name='auth-register-noslash'),
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login', MemberLoginView.as_view(), name='auth-login-noslash'),
    path('login/', MemberLoginView.as_view(), name='auth-login'),
    path('member-login', MemberLoginView.as_view(), name='auth-member-login-noslash'),
    path('member-login/', MemberLoginView.as_view(), name='auth-member-login'),
    path('staff-login', StaffLoginView.as_view(), name='auth-staff-login-noslash'),
    path('staff-login/', StaffLoginView.as_view(), name='auth-staff-login'),
    path('admin-login', AdminLoginView.as_view(), name='auth-admin-login-noslash'),
    path('admin-login/', AdminLoginView.as_view(), name='auth-admin-login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('me', UserProfileView.as_view(), name='auth-me-noslash'),
    path('me/', UserProfileView.as_view(), name='auth-me'),
    path('profile/', UserProfileView.as_view(), name='auth-profile'),
    path('users/profile/me', UserProfileView.as_view(), name='user-profile-me-noslash'),
    path('users/profile/me/', UserProfileView.as_view(), name='user-profile-me'),
    path('logout', LogoutView.as_view(), name='auth-logout-noslash'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('', include(router.urls)),
]
