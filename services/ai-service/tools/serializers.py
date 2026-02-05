"""
Serializers for the tools app models.
"""

from rest_framework import serializers

from .models import Customer, Product, Order, Payment, Coupon, Review


class CustomerSerializer(serializers.ModelSerializer):
    """Serializer for Customer model."""

    class Meta:
        model = Customer
        fields = [
            "customer_id",
            "full_name",
            "email",
            "phone_primary",
            "account_status",
            "loyalty_tier",
            "loyalty_points",
            "home_address",
            "created_at",
        ]
        read_only_fields = ["created_at"]


class ProductSerializer(serializers.ModelSerializer):
    """Serializer for Product model."""

    class Meta:
        model = Product
        fields = [
            "product_id",
            "name",
            "category",
            "price",
            "stock_quantity",
            "description",
            "average_rating",
            "review_count",
            "image_url",
            "specifications",
            "created_at",
        ]
        read_only_fields = ["created_at"]


class OrderSerializer(serializers.ModelSerializer):
    """Serializer for Order model."""

    class Meta:
        model = Order
        fields = [
            "order_id",
            "customer_id",
            "status",
            "order_date",
            "total_amount",
            "tracking_number",
            "estimated_delivery_date",
            "shipping_address",
            "items",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for Payment model (hides full card details)."""

    card_display = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "payment_id",
            "order_id",
            "status",
            "amount",
            "payment_method",
            "transaction_id",
            "payment_date",
            "card_display",
            "created_at",
        ]
        read_only_fields = ["created_at"]

    def get_card_display(self, obj):
        if obj.card_last_four:
            return f"****-****-****-{obj.card_last_four}"
        return None


class CouponSerializer(serializers.ModelSerializer):
    """Serializer for Coupon model."""

    is_valid = serializers.ReadOnlyField()

    class Meta:
        model = Coupon
        fields = [
            "code",
            "discount_type",
            "discount_value",
            "min_order_amount",
            "max_uses",
            "used_count",
            "valid_from",
            "valid_until",
            "is_active",
            "is_valid",
        ]


class ReviewSerializer(serializers.ModelSerializer):
    """Serializer for Review model."""

    class Meta:
        model = Review
        fields = [
            "id",
            "product_id",
            "customer_id",
            "rating",
            "title",
            "content",
            "created_at",
            "is_verified_purchase",
        ]
        read_only_fields = ["id", "created_at"]


class ToolCallRequestSerializer(serializers.Serializer):
    """Serializer for direct tool call requests."""

    tool_name = serializers.ChoiceField(
        choices=[
            "lookup_customer_info",
            "track_order",
            "search_products",
            "get_payment_info",
            "get_recommendations",
            "get_order_history",
            "check_inventory",
            "apply_coupon",
        ]
    )
    params = serializers.DictField(default=dict)


class ToolCallResponseSerializer(serializers.Serializer):
    """Serializer for tool call responses."""

    tool_name = serializers.CharField()
    result = serializers.CharField()
    success = serializers.BooleanField()
    execution_time_ms = serializers.IntegerField()
