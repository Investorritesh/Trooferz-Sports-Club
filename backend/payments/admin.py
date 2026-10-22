from django.contrib import admin
from .models import Payment, WalletTransaction


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('payment_reference', 'user', 'amount', 'payment_method', 'status', 'created_at')
    list_filter = ('status', 'payment_method', 'created_at')
    search_fields = ('payment_reference', 'user__email', 'gateway_order_id', 'gateway_payment_id')


@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'transaction_type', 'category', 'amount', 'balance_after', 'created_at')
    list_filter = ('transaction_type', 'category', 'created_at')
    search_fields = ('user__email', 'description', 'reference_id')
