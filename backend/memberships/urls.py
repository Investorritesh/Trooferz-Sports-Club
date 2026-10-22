from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PlanViewSet,
    MembershipViewSet,
    MyMembershipsView,
    AdminMembershipsView,
    AdminPlansView,
    FreezeActiveMembershipView,
    UnfreezeActiveMembershipView,
    SubscribeMembershipView
)

router = DefaultRouter()
router.register(r'memberships/plans', PlanViewSet, basename='membership-plans')
router.register(r'memberships', MembershipViewSet, basename='membership')

urlpatterns = [
    path('memberships/mine/', MyMembershipsView.as_view(), name='memberships-mine'),
    path('memberships/mine', MyMembershipsView.as_view(), name='memberships-mine-noslash'),
    path('memberships/admin/', AdminMembershipsView.as_view(), name='memberships-admin'),
    path('memberships/admin', AdminMembershipsView.as_view(), name='memberships-admin-noslash'),
    path('memberships/plans/admin/', AdminPlansView.as_view(), name='memberships-plans-admin'),
    path('memberships/plans/admin', AdminPlansView.as_view(), name='memberships-plans-admin-noslash'),
    path('memberships/freeze/', FreezeActiveMembershipView.as_view(), name='memberships-freeze'),
    path('memberships/freeze', FreezeActiveMembershipView.as_view(), name='memberships-freeze-noslash'),
    path('memberships/unfreeze/', UnfreezeActiveMembershipView.as_view(), name='memberships-unfreeze'),
    path('memberships/unfreeze', UnfreezeActiveMembershipView.as_view(), name='memberships-unfreeze-noslash'),
    path('memberships/subscribe/', SubscribeMembershipView.as_view(), name='memberships-subscribe'),
    path('memberships/subscribe', SubscribeMembershipView.as_view(), name='memberships-subscribe-noslash'),
    path('memberships/activate', SubscribeMembershipView.as_view(), name='memberships-activate-legacy'),
    path('memberships/activate/', SubscribeMembershipView.as_view(), name='memberships-activate'),
    path('', include(router.urls)),
]

