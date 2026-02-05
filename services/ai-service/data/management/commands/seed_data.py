"""
Management command to seed the database with sample e-commerce data.

Usage:
    python manage.py seed_data
    python manage.py seed_data --clear   # wipe existing data first
"""

from datetime import date, datetime, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from tools.models import Customer, Product, Order, Payment, Coupon, Review


class Command(BaseCommand):
    help = "Seed the database with sample e-commerce data for demo and testing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all existing data before seeding.",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write("Clearing existing data...")
            Review.objects.all().delete()
            Payment.objects.all().delete()
            Order.objects.all().delete()
            Product.objects.all().delete()
            Customer.objects.all().delete()
            Coupon.objects.all().delete()
            self.stdout.write(self.style.WARNING("All existing data cleared."))

        self.stdout.write("Seeding customers...")
        self._seed_customers()

        self.stdout.write("Seeding products...")
        self._seed_products()

        self.stdout.write("Seeding orders...")
        self._seed_orders()

        self.stdout.write("Seeding payments...")
        self._seed_payments()

        self.stdout.write("Seeding coupons...")
        self._seed_coupons()

        self.stdout.write("Seeding reviews...")
        self._seed_reviews()

        self.stdout.write(self.style.SUCCESS("Database seeding complete!"))
        self._print_summary()

    # ------------------------------------------------------------------
    # Customers (12)
    # ------------------------------------------------------------------

    def _seed_customers(self):
        customers = [
            {
                "customer_id": "CUST-2001",
                "full_name": "John Doe",
                "email": "john.doe@example.com",
                "phone_primary": "+1-555-0123",
                "account_status": "active",
                "loyalty_tier": "Gold",
                "loyalty_points": 1250,
                "home_address": {"city": "San Francisco", "state": "CA", "country": "USA"},
            },
            {
                "customer_id": "CUST-2002",
                "full_name": "Jane Smith",
                "email": "jane.smith@example.com",
                "phone_primary": "+1-555-0456",
                "account_status": "active",
                "loyalty_tier": "Platinum",
                "loyalty_points": 3500,
                "home_address": {"city": "New York", "state": "NY", "country": "USA"},
            },
            {
                "customer_id": "CUST-2003",
                "full_name": "Robert Johnson",
                "email": "robert.j@example.com",
                "phone_primary": "+1-555-0789",
                "account_status": "active",
                "loyalty_tier": "Silver",
                "loyalty_points": 750,
                "home_address": {"city": "Chicago", "state": "IL", "country": "USA"},
            },
            {
                "customer_id": "CUST-2004",
                "full_name": "Emily Davis",
                "email": "emily.d@example.com",
                "phone_primary": "+1-555-0321",
                "account_status": "active",
                "loyalty_tier": "Gold",
                "loyalty_points": 2100,
                "home_address": {"city": "Austin", "state": "TX", "country": "USA"},
            },
            {
                "customer_id": "CUST-2005",
                "full_name": "Michael Brown",
                "email": "michael.b@example.com",
                "phone_primary": "+1-555-0654",
                "account_status": "active",
                "loyalty_tier": "Bronze",
                "loyalty_points": 200,
                "home_address": {"city": "Seattle", "state": "WA", "country": "USA"},
            },
            {
                "customer_id": "CUST-2006",
                "full_name": "Sarah Wilson",
                "email": "sarah.w@example.com",
                "phone_primary": "+1-555-0987",
                "account_status": "active",
                "loyalty_tier": "Gold",
                "loyalty_points": 1800,
                "home_address": {"city": "Boston", "state": "MA", "country": "USA"},
            },
            {
                "customer_id": "CUST-2007",
                "full_name": "David Lee",
                "email": "david.lee@example.com",
                "phone_primary": "+1-555-1111",
                "account_status": "active",
                "loyalty_tier": "Silver",
                "loyalty_points": 900,
                "home_address": {"city": "Los Angeles", "state": "CA", "country": "USA"},
            },
            {
                "customer_id": "CUST-2008",
                "full_name": "Lisa Anderson",
                "email": "lisa.a@example.com",
                "phone_primary": "+1-555-2222",
                "account_status": "inactive",
                "loyalty_tier": "Bronze",
                "loyalty_points": 50,
                "home_address": {"city": "Denver", "state": "CO", "country": "USA"},
            },
            {
                "customer_id": "CUST-2009",
                "full_name": "James Taylor",
                "email": "james.t@example.com",
                "phone_primary": "+1-555-3333",
                "account_status": "active",
                "loyalty_tier": "Platinum",
                "loyalty_points": 5200,
                "home_address": {"city": "Miami", "state": "FL", "country": "USA"},
            },
            {
                "customer_id": "CUST-2010",
                "full_name": "Maria Garcia",
                "email": "maria.g@example.com",
                "phone_primary": "+1-555-4444",
                "account_status": "active",
                "loyalty_tier": "Gold",
                "loyalty_points": 1600,
                "home_address": {"city": "Phoenix", "state": "AZ", "country": "USA"},
            },
            {
                "customer_id": "CUST-2011",
                "full_name": "Thomas Martinez",
                "email": "thomas.m@example.com",
                "phone_primary": "+1-555-5555",
                "account_status": "active",
                "loyalty_tier": "Silver",
                "loyalty_points": 680,
                "home_address": {"city": "Portland", "state": "OR", "country": "USA"},
            },
            {
                "customer_id": "CUST-2012",
                "full_name": "Jennifer White",
                "email": "jennifer.w@example.com",
                "phone_primary": "+1-555-6666",
                "account_status": "suspended",
                "loyalty_tier": "Bronze",
                "loyalty_points": 0,
                "home_address": {"city": "Atlanta", "state": "GA", "country": "USA"},
            },
        ]

        for data in customers:
            Customer.objects.update_or_create(
                customer_id=data["customer_id"], defaults=data
            )

    # ------------------------------------------------------------------
    # Products (25)
    # ------------------------------------------------------------------

    def _seed_products(self):
        products = [
            # Electronics (8)
            {
                "product_id": "PROD-1001",
                "name": "Premium Smartphone",
                "category": "Electronics",
                "price": Decimal("999.99"),
                "stock_quantity": 50,
                "description": "Latest flagship smartphone with advanced AI camera, 6.7-inch OLED display, 256GB storage, and all-day battery life.",
                "average_rating": Decimal("4.5"),
                "review_count": 234,
                "image_url": "https://images.example.com/smartphone.jpg",
                "specifications": {"screen": "6.7 inch OLED", "storage": "256GB", "ram": "12GB", "battery": "5000mAh"},
            },
            {
                "product_id": "PROD-1002",
                "name": "Wireless Noise-Canceling Headphones",
                "category": "Electronics",
                "price": Decimal("349.99"),
                "stock_quantity": 100,
                "description": "Premium noise-canceling wireless headphones with 30-hour battery life, spatial audio, and adaptive sound control.",
                "average_rating": Decimal("4.7"),
                "review_count": 567,
                "image_url": "https://images.example.com/headphones.jpg",
                "specifications": {"driver": "40mm", "battery": "30 hours", "bluetooth": "5.3", "weight": "250g"},
            },
            {
                "product_id": "PROD-1003",
                "name": "Ultra-Thin Laptop Pro",
                "category": "Electronics",
                "price": Decimal("1499.99"),
                "stock_quantity": 30,
                "description": "Professional laptop with M3 chip, 16GB RAM, 512GB SSD, 14-inch Liquid Retina display, and 18-hour battery.",
                "average_rating": Decimal("4.8"),
                "review_count": 189,
                "image_url": "https://images.example.com/laptop.jpg",
                "specifications": {"processor": "M3", "ram": "16GB", "storage": "512GB SSD", "screen": "14 inch"},
            },
            {
                "product_id": "PROD-1004",
                "name": "Smart Watch Series 5",
                "category": "Electronics",
                "price": Decimal("449.99"),
                "stock_quantity": 75,
                "description": "Advanced smartwatch with health monitoring, GPS, always-on display, and water resistance to 50m.",
                "average_rating": Decimal("4.4"),
                "review_count": 312,
                "image_url": "https://images.example.com/smartwatch.jpg",
                "specifications": {"display": "AMOLED", "battery": "36 hours", "water_resistance": "50m"},
            },
            {
                "product_id": "PROD-1005",
                "name": "4K Ultra HD Smart TV 65\"",
                "category": "Electronics",
                "price": Decimal("1299.99"),
                "stock_quantity": 20,
                "description": "65-inch 4K Ultra HD Smart TV with HDR10+, Dolby Atmos, and built-in streaming apps.",
                "average_rating": Decimal("4.6"),
                "review_count": 456,
                "image_url": "https://images.example.com/tv.jpg",
                "specifications": {"resolution": "3840x2160", "hdr": "HDR10+", "refresh": "120Hz"},
            },
            {
                "product_id": "PROD-1006",
                "name": "Wireless Earbuds Pro",
                "category": "Electronics",
                "price": Decimal("199.99"),
                "stock_quantity": 150,
                "description": "True wireless earbuds with active noise cancellation, spatial audio, and 6-hour battery per charge.",
                "average_rating": Decimal("4.3"),
                "review_count": 789,
                "image_url": "https://images.example.com/earbuds.jpg",
                "specifications": {"battery": "6 hours (+24 case)", "driver": "11mm", "anc": "yes"},
            },
            {
                "product_id": "PROD-1007",
                "name": "Portable Bluetooth Speaker",
                "category": "Electronics",
                "price": Decimal("129.99"),
                "stock_quantity": 200,
                "description": "Waterproof portable Bluetooth speaker with 360-degree sound, 12-hour battery, and rugged design.",
                "average_rating": Decimal("4.5"),
                "review_count": 345,
                "image_url": "https://images.example.com/speaker.jpg",
                "specifications": {"battery": "12 hours", "waterproof": "IP67", "weight": "680g"},
            },
            {
                "product_id": "PROD-1008",
                "name": "Gaming Console X",
                "category": "Electronics",
                "price": Decimal("499.99"),
                "stock_quantity": 40,
                "description": "Next-gen gaming console with 4K gaming at 120fps, 1TB SSD, and backward compatibility.",
                "average_rating": Decimal("4.7"),
                "review_count": 621,
                "image_url": "https://images.example.com/console.jpg",
                "specifications": {"storage": "1TB SSD", "resolution": "4K", "fps": "120"},
            },
            # Clothing (5)
            {
                "product_id": "PROD-2001",
                "name": "Premium Cotton T-Shirt",
                "category": "Clothing",
                "price": Decimal("39.99"),
                "stock_quantity": 500,
                "description": "Ultra-soft 100% organic cotton t-shirt, available in 12 colors. Machine washable.",
                "average_rating": Decimal("4.2"),
                "review_count": 1200,
                "image_url": "https://images.example.com/tshirt.jpg",
                "specifications": {"material": "100% organic cotton", "sizes": "XS-3XL"},
            },
            {
                "product_id": "PROD-2002",
                "name": "Slim Fit Jeans",
                "category": "Clothing",
                "price": Decimal("79.99"),
                "stock_quantity": 300,
                "description": "Classic slim fit jeans with stretch comfort. Dark wash with modern tapered leg.",
                "average_rating": Decimal("4.1"),
                "review_count": 890,
                "image_url": "https://images.example.com/jeans.jpg",
                "specifications": {"material": "98% cotton, 2% elastane", "fit": "slim"},
            },
            {
                "product_id": "PROD-2003",
                "name": "Waterproof Winter Jacket",
                "category": "Clothing",
                "price": Decimal("199.99"),
                "stock_quantity": 120,
                "description": "Insulated waterproof jacket with removable hood. Rated to -20C. Multiple pockets.",
                "average_rating": Decimal("4.6"),
                "review_count": 345,
                "image_url": "https://images.example.com/jacket.jpg",
                "specifications": {"insulation": "synthetic", "waterproof": "10000mm", "temp_rating": "-20C"},
            },
            {
                "product_id": "PROD-2004",
                "name": "Running Sneakers Ultra",
                "category": "Clothing",
                "price": Decimal("149.99"),
                "stock_quantity": 250,
                "description": "Lightweight running shoes with responsive cushioning, breathable mesh, and durable outsole.",
                "average_rating": Decimal("4.4"),
                "review_count": 567,
                "image_url": "https://images.example.com/sneakers.jpg",
                "specifications": {"weight": "280g", "drop": "8mm", "cushioning": "responsive foam"},
            },
            {
                "product_id": "PROD-2005",
                "name": "Casual Dress Shirt",
                "category": "Clothing",
                "price": Decimal("59.99"),
                "stock_quantity": 180,
                "description": "Wrinkle-free button-down dress shirt in a modern fit. Perfect for office or casual wear.",
                "average_rating": Decimal("4.0"),
                "review_count": 234,
                "image_url": "https://images.example.com/shirt.jpg",
                "specifications": {"material": "100% cotton", "care": "machine wash", "fit": "modern"},
            },
            # Home (5)
            {
                "product_id": "PROD-3001",
                "name": "Robot Vacuum Cleaner",
                "category": "Home",
                "price": Decimal("599.99"),
                "stock_quantity": 60,
                "description": "Smart robot vacuum with LIDAR navigation, auto-emptying dock, and app control.",
                "average_rating": Decimal("4.5"),
                "review_count": 423,
                "image_url": "https://images.example.com/vacuum.jpg",
                "specifications": {"suction": "5000Pa", "battery": "180 min", "mapping": "LIDAR"},
            },
            {
                "product_id": "PROD-3002",
                "name": "Ergonomic Office Chair",
                "category": "Home",
                "price": Decimal("449.99"),
                "stock_quantity": 45,
                "description": "Premium ergonomic office chair with lumbar support, adjustable armrests, and breathable mesh back.",
                "average_rating": Decimal("4.3"),
                "review_count": 278,
                "image_url": "https://images.example.com/chair.jpg",
                "specifications": {"weight_capacity": "300 lbs", "adjustable_height": "yes", "material": "mesh"},
            },
            {
                "product_id": "PROD-3003",
                "name": "Smart Air Purifier",
                "category": "Home",
                "price": Decimal("299.99"),
                "stock_quantity": 80,
                "description": "HEPA air purifier with smart sensors, app control, and coverage up to 1000 sq ft.",
                "average_rating": Decimal("4.4"),
                "review_count": 189,
                "image_url": "https://images.example.com/purifier.jpg",
                "specifications": {"filter": "True HEPA", "coverage": "1000 sq ft", "noise": "25 dB"},
            },
            {
                "product_id": "PROD-3004",
                "name": "Stainless Steel Cookware Set",
                "category": "Home",
                "price": Decimal("249.99"),
                "stock_quantity": 90,
                "description": "10-piece stainless steel cookware set with tri-ply construction. Oven and dishwasher safe.",
                "average_rating": Decimal("4.6"),
                "review_count": 567,
                "image_url": "https://images.example.com/cookware.jpg",
                "specifications": {"pieces": 10, "material": "tri-ply stainless steel", "oven_safe": "500F"},
            },
            {
                "product_id": "PROD-3005",
                "name": "Smart LED Light Bulbs (4-pack)",
                "category": "Home",
                "price": Decimal("49.99"),
                "stock_quantity": 400,
                "description": "WiFi-enabled color-changing LED bulbs. Compatible with Alexa and Google Home. 16 million colors.",
                "average_rating": Decimal("4.2"),
                "review_count": 890,
                "image_url": "https://images.example.com/bulbs.jpg",
                "specifications": {"wattage": "9W (60W equiv)", "lumens": 800, "colors": "16 million"},
            },
            # Books (4)
            {
                "product_id": "PROD-4001",
                "name": "The Art of Clean Code",
                "category": "Books",
                "price": Decimal("34.99"),
                "stock_quantity": 200,
                "description": "A comprehensive guide to writing clean, maintainable code. Covers principles, patterns, and best practices.",
                "average_rating": Decimal("4.7"),
                "review_count": 1456,
                "image_url": "https://images.example.com/cleancode.jpg",
                "specifications": {"pages": 464, "format": "paperback", "language": "English"},
            },
            {
                "product_id": "PROD-4002",
                "name": "Machine Learning Fundamentals",
                "category": "Books",
                "price": Decimal("49.99"),
                "stock_quantity": 150,
                "description": "In-depth introduction to machine learning algorithms, neural networks, and practical applications.",
                "average_rating": Decimal("4.5"),
                "review_count": 678,
                "image_url": "https://images.example.com/mlbook.jpg",
                "specifications": {"pages": 592, "format": "hardcover", "language": "English"},
            },
            {
                "product_id": "PROD-4003",
                "name": "Cooking for Beginners",
                "category": "Books",
                "price": Decimal("24.99"),
                "stock_quantity": 350,
                "description": "Easy-to-follow cookbook with 200+ recipes for beginners. Includes meal planning tips and nutrition info.",
                "average_rating": Decimal("4.3"),
                "review_count": 345,
                "image_url": "https://images.example.com/cookbook.jpg",
                "specifications": {"pages": 320, "format": "paperback", "recipes": "200+"},
            },
            {
                "product_id": "PROD-4004",
                "name": "Science Fiction Anthology 2024",
                "category": "Books",
                "price": Decimal("19.99"),
                "stock_quantity": 500,
                "description": "Collection of award-winning science fiction short stories from the world's best authors.",
                "average_rating": Decimal("4.1"),
                "review_count": 234,
                "image_url": "https://images.example.com/scifi.jpg",
                "specifications": {"pages": 448, "format": "paperback", "stories": 25},
            },
            # Sports (3)
            {
                "product_id": "PROD-5001",
                "name": "Yoga Mat Premium",
                "category": "Sports",
                "price": Decimal("69.99"),
                "stock_quantity": 300,
                "description": "Extra-thick 6mm yoga mat with non-slip surface. Eco-friendly TPE material. Includes carrying strap.",
                "average_rating": Decimal("4.5"),
                "review_count": 456,
                "image_url": "https://images.example.com/yogamat.jpg",
                "specifications": {"thickness": "6mm", "material": "TPE", "size": "72x24 inches"},
            },
            {
                "product_id": "PROD-5002",
                "name": "Adjustable Dumbbell Set",
                "category": "Sports",
                "price": Decimal("299.99"),
                "stock_quantity": 70,
                "description": "Adjustable dumbbells from 5-52.5 lbs each. Quick-change weight system. Space-saving design.",
                "average_rating": Decimal("4.6"),
                "review_count": 321,
                "image_url": "https://images.example.com/dumbbells.jpg",
                "specifications": {"weight_range": "5-52.5 lbs", "increments": "2.5 lbs", "pairs": "yes"},
            },
            {
                "product_id": "PROD-5003",
                "name": "Mountain Bike Trail Pro",
                "category": "Sports",
                "price": Decimal("899.99"),
                "stock_quantity": 15,
                "description": "Full-suspension mountain bike with 29-inch wheels, 21-speed Shimano gears, and hydraulic disc brakes.",
                "average_rating": Decimal("4.4"),
                "review_count": 167,
                "image_url": "https://images.example.com/bike.jpg",
                "specifications": {"wheel_size": "29 inch", "gears": "21-speed", "frame": "aluminum"},
            },
        ]

        for data in products:
            Product.objects.update_or_create(
                product_id=data["product_id"], defaults=data
            )

    # ------------------------------------------------------------------
    # Orders (18)
    # ------------------------------------------------------------------

    def _seed_orders(self):
        today = date.today()
        orders = [
            {
                "order_id": "ORD-10001",
                "customer_id": "CUST-2001",
                "status": "shipped",
                "order_date": today - timedelta(days=5),
                "total_amount": Decimal("1302.26"),
                "tracking_number": "TRK123456789",
                "estimated_delivery_date": today + timedelta(days=2),
                "shipping_address": {"city": "San Francisco", "state": "CA", "country": "USA"},
                "items": [
                    {"product_id": "PROD-1001", "quantity": 1, "unit_price": 999.99},
                    {"product_id": "PROD-1002", "quantity": 1, "unit_price": 349.99},
                ],
                "notes": "",
            },
            {
                "order_id": "ORD-10002",
                "customer_id": "CUST-2002",
                "status": "delivered",
                "order_date": today - timedelta(days=14),
                "total_amount": Decimal("1499.99"),
                "tracking_number": "TRK987654321",
                "estimated_delivery_date": today - timedelta(days=7),
                "shipping_address": {"city": "New York", "state": "NY", "country": "USA"},
                "items": [
                    {"product_id": "PROD-1003", "quantity": 1, "unit_price": 1499.99},
                ],
                "notes": "Gift wrapping requested",
            },
            {
                "order_id": "ORD-10003",
                "customer_id": "CUST-2003",
                "status": "processing",
                "order_date": today - timedelta(days=1),
                "total_amount": Decimal("529.97"),
                "tracking_number": "",
                "estimated_delivery_date": today + timedelta(days=5),
                "shipping_address": {"city": "Chicago", "state": "IL", "country": "USA"},
                "items": [
                    {"product_id": "PROD-2001", "quantity": 3, "unit_price": 39.99},
                    {"product_id": "PROD-2002", "quantity": 2, "unit_price": 79.99},
                    {"product_id": "PROD-5001", "quantity": 1, "unit_price": 69.99},
                    {"product_id": "PROD-3005", "quantity": 2, "unit_price": 49.99},
                ],
                "notes": "",
            },
            {
                "order_id": "ORD-10004",
                "customer_id": "CUST-2004",
                "status": "delivered",
                "order_date": today - timedelta(days=21),
                "total_amount": Decimal("449.99"),
                "tracking_number": "TRK111222333",
                "estimated_delivery_date": today - timedelta(days=14),
                "shipping_address": {"city": "Austin", "state": "TX", "country": "USA"},
                "items": [
                    {"product_id": "PROD-1004", "quantity": 1, "unit_price": 449.99},
                ],
                "notes": "",
            },
            {
                "order_id": "ORD-10005",
                "customer_id": "CUST-2001",
                "status": "delivered",
                "order_date": today - timedelta(days=30),
                "total_amount": Decimal("1299.99"),
                "tracking_number": "TRK444555666",
                "estimated_delivery_date": today - timedelta(days=23),
                "shipping_address": {"city": "San Francisco", "state": "CA", "country": "USA"},
                "items": [
                    {"product_id": "PROD-1005", "quantity": 1, "unit_price": 1299.99},
                ],
                "notes": "Delivered to doorstep",
            },
            {
                "order_id": "ORD-10006",
                "customer_id": "CUST-2005",
                "status": "pending",
                "order_date": today,
                "total_amount": Decimal("199.99"),
                "tracking_number": "",
                "estimated_delivery_date": today + timedelta(days=7),
                "shipping_address": {"city": "Seattle", "state": "WA", "country": "USA"},
                "items": [
                    {"product_id": "PROD-1006", "quantity": 1, "unit_price": 199.99},
                ],
                "notes": "",
            },
            {
                "order_id": "ORD-10007",
                "customer_id": "CUST-2006",
                "status": "shipped",
                "order_date": today - timedelta(days=3),
                "total_amount": Decimal("849.98"),
                "tracking_number": "TRK777888999",
                "estimated_delivery_date": today + timedelta(days=1),
                "shipping_address": {"city": "Boston", "state": "MA", "country": "USA"},
                "items": [
                    {"product_id": "PROD-3001", "quantity": 1, "unit_price": 599.99},
                    {"product_id": "PROD-3003", "quantity": 1, "unit_price": 299.99},
                ],
                "notes": "",
            },
            {
                "order_id": "ORD-10008",
                "customer_id": "CUST-2007",
                "status": "processing",
                "order_date": today - timedelta(days=2),
                "total_amount": Decimal("499.99"),
                "tracking_number": "",
                "estimated_delivery_date": today + timedelta(days=4),
                "shipping_address": {"city": "Los Angeles", "state": "CA", "country": "USA"},
                "items": [
                    {"product_id": "PROD-1008", "quantity": 1, "unit_price": 499.99},
                ],
                "notes": "Express shipping requested",
            },
            {
                "order_id": "ORD-10009",
                "customer_id": "CUST-2009",
                "status": "delivered",
                "order_date": today - timedelta(days=10),
                "total_amount": Decimal("84.97"),
                "tracking_number": "TRK101112131",
                "estimated_delivery_date": today - timedelta(days=5),
                "shipping_address": {"city": "Miami", "state": "FL", "country": "USA"},
                "items": [
                    {"product_id": "PROD-4001", "quantity": 1, "unit_price": 34.99},
                    {"product_id": "PROD-4002", "quantity": 1, "unit_price": 49.99},
                ],
                "notes": "",
            },
            {
                "order_id": "ORD-10010",
                "customer_id": "CUST-2010",
                "status": "shipped",
                "order_date": today - timedelta(days=4),
                "total_amount": Decimal("299.99"),
                "tracking_number": "TRK141516171",
                "estimated_delivery_date": today + timedelta(days=3),
                "shipping_address": {"city": "Phoenix", "state": "AZ", "country": "USA"},
                "items": [
                    {"product_id": "PROD-5002", "quantity": 1, "unit_price": 299.99},
                ],
                "notes": "",
            },
            {
                "order_id": "ORD-10011",
                "customer_id": "CUST-2002",
                "status": "delivered",
                "order_date": today - timedelta(days=45),
                "total_amount": Decimal("279.98"),
                "tracking_number": "TRK181920212",
                "estimated_delivery_date": today - timedelta(days=38),
                "shipping_address": {"city": "New York", "state": "NY", "country": "USA"},
                "items": [
                    {"product_id": "PROD-2003", "quantity": 1, "unit_price": 199.99},
                    {"product_id": "PROD-2002", "quantity": 1, "unit_price": 79.99},
                ],
                "notes": "",
            },
            {
                "order_id": "ORD-10012",
                "customer_id": "CUST-2004",
                "status": "cancelled",
                "order_date": today - timedelta(days=8),
                "total_amount": Decimal("899.99"),
                "tracking_number": "",
                "estimated_delivery_date": None,
                "shipping_address": {"city": "Austin", "state": "TX", "country": "USA"},
                "items": [
                    {"product_id": "PROD-5003", "quantity": 1, "unit_price": 899.99},
                ],
                "notes": "Cancelled by customer",
            },
            {
                "order_id": "ORD-10013",
                "customer_id": "CUST-2011",
                "status": "processing",
                "order_date": today - timedelta(days=1),
                "total_amount": Decimal("129.99"),
                "tracking_number": "",
                "estimated_delivery_date": today + timedelta(days=6),
                "shipping_address": {"city": "Portland", "state": "OR", "country": "USA"},
                "items": [
                    {"product_id": "PROD-1007", "quantity": 1, "unit_price": 129.99},
                ],
                "notes": "",
            },
            {
                "order_id": "ORD-10014",
                "customer_id": "CUST-2009",
                "status": "shipped",
                "order_date": today - timedelta(days=6),
                "total_amount": Decimal("749.98"),
                "tracking_number": "TRK222324252",
                "estimated_delivery_date": today + timedelta(days=1),
                "shipping_address": {"city": "Miami", "state": "FL", "country": "USA"},
                "items": [
                    {"product_id": "PROD-3002", "quantity": 1, "unit_price": 449.99},
                    {"product_id": "PROD-3004", "quantity": 1, "unit_price": 249.99},
                ],
                "notes": "",
            },
            {
                "order_id": "ORD-10015",
                "customer_id": "CUST-2003",
                "status": "returned",
                "order_date": today - timedelta(days=25),
                "total_amount": Decimal("149.99"),
                "tracking_number": "TRK262728293",
                "estimated_delivery_date": today - timedelta(days=18),
                "shipping_address": {"city": "Chicago", "state": "IL", "country": "USA"},
                "items": [
                    {"product_id": "PROD-2004", "quantity": 1, "unit_price": 149.99},
                ],
                "notes": "Wrong size - return approved",
            },
            {
                "order_id": "ORD-10016",
                "customer_id": "CUST-2006",
                "status": "delivered",
                "order_date": today - timedelta(days=18),
                "total_amount": Decimal("59.98"),
                "tracking_number": "TRK303132333",
                "estimated_delivery_date": today - timedelta(days=12),
                "shipping_address": {"city": "Boston", "state": "MA", "country": "USA"},
                "items": [
                    {"product_id": "PROD-4003", "quantity": 1, "unit_price": 24.99},
                    {"product_id": "PROD-4004", "quantity": 1, "unit_price": 19.99},
                    {"product_id": "PROD-2001", "quantity": 1, "unit_price": 39.99},
                ],
                "notes": "",
            },
            {
                "order_id": "ORD-10017",
                "customer_id": "CUST-2007",
                "status": "pending",
                "order_date": today,
                "total_amount": Decimal("1549.98"),
                "tracking_number": "",
                "estimated_delivery_date": today + timedelta(days=8),
                "shipping_address": {"city": "Los Angeles", "state": "CA", "country": "USA"},
                "items": [
                    {"product_id": "PROD-1001", "quantity": 1, "unit_price": 999.99},
                    {"product_id": "PROD-1004", "quantity": 1, "unit_price": 449.99},
                    {"product_id": "PROD-3005", "quantity": 2, "unit_price": 49.99},
                ],
                "notes": "",
            },
            {
                "order_id": "ORD-10018",
                "customer_id": "CUST-2010",
                "status": "delivered",
                "order_date": today - timedelta(days=35),
                "total_amount": Decimal("449.99"),
                "tracking_number": "TRK343536373",
                "estimated_delivery_date": today - timedelta(days=28),
                "shipping_address": {"city": "Phoenix", "state": "AZ", "country": "USA"},
                "items": [
                    {"product_id": "PROD-3002", "quantity": 1, "unit_price": 449.99},
                ],
                "notes": "",
            },
        ]

        for data in orders:
            Order.objects.update_or_create(
                order_id=data["order_id"], defaults=data
            )

    # ------------------------------------------------------------------
    # Payments (18)
    # ------------------------------------------------------------------

    def _seed_payments(self):
        today = date.today()
        payments = [
            {"payment_id": "PAY-487291", "order_id": "ORD-10001", "status": "completed", "amount": Decimal("1302.26"), "payment_method": "credit_card", "transaction_id": "TXN-ABC123", "payment_date": today - timedelta(days=5), "card_last_four": "4242"},
            {"payment_id": "PAY-487292", "order_id": "ORD-10002", "status": "completed", "amount": Decimal("1499.99"), "payment_method": "credit_card", "transaction_id": "TXN-DEF456", "payment_date": today - timedelta(days=14), "card_last_four": "1234"},
            {"payment_id": "PAY-487293", "order_id": "ORD-10003", "status": "completed", "amount": Decimal("529.97"), "payment_method": "debit_card", "transaction_id": "TXN-GHI789", "payment_date": today - timedelta(days=1), "card_last_four": "5678"},
            {"payment_id": "PAY-487294", "order_id": "ORD-10004", "status": "completed", "amount": Decimal("449.99"), "payment_method": "paypal", "transaction_id": "TXN-JKL012", "payment_date": today - timedelta(days=21), "card_last_four": ""},
            {"payment_id": "PAY-487295", "order_id": "ORD-10005", "status": "completed", "amount": Decimal("1299.99"), "payment_method": "credit_card", "transaction_id": "TXN-MNO345", "payment_date": today - timedelta(days=30), "card_last_four": "9876"},
            {"payment_id": "PAY-487296", "order_id": "ORD-10006", "status": "pending", "amount": Decimal("199.99"), "payment_method": "credit_card", "transaction_id": "TXN-PQR678", "payment_date": today, "card_last_four": "3456"},
            {"payment_id": "PAY-487297", "order_id": "ORD-10007", "status": "completed", "amount": Decimal("849.98"), "payment_method": "credit_card", "transaction_id": "TXN-STU901", "payment_date": today - timedelta(days=3), "card_last_four": "7890"},
            {"payment_id": "PAY-487298", "order_id": "ORD-10008", "status": "completed", "amount": Decimal("499.99"), "payment_method": "apple_pay", "transaction_id": "TXN-VWX234", "payment_date": today - timedelta(days=2), "card_last_four": ""},
            {"payment_id": "PAY-487299", "order_id": "ORD-10009", "status": "completed", "amount": Decimal("84.97"), "payment_method": "debit_card", "transaction_id": "TXN-YZA567", "payment_date": today - timedelta(days=10), "card_last_four": "2345"},
            {"payment_id": "PAY-487300", "order_id": "ORD-10010", "status": "completed", "amount": Decimal("299.99"), "payment_method": "credit_card", "transaction_id": "TXN-BCD890", "payment_date": today - timedelta(days=4), "card_last_four": "6789"},
            {"payment_id": "PAY-487301", "order_id": "ORD-10011", "status": "completed", "amount": Decimal("279.98"), "payment_method": "credit_card", "transaction_id": "TXN-EFG123", "payment_date": today - timedelta(days=45), "card_last_four": "1357"},
            {"payment_id": "PAY-487302", "order_id": "ORD-10012", "status": "refunded", "amount": Decimal("899.99"), "payment_method": "credit_card", "transaction_id": "TXN-HIJ456", "payment_date": today - timedelta(days=8), "card_last_four": "2468"},
            {"payment_id": "PAY-487303", "order_id": "ORD-10013", "status": "completed", "amount": Decimal("129.99"), "payment_method": "google_pay", "transaction_id": "TXN-KLM789", "payment_date": today - timedelta(days=1), "card_last_four": ""},
            {"payment_id": "PAY-487304", "order_id": "ORD-10014", "status": "completed", "amount": Decimal("749.98"), "payment_method": "credit_card", "transaction_id": "TXN-NOP012", "payment_date": today - timedelta(days=6), "card_last_four": "8024"},
            {"payment_id": "PAY-487305", "order_id": "ORD-10015", "status": "refunded", "amount": Decimal("149.99"), "payment_method": "debit_card", "transaction_id": "TXN-QRS345", "payment_date": today - timedelta(days=25), "card_last_four": "1592"},
            {"payment_id": "PAY-487306", "order_id": "ORD-10016", "status": "completed", "amount": Decimal("59.98"), "payment_method": "credit_card", "transaction_id": "TXN-TUV678", "payment_date": today - timedelta(days=18), "card_last_four": "7531"},
            {"payment_id": "PAY-487307", "order_id": "ORD-10017", "status": "pending", "amount": Decimal("1549.98"), "payment_method": "credit_card", "transaction_id": "TXN-WXY901", "payment_date": today, "card_last_four": "8642"},
            {"payment_id": "PAY-487308", "order_id": "ORD-10018", "status": "completed", "amount": Decimal("449.99"), "payment_method": "paypal", "transaction_id": "TXN-ZAB234", "payment_date": today - timedelta(days=35), "card_last_four": ""},
        ]

        for data in payments:
            Payment.objects.update_or_create(
                payment_id=data["payment_id"], defaults=data
            )

    # ------------------------------------------------------------------
    # Coupons (7)
    # ------------------------------------------------------------------

    def _seed_coupons(self):
        now = timezone.now()
        coupons = [
            {
                "code": "WELCOME10",
                "discount_type": "percentage",
                "discount_value": Decimal("10"),
                "min_order_amount": Decimal("50"),
                "max_uses": 1000,
                "used_count": 342,
                "valid_from": now - timedelta(days=90),
                "valid_until": now + timedelta(days=90),
                "is_active": True,
            },
            {
                "code": "SUMMER25",
                "discount_type": "percentage",
                "discount_value": Decimal("25"),
                "min_order_amount": Decimal("100"),
                "max_uses": 500,
                "used_count": 198,
                "valid_from": now - timedelta(days=30),
                "valid_until": now + timedelta(days=60),
                "is_active": True,
            },
            {
                "code": "FLAT50",
                "discount_type": "fixed",
                "discount_value": Decimal("50"),
                "min_order_amount": Decimal("200"),
                "max_uses": 200,
                "used_count": 87,
                "valid_from": now - timedelta(days=15),
                "valid_until": now + timedelta(days=45),
                "is_active": True,
            },
            {
                "code": "LOYALTY15",
                "discount_type": "percentage",
                "discount_value": Decimal("15"),
                "min_order_amount": Decimal("75"),
                "max_uses": 300,
                "used_count": 156,
                "valid_from": now - timedelta(days=60),
                "valid_until": now + timedelta(days=30),
                "is_active": True,
            },
            {
                "code": "FREESHIP",
                "discount_type": "fixed",
                "discount_value": Decimal("15"),
                "min_order_amount": Decimal("25"),
                "max_uses": 2000,
                "used_count": 1023,
                "valid_from": now - timedelta(days=120),
                "valid_until": now + timedelta(days=60),
                "is_active": True,
            },
            {
                "code": "EXPIRED20",
                "discount_type": "percentage",
                "discount_value": Decimal("20"),
                "min_order_amount": Decimal("50"),
                "max_uses": 100,
                "used_count": 100,
                "valid_from": now - timedelta(days=180),
                "valid_until": now - timedelta(days=30),
                "is_active": False,
            },
            {
                "code": "VIP30",
                "discount_type": "percentage",
                "discount_value": Decimal("30"),
                "min_order_amount": Decimal("500"),
                "max_uses": 50,
                "used_count": 12,
                "valid_from": now - timedelta(days=7),
                "valid_until": now + timedelta(days=180),
                "is_active": True,
            },
        ]

        for data in coupons:
            Coupon.objects.update_or_create(
                code=data["code"], defaults=data
            )

    # ------------------------------------------------------------------
    # Reviews (24)
    # ------------------------------------------------------------------

    def _seed_reviews(self):
        reviews = [
            # Electronics reviews
            {"product_id": "PROD-1001", "customer_id": "CUST-2001", "rating": 5, "title": "Best phone I've ever owned", "content": "Amazing camera quality and battery life. The AI features are incredible. Worth every penny!", "is_verified_purchase": True},
            {"product_id": "PROD-1001", "customer_id": "CUST-2007", "rating": 4, "title": "Great phone, minor issues", "content": "Excellent performance overall. The camera is outstanding but gets a bit warm during long video recording.", "is_verified_purchase": True},
            {"product_id": "PROD-1002", "customer_id": "CUST-2001", "rating": 5, "title": "Incredible sound quality", "content": "The noise cancellation is top-notch. Perfect for flights and commuting. Battery lasts forever.", "is_verified_purchase": True},
            {"product_id": "PROD-1002", "customer_id": "CUST-2006", "rating": 4, "title": "Very comfortable", "content": "Wore these for 8 hours straight at work. Very comfortable and sound is amazing.", "is_verified_purchase": False},
            {"product_id": "PROD-1003", "customer_id": "CUST-2002", "rating": 5, "title": "Perfect for development work", "content": "Incredibly fast with the M3 chip. Display is gorgeous and battery easily lasts a full workday.", "is_verified_purchase": True},
            {"product_id": "PROD-1003", "customer_id": "CUST-2009", "rating": 5, "title": "Best laptop ever", "content": "Upgraded from an older model and the difference is night and day. Everything is snappy and responsive.", "is_verified_purchase": True},
            {"product_id": "PROD-1005", "customer_id": "CUST-2001", "rating": 4, "title": "Great picture quality", "content": "4K content looks stunning. The HDR really makes colors pop. Wish the built-in speakers were better.", "is_verified_purchase": True},
            {"product_id": "PROD-1008", "customer_id": "CUST-2007", "rating": 5, "title": "Gaming paradise", "content": "Load times are practically nonexistent. 4K gaming at 120fps is buttery smooth.", "is_verified_purchase": True},
            # Clothing reviews
            {"product_id": "PROD-2001", "customer_id": "CUST-2003", "rating": 4, "title": "Super soft cotton", "content": "Really comfortable and holds up well after multiple washes. Great value for the price.", "is_verified_purchase": True},
            {"product_id": "PROD-2002", "customer_id": "CUST-2003", "rating": 3, "title": "Good but runs small", "content": "Quality is great but definitely order a size up. The slim fit is very slim.", "is_verified_purchase": True},
            {"product_id": "PROD-2003", "customer_id": "CUST-2002", "rating": 5, "title": "Kept me warm in a blizzard", "content": "Wore this during a snowstorm and stayed completely warm and dry. Excellent quality.", "is_verified_purchase": True},
            {"product_id": "PROD-2004", "customer_id": "CUST-2003", "rating": 2, "title": "Too narrow for my feet", "content": "Good quality but very narrow. Had to return them. Go half a size up if you have wide feet.", "is_verified_purchase": True},
            # Home reviews
            {"product_id": "PROD-3001", "customer_id": "CUST-2006", "rating": 5, "title": "Life-changing appliance", "content": "This vacuum has changed my life. It maps my whole house perfectly and the auto-empty feature is genius.", "is_verified_purchase": True},
            {"product_id": "PROD-3002", "customer_id": "CUST-2009", "rating": 4, "title": "Very comfortable for long days", "content": "My back pain has significantly reduced since switching to this chair. Assembly took about 45 minutes.", "is_verified_purchase": True},
            {"product_id": "PROD-3002", "customer_id": "CUST-2010", "rating": 5, "title": "Worth every penny", "content": "Best office chair I've owned. The mesh back keeps you cool and the lumbar support is excellent.", "is_verified_purchase": True},
            {"product_id": "PROD-3004", "customer_id": "CUST-2004", "rating": 5, "title": "Professional quality cookware", "content": "Even heat distribution and very easy to clean. These are restaurant quality at a consumer price.", "is_verified_purchase": False},
            {"product_id": "PROD-3005", "customer_id": "CUST-2006", "rating": 3, "title": "Good but connectivity issues", "content": "The colors are great and the app is intuitive but I occasionally have WiFi connectivity drops.", "is_verified_purchase": True},
            # Books reviews
            {"product_id": "PROD-4001", "customer_id": "CUST-2009", "rating": 5, "title": "Must-read for every developer", "content": "This book completely changed how I approach coding. The examples are practical and easy to follow.", "is_verified_purchase": True},
            {"product_id": "PROD-4002", "customer_id": "CUST-2002", "rating": 4, "title": "Comprehensive but dense", "content": "Covers everything you need to know about ML. Some chapters are quite math-heavy but very thorough.", "is_verified_purchase": True},
            {"product_id": "PROD-4003", "customer_id": "CUST-2006", "rating": 5, "title": "Perfect for beginners!", "content": "As someone who barely knew how to boil water, this book has been incredible. Clear instructions and photos.", "is_verified_purchase": True},
            # Sports reviews
            {"product_id": "PROD-5001", "customer_id": "CUST-2004", "rating": 5, "title": "Best yoga mat I've used", "content": "Non-slip surface is amazing. Even during hot yoga I don't slide. The thickness provides great cushioning.", "is_verified_purchase": True},
            {"product_id": "PROD-5002", "customer_id": "CUST-2010", "rating": 4, "title": "Great home gym addition", "content": "Replaces an entire rack of dumbbells. The weight change mechanism is smooth and quick.", "is_verified_purchase": True},
            {"product_id": "PROD-5002", "customer_id": "CUST-2005", "rating": 5, "title": "Excellent quality", "content": "Built like a tank. I've been using these daily for 3 months with no issues. Space-saving design is a bonus.", "is_verified_purchase": False},
            {"product_id": "PROD-5003", "customer_id": "CUST-2011", "rating": 4, "title": "Great trail performance", "content": "Handles rough terrain well. The hydraulic brakes are responsive. Only downside is the weight.", "is_verified_purchase": True},
        ]

        for data in reviews:
            # Prevent duplicates on re-seed
            existing = Review.objects.filter(
                product_id=data["product_id"],
                customer_id=data["customer_id"],
                title=data["title"],
            ).first()
            if not existing:
                Review.objects.create(**data)

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------

    def _print_summary(self):
        self.stdout.write("\n--- Seed Data Summary ---")
        self.stdout.write(f"  Customers: {Customer.objects.count()}")
        self.stdout.write(f"  Products:  {Product.objects.count()}")
        self.stdout.write(f"  Orders:    {Order.objects.count()}")
        self.stdout.write(f"  Payments:  {Payment.objects.count()}")
        self.stdout.write(f"  Coupons:   {Coupon.objects.count()}")
        self.stdout.write(f"  Reviews:   {Review.objects.count()}")
        self.stdout.write("-------------------------\n")
