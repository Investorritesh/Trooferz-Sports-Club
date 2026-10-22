"""
Root URL configuration for Trooferz Sports Club backend.
"""

from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def health_check(request):
    """Simple API health check endpoint compatible with frontend Settings & monitoring."""
    return JsonResponse({
        'status': 'ok',
        'service': 'trooferz-django-api',
        'database': 'connected',
        'version': '2.0.0'
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='api-health'),
    path('api/health', health_check, name='api-health-noslash'),
    path('api/auth/', include('users.urls')),
    path('api/', include('users.urls')),
    path('api/', include('facilities.urls')),
    path('api/', include('bookings.urls')),
    path('api/', include('memberships.urls')),
    path('api/', include('payments.urls')),
    path('api/', include('analytics.urls')),

    # v1 prefixes for backward/forward compatibility
    path('api/v1/health/', health_check),
    path('api/v1/auth/', include('users.urls')),
    path('api/v1/', include('users.urls')),
    path('api/v1/', include('facilities.urls')),
    path('api/v1/', include('bookings.urls')),
    path('api/v1/', include('memberships.urls')),
    path('api/v1/', include('payments.urls')),
    path('api/v1/', include('analytics.urls')),
]
