-- =============================================
-- SUPABASE DATABASE SCHEMA FOR STAR MOBILES
-- Run this SQL in your Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES TABLE (Extended user info)
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, phone, role, created_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
        COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', ''),
        'user',
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- PRODUCTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('mobile', 'accessory')),
    ram TEXT,
    storage TEXT,
    specs JSONB DEFAULT '{}',
    rating DECIMAL(2,1) DEFAULT 0,
    stock INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT FALSE,
    image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Public read access for products
CREATE POLICY "Anyone can view products" ON products
    FOR SELECT USING (true);

-- Admin-only write access for products
CREATE POLICY "Admins can manage products" ON products
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- BOOKINGS TABLE (Service requests)
-- =============================================
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    problem_type TEXT NOT NULL,
    description TEXT,
    preferred_date DATE,
    preferred_time TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Users can view their own bookings
CREATE POLICY "Users can view own bookings" ON bookings
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own bookings
CREATE POLICY "Users can create bookings" ON bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all bookings
CREATE POLICY "Admins can view all bookings" ON bookings
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Admins can update any booking
CREATE POLICY "Admins can update bookings" ON bookings
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- CART_ITEMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Users can manage their own cart
CREATE POLICY "Users can manage own cart" ON cart_items
    FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- ORDERS TABLE (For future checkout)
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    items JSONB NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    shipping_address TEXT,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Users can view their own orders
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create orders
CREATE POLICY "Users can create orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view and manage all orders
CREATE POLICY "Admins can manage orders" ON orders
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- INSERT SAMPLE DATA (Optional)
-- =============================================

-- Insert sample products
INSERT INTO products (brand, model, price, category, ram, storage, specs, rating, stock, featured) VALUES
('Samsung', 'Galaxy S24 Ultra', 134999, 'mobile', '12GB', '256GB', '{"display": "6.8\" QHD+", "processor": "Snapdragon 8 Gen 3", "battery": "5000mAh", "camera": "200MP"}', 4.8, 25, true),
('Apple', 'iPhone 15 Pro Max', 159900, 'mobile', '8GB', '256GB', '{"display": "6.7\" Super Retina XDR", "processor": "A17 Pro", "battery": "4422mAh", "camera": "48MP"}', 4.9, 20, true),
('OnePlus', '12', 64999, 'mobile', '12GB', '256GB', '{"display": "6.82\" LTPO AMOLED", "processor": "Snapdragon 8 Gen 3", "battery": "5400mAh", "camera": "50MP"}', 4.6, 30, true),
('Xiaomi', '14 Ultra', 99999, 'mobile', '16GB', '512GB', '{"display": "6.73\" LTPO AMOLED", "processor": "Snapdragon 8 Gen 3", "battery": "5000mAh", "camera": "50MP Leica"}', 4.7, 15, true),
('Realme', 'GT 5 Pro', 39999, 'mobile', '12GB', '256GB', '{"display": "6.78\" AMOLED", "processor": "Snapdragon 8 Gen 3", "battery": "5400mAh", "camera": "50MP"}', 4.5, 40, true)
ON CONFLICT DO NOTHING;

-- Note: To create an admin user, run this after a user signs up:
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@starmobiles.com';
