"""
Views for the tools app - direct tool access for admin / testing.
"""

import logging
import time

from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from .ecommerce_tools import EcommerceToolkit
from .models import Customer, Product, Order, Payment, Coupon, Review
from .serializers import (
    CustomerSerializer,
    ProductSerializer,
    OrderSerializer,
    PaymentSerializer,
    CouponSerializer,
    ReviewSerializer,
    ToolCallRequestSerializer,
    ToolCallResponseSerializer,
)

logger = logging.getLogger(__name__)


class ToolCallView(APIView):
    """
    POST /api/v1/tools/call/
    Directly invoke an e-commerce tool by name. Useful for testing and admin.
    """

    def post(self, request):
        serializer = ToolCallRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        tool_name = serializer.validated_data["tool_name"]
        params = serializer.validated_data["params"]

        toolkit = EcommerceToolkit()
        tool_method = getattr(toolkit, tool_name, None)

        if not tool_method:
            return Response(
                {"error": f"Tool '{tool_name}' not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        start = time.time()
        try:
            result = tool_method(**params)
            elapsed = int((time.time() - start) * 1000)
            response_data = {
                "tool_name": tool_name,
                "result": result,
                "success": True,
                "execution_time_ms": elapsed,
            }
            return Response(response_data, status=status.HTTP_200_OK)
        except Exception as exc:
            elapsed = int((time.time() - start) * 1000)
            logger.exception("Tool call error for %s", tool_name)
            return Response(
                {
                    "tool_name": tool_name,
                    "result": str(exc),
                    "success": False,
                    "execution_time_ms": elapsed,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ToolListView(APIView):
    """
    GET /api/v1/tools/
    List all available tools and their descriptions.
    """

    def get(self, request):
        tools = [
            {
                "name": "lookup_customer_info",
                "description": "Look up customer information by customer ID.",
                "parameters": {"customer_id": "string (e.g. CUST-2001)"},
            },
            {
                "name": "track_order",
                "description": "Track order status and details by order ID.",
                "parameters": {"order_id": "string (e.g. ORD-10001)"},
            },
            {
                "name": "search_products",
                "description": "Search for products in the catalog.",
                "parameters": {
                    "query": "string",
                    "category": "string (optional)",
                    "max_results": "integer (default: 5)",
                },
            },
            {
                "name": "get_payment_info",
                "description": "Get payment information for an order (security-restricted).",
                "parameters": {"order_id": "string (e.g. ORD-10001)"},
            },
            {
                "name": "get_recommendations",
                "description": "Get product recommendations based on customer history or category.",
                "parameters": {
                    "customer_id": "string (optional)",
                    "category": "string (optional)",
                },
            },
            {
                "name": "get_order_history",
                "description": "Get order history for a customer.",
                "parameters": {"customer_id": "string (e.g. CUST-2001)"},
            },
            {
                "name": "check_inventory",
                "description": "Check inventory / stock for a specific product.",
                "parameters": {"product_id": "string (e.g. PROD-1001)"},
            },
            {
                "name": "apply_coupon",
                "description": "Validate and apply a coupon code to an order.",
                "parameters": {
                    "coupon_code": "string",
                    "order_id": "string (e.g. ORD-10001)",
                },
            },
        ]
        return Response({"tools": tools, "count": len(tools)})


class CustomerListView(ListAPIView):
    """GET /api/v1/tools/customers/"""

    serializer_class = CustomerSerializer
    queryset = Customer.objects.all()


class CustomerDetailView(RetrieveAPIView):
    """GET /api/v1/tools/customers/<customer_id>/"""

    serializer_class = CustomerSerializer
    queryset = Customer.objects.all()
    lookup_field = "customer_id"


class ProductListView(ListAPIView):
    """GET /api/v1/tools/products/"""

    serializer_class = ProductSerializer
    queryset = Product.objects.all()
    filterset_fields = ["category"]
    search_fields = ["name", "description"]


class ProductDetailView(RetrieveAPIView):
    """GET /api/v1/tools/products/<product_id>/"""

    serializer_class = ProductSerializer
    queryset = Product.objects.all()
    lookup_field = "product_id"


class OrderListView(ListAPIView):
    """GET /api/v1/tools/orders/"""

    serializer_class = OrderSerializer
    queryset = Order.objects.all()
    filterset_fields = ["status", "customer_id"]


class OrderDetailView(RetrieveAPIView):
    """GET /api/v1/tools/orders/<order_id>/"""

    serializer_class = OrderSerializer
    queryset = Order.objects.all()
    lookup_field = "order_id"


class PaymentListView(ListAPIView):
    """GET /api/v1/tools/payments/"""

    serializer_class = PaymentSerializer
    queryset = Payment.objects.all()


class CouponListView(ListAPIView):
    """GET /api/v1/tools/coupons/"""

    serializer_class = CouponSerializer
    queryset = Coupon.objects.all()


class ReviewListView(ListAPIView):
    """GET /api/v1/tools/reviews/"""

    serializer_class = ReviewSerializer
    queryset = Review.objects.all()
    filterset_fields = ["product_id", "customer_id", "rating"]
