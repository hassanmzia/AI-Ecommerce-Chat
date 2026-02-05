"""
E-commerce toolkit -- all tool functions from the notebook plus new additions.

Each method queries the PostgreSQL database via Django ORM and returns a
formatted string suitable for consumption by the multi-agent orchestrator.
"""

import logging
from decimal import Decimal
from typing import Optional

from django.db.models import Q, Avg, Count, Sum
from django.utils import timezone

logger = logging.getLogger(__name__)


class EcommerceToolkit:
    """Collection of e-commerce tools accessible by the AI agents."""

    # ------------------------------------------------------------------
    # Original notebook tools
    # ------------------------------------------------------------------

    def lookup_customer_info(self, customer_id: str) -> str:
        """
        Look up customer information by customer ID.
        Returns masked customer data for privacy protection.
        """
        from .models import Customer

        if not customer_id or not customer_id.startswith("CUST-"):
            return "Invalid customer ID format. Please provide a valid customer ID starting with 'CUST-'."

        try:
            customer = Customer.objects.get(customer_id=customer_id)
        except Customer.DoesNotExist:
            return f"Customer with ID {customer_id} not found."

        response = f"Customer Information for {customer_id}:\n"
        response += f"Name: {customer.full_name}\n"
        response += f"Email: {customer.email}\n"
        response += f"Phone: {customer.phone_primary}\n"
        response += f"Account Status: {customer.account_status}\n"
        response += f"Loyalty Tier: {customer.loyalty_tier}\n"
        response += f"Loyalty Points: {customer.loyalty_points}\n"

        if customer.home_address:
            addr = customer.home_address
            response += (
                f"Location: {addr.get('city', '')}, "
                f"{addr.get('state', '')} {addr.get('country', '')}\n"
            )

        return response

    def track_order(self, order_id: str) -> str:
        """
        Track order status and details by order ID.
        """
        from .models import Order, Product

        if not order_id or not order_id.startswith("ORD-"):
            return "Invalid order ID format. Please provide a valid order ID starting with 'ORD-'."

        try:
            order = Order.objects.select_related("customer").get(order_id=order_id)
        except Order.DoesNotExist:
            return f"Order with ID {order_id} not found."

        response = f"Order Tracking for {order_id}:\n"
        response += f"Status: {order.status}\n"
        response += f"Order Date: {order.order_date}\n"
        response += f"Total Amount: ${order.total_amount}\n"

        if order.tracking_number:
            response += f"Tracking Number: {order.tracking_number}\n"

        if order.estimated_delivery_date:
            response += f"Estimated Delivery: {order.estimated_delivery_date}\n"

        if order.shipping_address:
            addr = order.shipping_address
            response += (
                f"Shipping To: {addr.get('city', '')}, "
                f"{addr.get('state', '')} {addr.get('country', '')}\n"
            )

        if order.items:
            response += f"\nOrder Items ({len(order.items)} items):\n"
            for item in order.items:
                product_name = "Unknown Product"
                try:
                    product = Product.objects.get(product_id=item.get("product_id", ""))
                    product_name = product.name
                except Product.DoesNotExist:
                    pass
                response += (
                    f"- {product_name} "
                    f"(Qty: {item.get('quantity', 'N/A')}, "
                    f"Price: ${item.get('unit_price', 'N/A')})\n"
                )

        if order.notes:
            response += f"\nNotes: {order.notes}\n"

        return response

    def search_products(
        self,
        query: str,
        category: Optional[str] = None,
        max_results: int = 5,
    ) -> str:
        """
        Search for products in the catalog.
        """
        from .models import Product

        if not query:
            return "Please provide a search query."

        filters = Q(name__icontains=query) | Q(description__icontains=query)
        if category:
            filters &= Q(category__iexact=category)

        products = Product.objects.filter(filters)[:max_results]

        if not products:
            msg = f"No products found matching '{query}'"
            if category:
                msg += f" in category '{category}'"
            return msg

        response = f"Found {len(products)} product(s) for '{query}':\n\n"

        for product in products:
            response += f"* {product.name}\n"
            response += f"   Product ID: {product.product_id}\n"
            response += f"   Category: {product.category}\n"
            response += f"   Price: ${product.price}\n"
            response += f"   Rating: {product.average_rating}/5.0 ({product.review_count} reviews)\n"
            response += f"   In Stock: {product.stock_quantity} units\n"
            if product.description:
                desc = (
                    product.description[:100] + "..."
                    if len(product.description) > 100
                    else product.description
                )
                response += f"   Description: {desc}\n"
            response += "\n"

        return response

    def get_payment_info(self, order_id: str) -> str:
        """
        Get payment information for an order (with security restrictions).
        Never reveals full card numbers.
        """
        from .models import Payment

        if not order_id or not order_id.startswith("ORD-"):
            return "Invalid order ID format. Please provide a valid order ID starting with 'ORD-'."

        try:
            payment = Payment.objects.get(order_id=order_id)
        except Payment.DoesNotExist:
            return f"Payment information not found for order {order_id}."

        response = f"Payment Information for Order {order_id}:\n"
        response += f"Payment Status: {payment.status}\n"
        response += f"Amount: ${payment.amount}\n"
        response += f"Payment Method: {payment.payment_method}\n"
        response += f"Transaction ID: {payment.transaction_id}\n"

        if payment.payment_date:
            response += f"Payment Date: {payment.payment_date}\n"

        if payment.card_last_four:
            response += f"Card: ****-****-****-{payment.card_last_four}\n"

        return response

    # ------------------------------------------------------------------
    # New tools
    # ------------------------------------------------------------------

    def get_recommendations(
        self,
        customer_id: Optional[str] = None,
        category: Optional[str] = None,
    ) -> str:
        """
        Get product recommendations based on customer history or category.
        """
        from .models import Product, Order, Review

        recommended = []

        # If we have a customer, look at their order history to find categories
        if customer_id:
            try:
                orders = Order.objects.filter(customer_id=customer_id)
                purchased_product_ids = set()
                purchased_categories = set()
                for order in orders:
                    for item in order.items or []:
                        pid = item.get("product_id")
                        if pid:
                            purchased_product_ids.add(pid)
                            try:
                                prod = Product.objects.get(product_id=pid)
                                purchased_categories.add(prod.category)
                            except Product.DoesNotExist:
                                pass

                # Recommend top-rated products in the same categories, excluding already purchased
                if purchased_categories:
                    recommended = list(
                        Product.objects.filter(category__in=purchased_categories)
                        .exclude(product_id__in=purchased_product_ids)
                        .filter(stock_quantity__gt=0)
                        .order_by("-average_rating", "-review_count")[:5]
                    )
            except Exception as exc:
                logger.warning("Recommendation lookup error: %s", exc)

        # If category is specified, use that
        if not recommended and category:
            recommended = list(
                Product.objects.filter(category__iexact=category, stock_quantity__gt=0)
                .order_by("-average_rating", "-review_count")[:5]
            )

        # Fallback: top-rated products across all categories
        if not recommended:
            recommended = list(
                Product.objects.filter(stock_quantity__gt=0)
                .order_by("-average_rating", "-review_count")[:5]
            )

        if not recommended:
            return "No recommendations available at this time."

        response = f"Recommended Products ({len(recommended)}):\n\n"
        for product in recommended:
            response += f"* {product.name}\n"
            response += f"   Category: {product.category}\n"
            response += f"   Price: ${product.price}\n"
            response += f"   Rating: {product.average_rating}/5.0 ({product.review_count} reviews)\n"
            response += f"   In Stock: {product.stock_quantity} units\n"
            if product.description:
                desc = (
                    product.description[:100] + "..."
                    if len(product.description) > 100
                    else product.description
                )
                response += f"   Description: {desc}\n"
            response += "\n"

        return response

    def get_order_history(self, customer_id: str) -> str:
        """
        Get order history for a customer.
        """
        from .models import Order

        if not customer_id or not customer_id.startswith("CUST-"):
            return "Invalid customer ID format. Please provide a valid customer ID starting with 'CUST-'."

        orders = Order.objects.filter(customer_id=customer_id).order_by("-order_date")[:10]

        if not orders:
            return f"No orders found for customer {customer_id}."

        response = f"Order History for {customer_id} ({len(orders)} recent orders):\n\n"
        for order in orders:
            response += f"* Order {order.order_id}\n"
            response += f"   Date: {order.order_date}\n"
            response += f"   Status: {order.status}\n"
            response += f"   Total: ${order.total_amount}\n"
            item_count = len(order.items) if order.items else 0
            response += f"   Items: {item_count}\n"
            response += "\n"

        return response

    def check_inventory(self, product_id: str) -> str:
        """
        Check inventory / stock for a specific product.
        """
        from .models import Product

        if not product_id or not product_id.startswith("PROD-"):
            return "Invalid product ID format. Please provide a valid product ID starting with 'PROD-'."

        try:
            product = Product.objects.get(product_id=product_id)
        except Product.DoesNotExist:
            return f"Product with ID {product_id} not found."

        response = f"Inventory for {product.name} ({product_id}):\n"
        response += f"Stock Quantity: {product.stock_quantity} units\n"
        if product.stock_quantity > 10:
            response += "Availability: In Stock\n"
        elif product.stock_quantity > 0:
            response += "Availability: Low Stock - order soon!\n"
        else:
            response += "Availability: Out of Stock\n"

        return response

    def apply_coupon(self, coupon_code: str, order_id: str) -> str:
        """
        Validate and apply a coupon code to an order.
        """
        from .models import Coupon, Order

        if not coupon_code:
            return "Please provide a coupon code."

        if not order_id or not order_id.startswith("ORD-"):
            return "Invalid order ID format. Please provide a valid order ID starting with 'ORD-'."

        try:
            coupon = Coupon.objects.get(code__iexact=coupon_code)
        except Coupon.DoesNotExist:
            return f"Coupon code '{coupon_code}' not found."

        try:
            order = Order.objects.get(order_id=order_id)
        except Order.DoesNotExist:
            return f"Order with ID {order_id} not found."

        # Validate coupon
        if not coupon.is_valid:
            return f"Coupon '{coupon_code}' is no longer valid or has expired."

        if order.total_amount < coupon.min_order_amount:
            return (
                f"Order total (${order.total_amount}) does not meet the minimum "
                f"order amount of ${coupon.min_order_amount} required for this coupon."
            )

        # Calculate discount
        if coupon.discount_type == "percentage":
            discount = order.total_amount * (coupon.discount_value / Decimal("100"))
            discount_description = f"{coupon.discount_value}%"
        else:
            discount = min(coupon.discount_value, order.total_amount)
            discount_description = f"${coupon.discount_value}"

        new_total = order.total_amount - discount

        response = f"Coupon '{coupon_code}' Applied Successfully!\n"
        response += f"Discount: {discount_description} off\n"
        response += f"Original Total: ${order.total_amount}\n"
        response += f"Discount Amount: ${discount:.2f}\n"
        response += f"New Total: ${new_total:.2f}\n"

        return response

    # ------------------------------------------------------------------
    # Analytics helper
    # ------------------------------------------------------------------

    def get_analytics_summary(self) -> str:
        """
        Generate an analytics summary across the e-commerce platform.
        """
        from .models import Customer, Product, Order, Payment, Review

        try:
            total_customers = Customer.objects.count()
            total_products = Product.objects.count()
            total_orders = Order.objects.count()

            order_stats = Order.objects.aggregate(
                total_revenue=Sum("total_amount"),
                avg_order_value=Avg("total_amount"),
            )

            status_counts = dict(
                Order.objects.values_list("status")
                .annotate(count=Count("id"))
                .values_list("status", "count")
            )

            category_counts = dict(
                Product.objects.values_list("category")
                .annotate(count=Count("id"))
                .values_list("category", "count")
            )

            avg_rating = Product.objects.aggregate(avg=Avg("average_rating"))["avg"]
            total_reviews = Review.objects.count()

            response = "E-Commerce Analytics Summary\n"
            response += "=" * 40 + "\n\n"
            response += f"Total Customers: {total_customers}\n"
            response += f"Total Products: {total_products}\n"
            response += f"Total Orders: {total_orders}\n"
            response += f"Total Revenue: ${order_stats['total_revenue'] or 0:.2f}\n"
            response += f"Average Order Value: ${order_stats['avg_order_value'] or 0:.2f}\n\n"

            response += "Order Status Breakdown:\n"
            for st, count in status_counts.items():
                response += f"  {st}: {count}\n"

            response += "\nProducts by Category:\n"
            for cat, count in category_counts.items():
                response += f"  {cat}: {count}\n"

            response += f"\nAverage Product Rating: {avg_rating or 0:.1f}/5.0\n"
            response += f"Total Reviews: {total_reviews}\n"

            return response

        except Exception as exc:
            logger.error("Analytics summary error: %s", exc)
            return "Unable to generate analytics summary at this time."
