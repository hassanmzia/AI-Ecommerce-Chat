"""
Models for the tools app - e-commerce data entities.
"""

import uuid

from django.db import models
from django.utils import timezone


class Customer(models.Model):
    """E-commerce customer."""

    customer_id = models.CharField(max_length=50, unique=True, db_index=True)
    full_name = models.CharField(max_length=255)
    email = models.EmailField()
    phone_primary = models.CharField(max_length=50, blank=True, default="")
    account_status = models.CharField(
        max_length=20,
        choices=[
            ("active", "Active"),
            ("inactive", "Inactive"),
            ("suspended", "Suspended"),
        ],
        default="active",
    )
    loyalty_tier = models.CharField(
        max_length=20,
        choices=[
            ("Bronze", "Bronze"),
            ("Silver", "Silver"),
            ("Gold", "Gold"),
            ("Platinum", "Platinum"),
        ],
        default="Bronze",
    )
    loyalty_points = models.IntegerField(default=0)
    home_address = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["customer_id"]

    def __str__(self):
        return f"{self.customer_id} - {self.full_name}"


class Product(models.Model):
    """E-commerce product."""

    CATEGORY_CHOICES = [
        ("Electronics", "Electronics"),
        ("Clothing", "Clothing"),
        ("Home", "Home"),
        ("Books", "Books"),
        ("Sports", "Sports"),
    ]

    product_id = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=500)
    category = models.CharField(max_length=100, choices=CATEGORY_CHOICES)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.IntegerField(default=0)
    description = models.TextField(blank=True, default="")
    average_rating = models.DecimalField(max_digits=3, decimal_places=1, default=0.0)
    review_count = models.IntegerField(default=0)
    image_url = models.URLField(blank=True, default="")
    specifications = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["product_id"]
        indexes = [
            models.Index(fields=["category"]),
            models.Index(fields=["name"]),
        ]

    def __str__(self):
        return f"{self.product_id} - {self.name}"


class Order(models.Model):
    """E-commerce order."""

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("shipped", "Shipped"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
        ("returned", "Returned"),
    ]

    order_id = models.CharField(max_length=50, unique=True, db_index=True)
    customer = models.ForeignKey(
        Customer, on_delete=models.CASCADE, related_name="orders", to_field="customer_id"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    order_date = models.DateField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    tracking_number = models.CharField(max_length=100, blank=True, default="")
    estimated_delivery_date = models.DateField(null=True, blank=True)
    shipping_address = models.JSONField(default=dict, blank=True)
    items = models.JSONField(default=list, blank=True)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-order_date"]
        indexes = [
            models.Index(fields=["customer", "-order_date"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.order_id} - {self.customer_id} ({self.status})"


class Payment(models.Model):
    """Payment record for an order."""

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("refunded", "Refunded"),
    ]

    payment_id = models.CharField(max_length=50, unique=True, db_index=True)
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="payments", to_field="order_id"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=50)
    transaction_id = models.CharField(max_length=100, blank=True, default="")
    payment_date = models.DateField()
    card_last_four = models.CharField(max_length=4, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-payment_date"]

    def __str__(self):
        return f"{self.payment_id} - {self.order_id} ({self.status})"


class Coupon(models.Model):
    """Discount coupon."""

    DISCOUNT_TYPE_CHOICES = [
        ("percentage", "Percentage"),
        ("fixed", "Fixed Amount"),
    ]

    code = models.CharField(max_length=50, unique=True, db_index=True)
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    min_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_uses = models.IntegerField(default=100)
    used_count = models.IntegerField(default=0)
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-valid_from"]

    def __str__(self):
        return f"{self.code} ({self.discount_type}: {self.discount_value})"

    @property
    def is_valid(self):
        now = timezone.now()
        return (
            self.is_active
            and self.used_count < self.max_uses
            and self.valid_from <= now <= self.valid_until
        )


class Review(models.Model):
    """Product review from a customer."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="reviews", to_field="product_id"
    )
    customer = models.ForeignKey(
        Customer, on_delete=models.CASCADE, related_name="reviews", to_field="customer_id"
    )
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    title = models.CharField(max_length=255, blank=True, default="")
    content = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified_purchase = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["product", "-created_at"]),
        ]

    def __str__(self):
        return f"Review {self.id} - {self.product_id} ({self.rating}/5)"
