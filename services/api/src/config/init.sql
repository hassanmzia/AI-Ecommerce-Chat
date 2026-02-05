-- ============================================================
-- AI E-Commerce Chat System  -  Database Initialization
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- TABLES
-- ============================================================

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    phone           VARCHAR(50),
    role            VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    avatar_url      TEXT,
    loyalty_tier    VARCHAR(20) NOT NULL DEFAULT 'bronze' CHECK (loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum')),
    loyalty_points  INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Products
CREATE TABLE IF NOT EXISTS products (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id      VARCHAR(50) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    category        VARCHAR(100) NOT NULL,
    subcategory     VARCHAR(100),
    price           NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    sale_price      NUMERIC(12,2) CHECK (sale_price >= 0),
    stock_quantity  INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    description     TEXT,
    specifications  JSONB DEFAULT '{}',
    image_url       TEXT,
    images          JSONB DEFAULT '[]',
    average_rating  NUMERIC(3,2) DEFAULT 0 CHECK (average_rating >= 0 AND average_rating <= 5),
    review_count    INTEGER NOT NULL DEFAULT 0,
    is_featured     BOOLEAN NOT NULL DEFAULT false,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Orders
CREATE TABLE IF NOT EXISTS orders (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id                VARCHAR(50) NOT NULL UNIQUE,
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status                  VARCHAR(30) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','confirmed','processing','shipped','in_transit','out_for_delivery','delivered','cancelled','refunded','returned')),
    order_date              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_amount            NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
    subtotal                NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax                     NUMERIC(12,2) NOT NULL DEFAULT 0,
    shipping_cost           NUMERIC(12,2) NOT NULL DEFAULT 0,
    tracking_number         VARCHAR(100),
    estimated_delivery_date TIMESTAMPTZ,
    shipping_address        JSONB,
    billing_address         JSONB,
    items                   JSONB NOT NULL DEFAULT '[]',
    notes                   TEXT,
    coupon_code             VARCHAR(50),
    discount_amount         NUMERIC(12,2) DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Payments
CREATE TABLE IF NOT EXISTS payments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id      VARCHAR(50) NOT NULL UNIQUE,
    order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          VARCHAR(30) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','completed','failed','refunded')),
    amount          NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    payment_method  VARCHAR(50) NOT NULL,
    transaction_id  VARCHAR(100),
    payment_date    TIMESTAMPTZ,
    card_last_four  VARCHAR(4),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Conversations
CREATE TABLE IF NOT EXISTS conversations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(255),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Messages
CREATE TABLE IF NOT EXISTS messages (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id     UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role                VARCHAR(20) NOT NULL CHECK (role IN ('user','assistant','system','tool')),
    content             TEXT NOT NULL,
    tool_calls          JSONB,
    validation_status   VARCHAR(20) DEFAULT 'pending' CHECK (validation_status IN ('pending','valid','invalid','flagged')),
    metadata            JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Reviews
CREATE TABLE IF NOT EXISTS reviews (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating              INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title               VARCHAR(255),
    content             TEXT,
    is_verified_purchase BOOLEAN NOT NULL DEFAULT false,
    helpful_count       INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Coupons
CREATE TABLE IF NOT EXISTS coupons (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(50) NOT NULL UNIQUE,
    discount_type   VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage','fixed')),
    discount_value  NUMERIC(12,2) NOT NULL CHECK (discount_value > 0),
    min_order_amount NUMERIC(12,2) DEFAULT 0,
    max_uses        INTEGER DEFAULT NULL,
    used_count      INTEGER NOT NULL DEFAULT 0,
    valid_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until     TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Wishlist
CREATE TABLE IF NOT EXISTS wishlist (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- 10. Cart Items
CREATE TABLE IF NOT EXISTS cart_items (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL,
    title       VARCHAR(255) NOT NULL,
    message     TEXT NOT NULL,
    is_read     BOOLEAN NOT NULL DEFAULT false,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Analytics Events
CREATE TABLE IF NOT EXISTS analytics_events (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID,
    event_type  VARCHAR(100) NOT NULL,
    event_data  JSONB DEFAULT '{}',
    page_url    TEXT,
    session_id  VARCHAR(100),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Agent Executions
CREATE TABLE IF NOT EXISTS agent_executions (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_type        VARCHAR(100) NOT NULL,
    conversation_id   UUID REFERENCES conversations(id) ON DELETE SET NULL,
    input_data        JSONB DEFAULT '{}',
    output_data       JSONB DEFAULT '{}',
    status            VARCHAR(30) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','running','completed','failed','timeout')),
    execution_time_ms INTEGER,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Products
CREATE INDEX IF NOT EXISTS idx_products_product_id ON products(product_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products(subcategory);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_average_rating ON products(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin(name gin_trgm_ops);

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date DESC);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Conversations
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_is_active ON conversations(is_active);

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- Wishlist
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_id);

-- Cart Items
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Analytics Events
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);

-- Agent Executions
CREATE INDEX IF NOT EXISTS idx_agent_executions_agent_type ON agent_executions(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_executions_conversation_id ON agent_executions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_status ON agent_executions(status);
CREATE INDEX IF NOT EXISTS idx_agent_executions_created_at ON agent_executions(created_at DESC);

-- ============================================================
-- TRIGGER: auto-update updated_at columns
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at') THEN
        CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_products_updated_at') THEN
        CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_orders_updated_at') THEN
        CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_conversations_updated_at') THEN
        CREATE TRIGGER trg_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_reviews_updated_at') THEN
        CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_cart_items_updated_at') THEN
        CREATE TRIGGER trg_cart_items_updated_at BEFORE UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Passwords: all seeded users use "password123" hashed with bcryptjs
-- $2a$10$8K1p/a0dL1LXMIgYDE38Oe0tXezMOGnFSRGMmqU0OIpDmYvOaT8jG

-- Users
INSERT INTO users (id, email, password_hash, full_name, phone, role, avatar_url, loyalty_tier, loyalty_points, is_active) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'admin@ecommerce.com', '$2a$10$8K1p/a0dL1LXMIgYDE38Oe0tXezMOGnFSRGMmqU0OIpDmYvOaT8jG', 'Admin User', '+1-555-0100', 'admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', 'platinum', 15000, true),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'john.doe@email.com', '$2a$10$8K1p/a0dL1LXMIgYDE38Oe0tXezMOGnFSRGMmqU0OIpDmYvOaT8jG', 'John Doe', '+1-555-0101', 'user', 'https://api.dicebear.com/7.x/avataaars/svg?seed=john', 'gold', 8500, true),
('c3d4e5f6-a7b8-9012-cdef-123456789012', 'jane.smith@email.com', '$2a$10$8K1p/a0dL1LXMIgYDE38Oe0tXezMOGnFSRGMmqU0OIpDmYvOaT8jG', 'Jane Smith', '+1-555-0102', 'user', 'https://api.dicebear.com/7.x/avataaars/svg?seed=jane', 'silver', 4200, true),
('d4e5f6a7-b8c9-0123-defa-234567890123', 'bob.wilson@email.com', '$2a$10$8K1p/a0dL1LXMIgYDE38Oe0tXezMOGnFSRGMmqU0OIpDmYvOaT8jG', 'Bob Wilson', '+1-555-0103', 'user', 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob', 'bronze', 1200, true),
('e5f6a7b8-c9d0-1234-efab-345678901234', 'alice.johnson@email.com', '$2a$10$8K1p/a0dL1LXMIgYDE38Oe0tXezMOGnFSRGMmqU0OIpDmYvOaT8jG', 'Alice Johnson', '+1-555-0104', 'user', 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice', 'gold', 9100, true),
('f6a7b8c9-d0e1-2345-fabc-456789012345', 'charlie.brown@email.com', '$2a$10$8K1p/a0dL1LXMIgYDE38Oe0tXezMOGnFSRGMmqU0OIpDmYvOaT8jG', 'Charlie Brown', '+1-555-0105', 'user', 'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie', 'silver', 3600, true)
ON CONFLICT (email) DO NOTHING;

-- Products
INSERT INTO products (id, product_id, name, category, subcategory, price, sale_price, stock_quantity, description, specifications, image_url, images, average_rating, review_count, is_featured, is_active) VALUES
('11111111-1111-1111-1111-111111111111', 'PROD-001', 'Ultra HD Smart TV 65"', 'Electronics', 'Televisions', 1299.99, 999.99, 45, 'Experience stunning 4K Ultra HD resolution with HDR10+ support. This 65-inch smart TV features a sleek design, built-in streaming apps, and voice control compatibility.', '{"display": "65-inch 4K UHD", "resolution": "3840x2160", "hdr": "HDR10+, Dolby Vision", "smart_platform": "Built-in OS", "connectivity": "Wi-Fi 6, Bluetooth 5.2, HDMI 2.1 x4", "refresh_rate": "120Hz", "speakers": "20W Dolby Atmos"}', 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1', '["https://images.unsplash.com/photo-1593359677879-a4bb92f829d1", "https://images.unsplash.com/photo-1461151304267-38535e780c79"]', 4.70, 234, true, true),

('22222222-2222-2222-2222-222222222222', 'PROD-002', 'Wireless Noise-Cancelling Headphones Pro', 'Electronics', 'Audio', 349.99, NULL, 128, 'Premium wireless headphones with industry-leading active noise cancellation, 30-hour battery life, and Hi-Res Audio support. Luxurious memory foam ear cushions for all-day comfort.', '{"driver_size": "40mm", "frequency_response": "4Hz-40kHz", "noise_cancellation": "Adaptive ANC", "battery_life": "30 hours", "charging": "USB-C, Quick Charge (10min = 5hrs)", "bluetooth": "5.3 with multipoint", "weight": "254g", "codecs": "LDAC, AAC, SBC"}', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e', '["https://images.unsplash.com/photo-1505740420928-5e560c06d30e", "https://images.unsplash.com/photo-1484704849700-f032a568e944"]', 4.85, 567, true, true),

('33333333-3333-3333-3333-333333333333', 'PROD-003', 'Organic Cotton Crew Neck T-Shirt', 'Clothing', 'T-Shirts', 29.99, 24.99, 500, 'Classic crew neck t-shirt made from 100% certified organic cotton. Soft, breathable, and sustainably produced. Available in multiple colors.', '{"material": "100% Organic Cotton", "weight": "180gsm", "fit": "Regular", "sizes": "XS, S, M, L, XL, XXL", "colors": "White, Black, Navy, Grey, Olive", "care": "Machine wash cold", "certification": "GOTS Certified"}', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab', '["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab", "https://images.unsplash.com/photo-1562157873-818bc0726f68"]', 4.30, 189, false, true),

('44444444-4444-4444-4444-444444444444', 'PROD-004', 'Professional Running Shoes X-Sprint', 'Footwear', 'Running', 179.99, 149.99, 200, 'Engineered for serious runners with responsive ZoomX foam cushioning, breathable Flyknit upper, and carbon fiber plate for maximum energy return. Race-day performance meets everyday comfort.', '{"upper": "Flyknit 2.0", "midsole": "ZoomX Foam + Carbon Plate", "outsole": "Rubber Waffle", "drop": "8mm", "weight": "198g (size 10)", "sizes": "6-14 (incl. half sizes)", "width": "Standard, Wide"}', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff', '["https://images.unsplash.com/photo-1542291026-7eec264c27ff", "https://images.unsplash.com/photo-1460353581641-37baddab0fa2"]', 4.60, 312, true, true),

('55555555-5555-5555-5555-555555555555', 'PROD-005', 'Smart Home Hub Pro', 'Electronics', 'Smart Home', 199.99, NULL, 89, 'Central command for your smart home. Controls lights, thermostats, cameras, and 500+ compatible devices. Features a 7-inch touchscreen display and premium speaker.', '{"display": "7-inch HD touchscreen", "speaker": "Dual 2-inch drivers", "connectivity": "Wi-Fi 6, Bluetooth 5.0, Zigbee, Thread, Matter", "voice_assistants": "Built-in AI Assistant", "compatible_devices": "500+", "dimensions": "8.5 x 5.5 x 3.5 inches"}', 'https://images.unsplash.com/photo-1558089687-f282ffcbc126', '["https://images.unsplash.com/photo-1558089687-f282ffcbc126"]', 4.40, 156, true, true),

('66666666-6666-6666-6666-666666666666', 'PROD-006', 'Premium Leather Laptop Bag', 'Accessories', 'Bags', 189.99, 159.99, 75, 'Handcrafted full-grain leather laptop bag with padded compartment for up to 15.6" laptops. Features organizer pockets, detachable shoulder strap, and RFID-blocking pocket.', '{"material": "Full-Grain Leather", "laptop_size": "Up to 15.6 inches", "dimensions": "16 x 12 x 5 inches", "pockets": "8 compartments", "features": "RFID blocking, Padded laptop sleeve, Luggage strap", "weight": "1.2kg", "colors": "Brown, Black, Tan"}', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa', '["https://images.unsplash.com/photo-1548036328-c9fa89d128fa"]', 4.50, 98, false, true),

('77777777-7777-7777-7777-777777777777', 'PROD-007', 'Fitness Tracker Watch Ultra', 'Electronics', 'Wearables', 299.99, 249.99, 160, 'Advanced fitness tracker with AMOLED display, GPS, heart rate monitoring, SpO2, sleep tracking, and 14-day battery life. Water resistant to 50m with 100+ workout modes.', '{"display": "1.43-inch AMOLED", "battery_life": "14 days typical", "water_resistance": "5ATM (50m)", "sensors": "Heart rate, SpO2, Accelerometer, Gyroscope, Barometer, GPS", "workout_modes": "100+", "connectivity": "Bluetooth 5.2, NFC", "weight": "52g", "compatibility": "iOS 14+, Android 10+"}', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30', '["https://images.unsplash.com/photo-1523275335684-37898b6baf30"]', 4.55, 421, true, true),

('88888888-8888-8888-8888-888888888888', 'PROD-008', 'Espresso Machine Barista Elite', 'Home & Kitchen', 'Coffee Machines', 599.99, 499.99, 35, 'Professional-grade espresso machine with 15-bar pressure pump, built-in grinder with 30 settings, automatic milk frother, and PID temperature control. Makes cafe-quality beverages at home.', '{"pressure": "15 bar", "grinder": "Conical burr, 30 settings", "water_tank": "2L removable", "milk_frother": "Automatic with adjustable texture", "temperature_control": "PID", "dimensions": "14 x 11 x 16 inches", "weight": "8.5kg", "programs": "Espresso, Double, Americano, Latte, Cappuccino, Flat White"}', 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a', '["https://images.unsplash.com/photo-1510707577719-ae7c14805e3a"]', 4.75, 87, true, true),

('99999999-9999-9999-9999-999999999999', 'PROD-009', 'Yoga Mat Premium Eco', 'Sports', 'Yoga', 69.99, NULL, 250, 'Extra-thick 6mm yoga mat made from natural rubber with eco-friendly TPE surface. Non-slip on both sides, includes carrying strap and alignment marks.', '{"material": "Natural Rubber + TPE", "thickness": "6mm", "dimensions": "72 x 24 inches", "weight": "2.5kg", "features": "Non-slip dual surface, Alignment marks, Moisture resistant", "eco_certification": "OEKO-TEX Standard 100", "colors": "Purple, Teal, Charcoal, Rose"}', 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f', '["https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f"]', 4.25, 143, false, true),

('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PROD-010', 'Mechanical Keyboard RGB Pro', 'Electronics', 'Peripherals', 159.99, 129.99, 110, 'Premium mechanical keyboard with hot-swappable switches, per-key RGB lighting, aluminum frame, and programmable macros. USB-C with detachable cable.', '{"switches": "Hot-swappable (Cherry MX compatible)", "keycaps": "PBT Double-shot", "backlight": "Per-key RGB, 16.8M colors", "connectivity": "USB-C (detachable)", "anti_ghosting": "N-Key Rollover", "frame": "Aluminum top plate", "layout": "Full-size / TKL", "features": "Programmable macros, On-board memory"}', 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae', '["https://images.unsplash.com/photo-1511467687858-23d96c32e4ae"]', 4.65, 278, false, true),

('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'PROD-011', 'Wireless Gaming Mouse Ultra', 'Electronics', 'Peripherals', 129.99, NULL, 95, 'Ultra-lightweight wireless gaming mouse at just 58g. Features 25K DPI sensor, 70-hour battery, PTFE feet, and 5 programmable buttons.', '{"sensor": "25,600 DPI Optical", "weight": "58g", "battery": "70 hours", "buttons": "5 programmable", "connectivity": "2.4GHz wireless + Bluetooth", "polling_rate": "1000Hz", "feet": "100% PTFE", "rgb": "Underglow"}', 'https://images.unsplash.com/photo-1527814050087-3793815479db', '["https://images.unsplash.com/photo-1527814050087-3793815479db"]', 4.50, 195, false, true),

('cccccccc-cccc-cccc-cccc-cccccccccccc', 'PROD-012', 'Portable Bluetooth Speaker Boom', 'Electronics', 'Audio', 79.99, 59.99, 180, 'Rugged portable Bluetooth speaker with 360-degree sound, 20-hour battery, IP67 waterproof rating, and built-in power bank. Perfect for outdoor adventures.', '{"drivers": "Dual 45mm + passive radiators", "power": "30W", "battery": "20 hours", "waterproof": "IP67", "bluetooth": "5.3", "features": "Stereo pairing, Power bank (USB-A out)", "weight": "680g", "dimensions": "8.5 x 3.5 x 3.5 inches"}', 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1', '["https://images.unsplash.com/photo-1608043152269-423dbba4e7e1"]', 4.35, 264, false, true),

('dddddddd-dddd-dddd-dddd-dddddddddddd', 'PROD-013', 'Winter Down Parka Expedition', 'Clothing', 'Outerwear', 399.99, 329.99, 60, '800-fill goose down parka rated to -30C. Features waterproof outer shell, removable fur-trimmed hood, multiple insulated pockets, and adjustable storm cuffs.', '{"fill": "800-fill goose down", "shell": "Waterproof ripstop nylon", "temperature_rating": "-30C / -22F", "hood": "Removable, fur-trimmed", "pockets": "8 (4 exterior, 4 interior)", "sizes": "XS-3XL", "colors": "Black, Navy, Olive, Red"}', 'https://images.unsplash.com/photo-1544923246-77307dd270ce', '["https://images.unsplash.com/photo-1544923246-77307dd270ce"]', 4.80, 76, true, true),

('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'PROD-014', 'Stainless Steel Water Bottle Hydro', 'Sports', 'Accessories', 34.99, NULL, 400, 'Triple-insulated stainless steel water bottle keeps drinks cold for 24hrs or hot for 12hrs. BPA-free, leak-proof, and dishwasher safe. Available in 18oz, 32oz, and 40oz.', '{"material": "18/8 Stainless Steel", "insulation": "Triple-wall vacuum", "cold_retention": "24 hours", "hot_retention": "12 hours", "sizes": "18oz, 32oz, 40oz", "features": "BPA-free, Leak-proof, Dishwasher safe", "colors": "Arctic White, Ocean Blue, Forest Green, Midnight Black, Coral Pink"}', 'https://images.unsplash.com/photo-1602143407151-7111542de6e8', '["https://images.unsplash.com/photo-1602143407151-7111542de6e8"]', 4.45, 532, false, true),

('ffffffff-ffff-ffff-ffff-ffffffffffff', 'PROD-015', 'Ultrabook Laptop ProBook 14', 'Electronics', 'Laptops', 1499.99, 1299.99, 30, 'Ultra-thin 14-inch laptop with latest-gen processor, 16GB RAM, 512GB SSD, and stunning 2.8K OLED display. All-day battery life in a premium aluminum chassis.', '{"processor": "Latest Gen (12-core)", "ram": "16GB LPDDR5", "storage": "512GB NVMe SSD", "display": "14-inch 2.8K OLED, 90Hz", "graphics": "Integrated + Discrete GPU", "battery": "72Wh (up to 18 hrs)", "weight": "1.3kg", "ports": "Thunderbolt 4 x2, USB-A, HDMI 2.1, SD card", "os": "Pre-installed"}', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853', '["https://images.unsplash.com/photo-1496181133206-80ce9b88a853"]', 4.70, 198, true, true)
ON CONFLICT (product_id) DO NOTHING;

-- Orders
INSERT INTO orders (id, order_id, user_id, status, order_date, total_amount, subtotal, tax, shipping_cost, tracking_number, estimated_delivery_date, shipping_address, billing_address, items, notes, coupon_code, discount_amount) VALUES
('01010101-0101-0101-0101-010101010101', 'ORD-20240001', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'delivered', '2024-11-15 10:30:00+00', 1079.97, 999.99, 80.00, 0.00, 'TRK-9876543210', '2024-11-20 18:00:00+00', '{"street": "123 Main St", "city": "San Francisco", "state": "CA", "zip": "94102", "country": "US"}', '{"street": "123 Main St", "city": "San Francisco", "state": "CA", "zip": "94102", "country": "US"}', '[{"product_id": "PROD-001", "name": "Ultra HD Smart TV 65\"", "quantity": 1, "price": 999.99}]', 'Please leave at the front door', NULL, 0),

('02020202-0202-0202-0202-020202020202', 'ORD-20240002', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'shipped', '2024-12-01 14:15:00+00', 529.97, 499.98, 30.00, 0.00, 'TRK-1234567890', '2024-12-08 18:00:00+00', '{"street": "123 Main St", "city": "San Francisco", "state": "CA", "zip": "94102", "country": "US"}', '{"street": "123 Main St", "city": "San Francisco", "state": "CA", "zip": "94102", "country": "US"}', '[{"product_id": "PROD-002", "name": "Wireless Noise-Cancelling Headphones Pro", "quantity": 1, "price": 349.99}, {"product_id": "PROD-004", "name": "Professional Running Shoes X-Sprint", "quantity": 1, "price": 149.99}]', NULL, NULL, 0),

('03030303-0303-0303-0303-030303030303', 'ORD-20240003', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'processing', '2024-12-10 09:45:00+00', 574.97, 499.99, 40.00, 34.99, NULL, '2024-12-18 18:00:00+00', '{"street": "456 Oak Ave", "city": "Los Angeles", "state": "CA", "zip": "90001", "country": "US"}', '{"street": "456 Oak Ave", "city": "Los Angeles", "state": "CA", "zip": "90001", "country": "US"}', '[{"product_id": "PROD-008", "name": "Espresso Machine Barista Elite", "quantity": 1, "price": 499.99}]', 'Gift wrapping please', NULL, 0),

('04040404-0404-0404-0404-040404040404', 'ORD-20240004', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'pending', '2024-12-12 16:20:00+00', 189.97, 159.99, 12.80, 17.18, NULL, '2024-12-20 18:00:00+00', '{"street": "789 Pine Blvd", "city": "Chicago", "state": "IL", "zip": "60601", "country": "US"}', '{"street": "789 Pine Blvd", "city": "Chicago", "state": "IL", "zip": "60601", "country": "US"}', '[{"product_id": "PROD-006", "name": "Premium Leather Laptop Bag", "quantity": 1, "price": 159.99}]', NULL, NULL, 0),

('05050505-0505-0505-0505-050505050505', 'ORD-20240005', 'e5f6a7b8-c9d0-1234-efab-345678901234', 'in_transit', '2024-12-08 11:00:00+00', 1649.96, 1549.98, 99.99, 0.00, 'TRK-5556667778', '2024-12-15 18:00:00+00', '{"street": "321 Elm Way", "city": "New York", "state": "NY", "zip": "10001", "country": "US"}', '{"street": "321 Elm Way", "city": "New York", "state": "NY", "zip": "10001", "country": "US"}', '[{"product_id": "PROD-015", "name": "Ultrabook Laptop ProBook 14", "quantity": 1, "price": 1299.99}, {"product_id": "PROD-007", "name": "Fitness Tracker Watch Ultra", "quantity": 1, "price": 249.99}]', NULL, 'SAVE10', 155.00),

('06060606-0606-0606-0606-060606060606', 'ORD-20240006', 'f6a7b8c9-d0e1-2345-fabc-456789012345', 'cancelled', '2024-12-05 08:30:00+00', 94.98, 84.98, 6.80, 3.20, NULL, NULL, '{"street": "654 Maple Dr", "city": "Seattle", "state": "WA", "zip": "98101", "country": "US"}', '{"street": "654 Maple Dr", "city": "Seattle", "state": "WA", "zip": "98101", "country": "US"}', '[{"product_id": "PROD-003", "name": "Organic Cotton Crew Neck T-Shirt", "quantity": 2, "price": 24.99}, {"product_id": "PROD-014", "name": "Stainless Steel Water Bottle Hydro", "quantity": 1, "price": 34.99}]', 'Changed my mind', NULL, 0)
ON CONFLICT (order_id) DO NOTHING;

-- Payments
INSERT INTO payments (id, payment_id, order_id, user_id, status, amount, payment_method, transaction_id, payment_date, card_last_four) VALUES
('aaa10101-0101-0101-0101-010101010101', 'PAY-20240001', '01010101-0101-0101-0101-010101010101', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'completed', 1079.97, 'credit_card', 'TXN-CC-98765', '2024-11-15 10:32:00+00', '4242'),
('aaa20202-0202-0202-0202-020202020202', 'PAY-20240002', '02020202-0202-0202-0202-020202020202', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'completed', 529.97, 'credit_card', 'TXN-CC-12345', '2024-12-01 14:17:00+00', '1234'),
('aaa30303-0303-0303-0303-030303030303', 'PAY-20240003', '03030303-0303-0303-0303-030303030303', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'completed', 574.97, 'paypal', 'TXN-PP-67890', '2024-12-10 09:48:00+00', NULL),
('aaa40404-0404-0404-0404-040404040404', 'PAY-20240004', '04040404-0404-0404-0404-040404040404', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'pending', 189.97, 'credit_card', NULL, NULL, '5678'),
('aaa50505-0505-0505-0505-050505050505', 'PAY-20240005', '05050505-0505-0505-0505-050505050505', 'e5f6a7b8-c9d0-1234-efab-345678901234', 'completed', 1649.96, 'credit_card', 'TXN-CC-33344', '2024-12-08 11:03:00+00', '9012'),
('aaa60606-0606-0606-0606-060606060606', 'PAY-20240006', '06060606-0606-0606-0606-060606060606', 'f6a7b8c9-d0e1-2345-fabc-456789012345', 'refunded', 94.98, 'debit_card', 'TXN-DC-55566', '2024-12-05 08:33:00+00', '3456')
ON CONFLICT (payment_id) DO NOTHING;

-- Conversations
INSERT INTO conversations (id, user_id, title, is_active, metadata) VALUES
('ccc11111-1111-1111-1111-111111111111', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Help with TV order', true, '{"source": "web", "agent": "customer_support"}'),
('ccc22222-2222-2222-2222-222222222222', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'Product recommendations', true, '{"source": "web", "agent": "shopping_assistant"}'),
('ccc33333-3333-3333-3333-333333333333', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Return policy question', false, '{"source": "web", "agent": "customer_support"}')
ON CONFLICT (id) DO NOTHING;

-- Messages
INSERT INTO messages (id, conversation_id, role, content, tool_calls, validation_status, metadata) VALUES
('ddd11111-1111-1111-1111-111111111111', 'ccc11111-1111-1111-1111-111111111111', 'user', 'Hi, I recently ordered a TV and I want to know when it will arrive.', NULL, 'valid', '{}'),
('ddd22222-2222-2222-2222-222222222222', 'ccc11111-1111-1111-1111-111111111111', 'assistant', 'I can help you track your order! Let me look that up for you. I found your order ORD-20240001 for the Ultra HD Smart TV 65". It was delivered on November 20th. Your tracking number is TRK-9876543210.', '[{"tool": "lookup_order", "args": {"user_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901"}}]', 'valid', '{"model": "gpt-4", "tokens": 156}'),
('ddd33333-3333-3333-3333-333333333333', 'ccc11111-1111-1111-1111-111111111111', 'user', 'Great, thanks! Can you also recommend a soundbar to go with it?', NULL, 'valid', '{}'),
('ddd44444-4444-4444-4444-444444444444', 'ccc22222-2222-2222-2222-222222222222', 'user', 'I am looking for a good laptop for programming. What do you recommend?', NULL, 'valid', '{}'),
('ddd55555-5555-5555-5555-555555555555', 'ccc22222-2222-2222-2222-222222222222', 'assistant', 'For programming, I would highly recommend the Ultrabook Laptop ProBook 14! It features a latest-gen 12-core processor, 16GB of LPDDR5 RAM, and a fast 512GB NVMe SSD. The 14-inch 2.8K OLED display is excellent for coding, and the 18-hour battery life means you can code all day. It is currently on sale for $1,299.99 (down from $1,499.99). Would you like to add it to your cart?', '[{"tool": "search_products", "args": {"category": "Electronics", "subcategory": "Laptops"}}]', 'valid', '{"model": "gpt-4", "tokens": 210}'),
('ddd66666-6666-6666-6666-666666666666', 'ccc33333-3333-3333-3333-333333333333', 'user', 'What is your return policy?', NULL, 'valid', '{}'),
('ddd77777-7777-7777-7777-777777777777', 'ccc33333-3333-3333-3333-333333333333', 'assistant', 'Our return policy allows returns within 30 days of delivery for most items. Items must be in their original condition and packaging. Electronics have a 15-day return window. Free return shipping is included for defective items. Would you like me to initiate a return for a specific order?', NULL, 'valid', '{"model": "gpt-4", "tokens": 98}')
ON CONFLICT (id) DO NOTHING;

-- Reviews
INSERT INTO reviews (id, product_id, user_id, rating, title, content, is_verified_purchase, helpful_count) VALUES
('eee11111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 5, 'Absolutely stunning picture quality!', 'The 4K resolution is incredible, and the HDR10+ makes everything look so vivid. Smart features are snappy and the voice control works great. Highly recommend!', true, 45),
('eee22222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 5, 'Best headphones I have ever owned', 'The noise cancellation is phenomenal. I can not hear anything on my commute. Battery lasts well over 30 hours and they are super comfortable for all-day wear.', true, 78),
('eee33333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', 4, 'Great shoes for daily running', 'Very responsive cushioning and the carbon plate gives a nice pop. Runs slightly narrow, so size up half a size if you have wide feet.', true, 32),
('eee44444-4444-4444-4444-444444444444', '88888888-8888-8888-8888-888888888888', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 5, 'Coffee shop quality at home', 'This machine has completely replaced my daily coffee shop visits. The built-in grinder is excellent and the automatic milk frother makes perfect microfoam every time.', true, 56),
('eee55555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'e5f6a7b8-c9d0-1234-efab-345678901234', 4, 'Great TV for the price', 'Excellent picture quality for movie nights. The smart platform could be a bit faster, but overall very happy with the purchase. The sale price made it an incredible deal.', true, 23),
('eee66666-6666-6666-6666-666666666666', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'e5f6a7b8-c9d0-1234-efab-345678901234', 5, 'Perfect programming laptop', 'The OLED display is gorgeous for coding, and the battery easily lasts a full workday. Super fast with the latest processor. Worth every penny.', true, 67),
('eee77777-7777-7777-7777-777777777777', '77777777-7777-7777-7777-777777777777', 'd4e5f6a7-b8c9-0123-defa-234567890123', 4, 'Solid fitness tracker', 'Great battery life and accurate heart rate monitoring. The AMOLED display is bright and easy to read outdoors. GPS tracking works well for runs.', true, 19),
('eee88888-8888-8888-8888-888888888888', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'f6a7b8c9-d0e1-2345-fabc-456789012345', 5, 'Survived -25C camping trip', 'This parka is the real deal. Kept me warm during an extremely cold camping trip. The fur hood adds great wind protection and the pockets are well-insulated.', true, 41)
ON CONFLICT (id) DO NOTHING;

-- Coupons
INSERT INTO coupons (id, code, discount_type, discount_value, min_order_amount, max_uses, used_count, valid_from, valid_until, is_active) VALUES
('cou11111-1111-1111-1111-111111111111', 'WELCOME10', 'percentage', 10.00, 50.00, 1000, 234, '2024-01-01 00:00:00+00', '2025-12-31 23:59:59+00', true),
('cou22222-2222-2222-2222-222222222222', 'SAVE20', 'fixed', 20.00, 100.00, 500, 87, '2024-06-01 00:00:00+00', '2025-06-30 23:59:59+00', true),
('cou33333-3333-3333-3333-333333333333', 'HOLIDAY25', 'percentage', 25.00, 200.00, 200, 156, '2024-11-15 00:00:00+00', '2025-01-15 23:59:59+00', true),
('cou44444-4444-4444-4444-444444444444', 'FREESHIP', 'fixed', 15.00, 75.00, NULL, 445, '2024-01-01 00:00:00+00', '2025-12-31 23:59:59+00', true),
('cou55555-5555-5555-5555-555555555555', 'SAVE10', 'percentage', 10.00, 150.00, 300, 112, '2024-09-01 00:00:00+00', '2025-09-30 23:59:59+00', true),
('cou66666-6666-6666-6666-666666666666', 'VIP50', 'fixed', 50.00, 500.00, 50, 12, '2024-10-01 00:00:00+00', '2025-03-31 23:59:59+00', true)
ON CONFLICT (code) DO NOTHING;

-- Wishlist
INSERT INTO wishlist (user_id, product_id) VALUES
('b2c3d4e5-f6a7-8901-bcde-f12345678901', '22222222-2222-2222-2222-222222222222'),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', '88888888-8888-8888-8888-888888888888'),
('c3d4e5f6-a7b8-9012-cdef-123456789012', 'ffffffff-ffff-ffff-ffff-ffffffffffff'),
('c3d4e5f6-a7b8-9012-cdef-123456789012', '77777777-7777-7777-7777-777777777777'),
('e5f6a7b8-c9d0-1234-efab-345678901234', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
('d4e5f6a7-b8c9-0123-defa-234567890123', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (user_id, product_id) DO NOTHING;

-- Cart Items
INSERT INTO cart_items (user_id, product_id, quantity) VALUES
('b2c3d4e5-f6a7-8901-bcde-f12345678901', '77777777-7777-7777-7777-777777777777', 1),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 2),
('c3d4e5f6-a7b8-9012-cdef-123456789012', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1),
('d4e5f6a7-b8c9-0123-defa-234567890123', '33333333-3333-3333-3333-333333333333', 3),
('d4e5f6a7-b8c9-0123-defa-234567890123', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 2)
ON CONFLICT DO NOTHING;

-- Notifications
INSERT INTO notifications (user_id, type, title, message, is_read, metadata) VALUES
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'order_delivered', 'Order Delivered', 'Your order ORD-20240001 has been delivered successfully!', true, '{"order_id": "ORD-20240001"}'),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'order_shipped', 'Order Shipped', 'Your order ORD-20240002 has been shipped. Tracking: TRK-1234567890', false, '{"order_id": "ORD-20240002", "tracking": "TRK-1234567890"}'),
('c3d4e5f6-a7b8-9012-cdef-123456789012', 'order_processing', 'Order Being Processed', 'Your order ORD-20240003 is being prepared for shipment.', false, '{"order_id": "ORD-20240003"}'),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'promotion', 'Holiday Sale!', 'Use code HOLIDAY25 for 25% off orders over $200. Limited time offer!', false, '{"coupon_code": "HOLIDAY25"}'),
('e5f6a7b8-c9d0-1234-efab-345678901234', 'order_in_transit', 'Order In Transit', 'Your order ORD-20240005 is on its way! Estimated delivery: Dec 15.', false, '{"order_id": "ORD-20240005"}'),
('d4e5f6a7-b8c9-0123-defa-234567890123', 'price_drop', 'Price Drop Alert', 'The Ultra HD Smart TV 65" on your wishlist is now $999.99! Save $300!', false, '{"product_id": "PROD-001", "old_price": 1299.99, "new_price": 999.99}'),
('f6a7b8c9-d0e1-2345-fabc-456789012345', 'order_cancelled', 'Order Cancelled', 'Your order ORD-20240006 has been cancelled. Refund will be processed within 5-7 business days.', true, '{"order_id": "ORD-20240006"}')
ON CONFLICT DO NOTHING;

-- Analytics Events
INSERT INTO analytics_events (user_id, event_type, event_data, page_url, session_id) VALUES
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'page_view', '{"page": "product_detail", "product_id": "PROD-001"}', '/products/PROD-001', 'sess-001-abc'),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'add_to_cart', '{"product_id": "PROD-007", "quantity": 1}', '/products/PROD-007', 'sess-001-abc'),
('c3d4e5f6-a7b8-9012-cdef-123456789012', 'search', '{"query": "laptop for programming", "results_count": 3}', '/search', 'sess-002-def'),
('c3d4e5f6-a7b8-9012-cdef-123456789012', 'chat_message', '{"message_length": 65, "conversation_id": "ccc22222-2222-2222-2222-222222222222"}', '/chat', 'sess-002-def'),
('d4e5f6a7-b8c9-0123-defa-234567890123', 'page_view', '{"page": "homepage"}', '/', 'sess-003-ghi'),
('e5f6a7b8-c9d0-1234-efab-345678901234', 'purchase', '{"order_id": "ORD-20240005", "total": 1649.96}', '/checkout/confirmation', 'sess-004-jkl'),
(NULL, 'page_view', '{"page": "homepage"}', '/', 'sess-005-anon'),
('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'product_view', '{"product_id": "PROD-002"}', '/products/PROD-002', 'sess-001-abc'),
('f6a7b8c9-d0e1-2345-fabc-456789012345', 'page_view', '{"page": "categories"}', '/categories', 'sess-006-mno')
ON CONFLICT DO NOTHING;

-- Agent Executions
INSERT INTO agent_executions (agent_type, conversation_id, input_data, output_data, status, execution_time_ms) VALUES
('customer_support', 'ccc11111-1111-1111-1111-111111111111', '{"message": "I want to know when my TV will arrive", "user_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901"}', '{"response": "Your order ORD-20240001 was delivered on November 20th.", "tools_used": ["lookup_order"]}', 'completed', 1250),
('shopping_assistant', 'ccc22222-2222-2222-2222-222222222222', '{"message": "Good laptop for programming", "user_id": "c3d4e5f6-a7b8-9012-cdef-123456789012"}', '{"response": "Recommended Ultrabook ProBook 14", "tools_used": ["search_products"], "products_recommended": ["PROD-015"]}', 'completed', 2100),
('customer_support', 'ccc33333-3333-3333-3333-333333333333', '{"message": "What is your return policy", "user_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901"}', '{"response": "Returns within 30 days for most items, 15 days for electronics.", "tools_used": []}', 'completed', 800),
('input_validator', NULL, '{"text": "Tell me about your best headphones"}', '{"is_valid": true, "category": "product_inquiry"}', 'completed', 150),
('output_validator', NULL, '{"text": "The headphones are $349.99 with 30-hour battery life"}', '{"is_valid": true, "contains_pii": false, "factual_accuracy": "verified"}', 'completed', 200)
ON CONFLICT DO NOTHING;
