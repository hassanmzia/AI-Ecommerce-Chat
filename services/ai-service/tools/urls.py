"""
URL patterns for the tools app.
"""

from django.urls import path

from . import views

app_name = "tools"

urlpatterns = [
    # Tool discovery and invocation
    path("", views.ToolListView.as_view(), name="tool-list"),
    path("call/", views.ToolCallView.as_view(), name="tool-call"),
    # Data endpoints (admin/testing)
    path("customers/", views.CustomerListView.as_view(), name="customer-list"),
    path("customers/<str:customer_id>/", views.CustomerDetailView.as_view(), name="customer-detail"),
    path("products/", views.ProductListView.as_view(), name="product-list"),
    path("products/<str:product_id>/", views.ProductDetailView.as_view(), name="product-detail"),
    path("orders/", views.OrderListView.as_view(), name="order-list"),
    path("orders/<str:order_id>/", views.OrderDetailView.as_view(), name="order-detail"),
    path("payments/", views.PaymentListView.as_view(), name="payment-list"),
    path("coupons/", views.CouponListView.as_view(), name="coupon-list"),
    path("reviews/", views.ReviewListView.as_view(), name="review-list"),
]
