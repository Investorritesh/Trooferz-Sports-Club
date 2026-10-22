from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    WalletDetailView,
    WalletTopUpView,
    WalletTransactionsView,
    RazorpayOrderCreateView,
    RazorpayVerifyView,
    PaymentViewSet
)

router = DefaultRouter()
router.register(r'payments', PaymentViewSet, basename='payment')

urlpatterns = [
    path('payments/wallet/', WalletDetailView.as_view(), name='wallet-detail'),
    path('payments/wallet', WalletDetailView.as_view(), name='wallet-detail-noslash'),
    path('payments/wallet/transactions/', WalletTransactionsView.as_view(), name='wallet-transactions'),
    path('payments/wallet/transactions', WalletTransactionsView.as_view(), name='wallet-transactions-noslash'),
    path('payments/wallet/topup/', WalletTopUpView.as_view(), name='wallet-topup-alt'),
    path('payments/wallet/topup', WalletTopUpView.as_view(), name='wallet-topup-alt-noslash'),
    path('payments/wallet/top-up/', WalletTopUpView.as_view(), name='wallet-topup'),
    path('payments/wallet/top-up', WalletTopUpView.as_view(), name='wallet-topup-noslash'),
    path('payments/razorpay/create-order/', RazorpayOrderCreateView.as_view(), name='razorpay-create-order'),
    path('payments/razorpay/create-order', RazorpayOrderCreateView.as_view(), name='razorpay-create-order-noslash'),
    path('payments/razorpay/verify/', RazorpayVerifyView.as_view(), name='razorpay-verify'),
    path('payments/razorpay/verify', RazorpayVerifyView.as_view(), name='razorpay-verify-noslash'),
    path('', include(router.urls)),
]
