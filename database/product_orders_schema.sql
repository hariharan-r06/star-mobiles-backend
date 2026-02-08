-- Product Orders Table for Star Mobiles
-- Run this in your Supabase SQL Editor

-- Create product_orders table
CREATE TABLE IF NOT EXISTS product_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id UUID NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  product_category VARCHAR(50) NOT NULL, -- 'mobile' or 'accessory'
  product_price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  total_amount DECIMAL(10, 2) NOT NULL,
  advance_amount DECIMAL(10, 2) NOT NULL, -- 20% of total
  
  -- Customer details
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  address TEXT NOT NULL,
  
  -- Order status
  status VARCHAR(50) DEFAULT 'pending_verification',
  -- pending_verification: Waiting for admin to call and verify
  -- verified: Admin called and verified customer
  -- advance_paid: Customer paid 20% advance via GPay
  -- processing: Order is being processed
  -- completed: Order delivered and remaining 80% paid
  -- cancelled: Order cancelled, refund if advance was paid
  
  payment_status VARCHAR(50) DEFAULT 'unpaid',
  -- unpaid: No payment received
  -- advance_received: 20% advance received
  -- fully_paid: 100% payment received
  -- refunded: Advance refunded after cancellation
  
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add stock column to products if not exists
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 10;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reserved_stock INTEGER DEFAULT 0;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_orders_user_id ON product_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_product_orders_status ON product_orders(status);
CREATE INDEX IF NOT EXISTS idx_product_orders_product_id ON product_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_product_orders_created_at ON product_orders(created_at DESC);

-- Enable RLS
ALTER TABLE product_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_orders
-- Users can view their own orders
CREATE POLICY "Users can view own orders" ON product_orders
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create orders
CREATE POLICY "Users can create orders" ON product_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all orders (use service key in backend)
-- Admins can update all orders (use service key in backend)

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_product_orders_updated_at ON product_orders;
CREATE TRIGGER update_product_orders_updated_at
  BEFORE UPDATE ON product_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
