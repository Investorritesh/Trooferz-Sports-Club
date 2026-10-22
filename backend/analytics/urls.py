from django.urls import path
from .views import (
    AdminDashboardView,
    ReportsView,
    WeatherAdvisoryView,
    OccupancyForecastView,
    DemandHeatmapView,
    RevenueInsightsView
)

urlpatterns = [
    # Admin Dashboard & Reports (frontend backward-compatibility)
    path('dashboard/', AdminDashboardView.as_view(), name='dashboard-summary'),
    path('dashboard', AdminDashboardView.as_view(), name='dashboard-summary-noslash'),
    path('dashboard/reports/', ReportsView.as_view(), name='dashboard-reports'),
    path('dashboard/reports', ReportsView.as_view(), name='dashboard-reports-noslash'),

    # Advanced Analytics & Intelligence
    path('analytics/weather/', WeatherAdvisoryView.as_view(), name='analytics-weather'),
    path('analytics/weather-advisory/', WeatherAdvisoryView.as_view(), name='analytics-weather-advisory'),
    path('analytics/forecast/', OccupancyForecastView.as_view(), name='analytics-forecast'),
    path('analytics/occupancy-forecast/', OccupancyForecastView.as_view(), name='analytics-occupancy-forecast'),
    path('analytics/heatmap/', DemandHeatmapView.as_view(), name='analytics-heatmap'),
    path('analytics/demand-heatmap/', DemandHeatmapView.as_view(), name='analytics-demand-heatmap'),
    path('analytics/revenue-insights/', RevenueInsightsView.as_view(), name='analytics-revenue-insights'),
]
