-- =============================================
-- SAMPLE PRODUCTS DATA
-- Run this in Supabase SQL Editor to add products
-- =============================================

-- Clear existing products (optional)
-- DELETE FROM products;

-- Insert sample mobile phones
INSERT INTO products (brand, model, price, category, ram, storage, rating, stock, featured, image) VALUES
('Apple', 'iPhone 15 Pro Max', 159900, 'mobile', '8GB', '256GB', 4.9, 50, true, ''),
('Apple', 'iPhone 15 Pro', 139900, 'mobile', '8GB', '128GB', 4.8, 45, true, ''),
('Apple', 'iPhone 15', 79900, 'mobile', '6GB', '128GB', 4.7, 60, false, ''),
('Apple', 'iPhone 14', 59900, 'mobile', '6GB', '128GB', 4.6, 80, false, ''),
('Samsung', 'Galaxy S24 Ultra', 134999, 'mobile', '12GB', '256GB', 4.8, 40, true, ''),
('Samsung', 'Galaxy S24+', 99999, 'mobile', '12GB', '256GB', 4.7, 55, true, ''),
('Samsung', 'Galaxy S24', 79999, 'mobile', '8GB', '128GB', 4.6, 70, false, ''),
('Samsung', 'Galaxy A55', 39999, 'mobile', '8GB', '128GB', 4.4, 100, false, ''),
('OnePlus', '12 Pro', 64999, 'mobile', '12GB', '256GB', 4.7, 45, true, ''),
('OnePlus', '12', 54999, 'mobile', '8GB', '128GB', 4.6, 60, false, ''),
('OnePlus', 'Nord CE4', 24999, 'mobile', '8GB', '128GB', 4.4, 90, false, ''),
('Google', 'Pixel 8 Pro', 106999, 'mobile', '12GB', '128GB', 4.8, 30, true, ''),
('Google', 'Pixel 8', 75999, 'mobile', '8GB', '128GB', 4.7, 40, false, ''),
('Google', 'Pixel 8a', 52999, 'mobile', '8GB', '128GB', 4.5, 50, false, ''),
('Xiaomi', '14 Ultra', 99999, 'mobile', '16GB', '512GB', 4.6, 25, true, ''),
('Xiaomi', '14', 69999, 'mobile', '12GB', '256GB', 4.5, 40, false, ''),
('Xiaomi', 'Redmi Note 13 Pro+', 31999, 'mobile', '12GB', '256GB', 4.4, 100, false, ''),
('Vivo', 'X100 Pro', 89999, 'mobile', '16GB', '512GB', 4.5, 35, true, ''),
('Vivo', 'V30 Pro', 46999, 'mobile', '12GB', '256GB', 4.4, 55, false, ''),
('Oppo', 'Find X7 Ultra', 99999, 'mobile', '16GB', '512GB', 4.5, 25, false, ''),
('Oppo', 'Reno 11 Pro', 39999, 'mobile', '12GB', '256GB', 4.4, 60, false, ''),
('Realme', 'GT 5 Pro', 44999, 'mobile', '16GB', '256GB', 4.4, 50, false, ''),
('Nothing', 'Phone (2a)', 23999, 'mobile', '8GB', '128GB', 4.3, 70, false, ''),
('Motorola', 'Edge 50 Pro', 31999, 'mobile', '12GB', '256GB', 4.3, 55, false, '');

-- Insert sample accessories
INSERT INTO products (brand, model, price, category, ram, storage, rating, stock, featured, image) VALUES
('Apple', 'AirPods Pro 2nd Gen', 24900, 'accessory', '', '', 4.8, 100, true, ''),
('Apple', 'AirPods 3rd Gen', 18900, 'accessory', '', '', 4.6, 80, false, ''),
('Apple', 'MagSafe Charger', 4500, 'accessory', '', '', 4.5, 120, false, ''),
('Samsung', 'Galaxy Buds2 Pro', 16999, 'accessory', '', '', 4.5, 70, true, ''),
('Samsung', 'Galaxy Watch 6', 29999, 'accessory', '', '', 4.6, 40, true, ''),
('OnePlus', 'Buds Pro 2', 11999, 'accessory', '', '', 4.4, 60, false, ''),
('Sony', 'WH-1000XM5', 29990, 'accessory', '', '', 4.8, 35, true, ''),
('Sony', 'WF-1000XM5', 24990, 'accessory', '', '', 4.7, 45, false, ''),
('JBL', 'Tour Pro 2', 21999, 'accessory', '', '', 4.5, 50, false, ''),
('Anker', 'PowerCore 20000mAh', 2999, 'accessory', '', '', 4.6, 150, false, ''),
('Spigen', 'Ultra Hybrid Case', 1599, 'accessory', '', '', 4.6, 200, false, ''),
('Belkin', '3-in-1 Wireless Charger', 14999, 'accessory', '', '', 4.5, 40, false, '');
