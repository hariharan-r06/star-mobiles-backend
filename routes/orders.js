import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// Middleware to verify JWT token
const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(401).json({ error: 'Authentication failed' });
    }
};

// Check if user is admin
const isAdmin = async (userId) => {
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
    return profile?.role === 'admin';
};

// GET all orders (admin) or user's orders
router.get('/', authMiddleware, async (req, res) => {
    try {
        const isUserAdmin = await isAdmin(req.user.id);

        let query = supabaseAdmin
            .from('product_orders')
            .select('*')
            .order('created_at', { ascending: false });

        // Non-admins can only see their own orders
        if (!isUserAdmin) {
            query = query.eq('user_id', req.user.id);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching orders:', error);
            return res.status(500).json({ error: 'Failed to fetch orders' });
        }

        res.json(data || []);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET single order
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const isUserAdmin = await isAdmin(req.user.id);

        const { data, error } = await supabaseAdmin
            .from('product_orders')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Non-admins can only view their own orders
        if (!isUserAdmin && data.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST create new order (book product)
router.post('/', authMiddleware, async (req, res) => {
    try {
        const {
            product_id,
            product_name,
            product_category,
            product_price,
            quantity = 1,
            customer_name,
            phone,
            address
        } = req.body;

        // Validate required fields
        if (!product_id || !product_name || !product_price || !customer_name || !phone || !address) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Calculate amounts
        const total_amount = product_price * quantity;
        const advance_amount = Math.round(total_amount * 0.2 * 100) / 100; // 20%

        // Check product stock
        const { data: product, error: productError } = await supabaseAdmin
            .from('products')
            .select('stock, reserved_stock')
            .eq('id', product_id)
            .single();

        if (productError || !product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const availableStock = (product.stock || 10) - (product.reserved_stock || 0);
        if (availableStock < quantity) {
            return res.status(400).json({ error: 'Insufficient stock available' });
        }

        // Create order
        const { data: order, error: orderError } = await supabaseAdmin
            .from('product_orders')
            .insert({
                user_id: req.user.id,
                product_id,
                product_name,
                product_category: product_category || 'mobile',
                product_price,
                quantity,
                total_amount,
                advance_amount,
                customer_name,
                phone,
                address,
                status: 'pending_verification',
                payment_status: 'unpaid'
            })
            .select()
            .single();

        if (orderError) {
            console.error('Error creating order:', orderError);
            return res.status(500).json({ error: 'Failed to create order' });
        }

        res.status(201).json({
            success: true,
            order,
            message: `Order placed! Please wait for our call to verify. Advance amount: ₹${advance_amount}`
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT update order status (admin only)
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, payment_status, admin_notes } = req.body;

        // Check admin
        const isUserAdmin = await isAdmin(req.user.id);
        if (!isUserAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        // Get current order
        const { data: currentOrder, error: fetchError } = await supabaseAdmin
            .from('product_orders')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !currentOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const updateData = {};

        // Update status
        if (status) {
            updateData.status = status;

            if (status === 'verified') {
                updateData.verified_at = new Date().toISOString();
            }

            if (status === 'completed') {
                updateData.completed_at = new Date().toISOString();
            }
        }

        // Update payment status
        if (payment_status) {
            updateData.payment_status = payment_status;

            if (payment_status === 'advance_received') {
                updateData.paid_at = new Date().toISOString();
                updateData.status = 'advance_paid';

                // Reserve stock when advance is paid
                const { data: product } = await supabaseAdmin
                    .from('products')
                    .select('reserved_stock')
                    .eq('id', currentOrder.product_id)
                    .single();

                await supabaseAdmin
                    .from('products')
                    .update({ reserved_stock: (product?.reserved_stock || 0) + currentOrder.quantity })
                    .eq('id', currentOrder.product_id);
            }

            if (payment_status === 'fully_paid') {
                updateData.status = 'completed';
                updateData.completed_at = new Date().toISOString();

                // Move from reserved to actual stock decrease
                const { data: product } = await supabaseAdmin
                    .from('products')
                    .select('stock, reserved_stock')
                    .eq('id', currentOrder.product_id)
                    .single();

                await supabaseAdmin
                    .from('products')
                    .update({
                        stock: Math.max(0, (product?.stock || 10) - currentOrder.quantity),
                        reserved_stock: Math.max(0, (product?.reserved_stock || 0) - currentOrder.quantity)
                    })
                    .eq('id', currentOrder.product_id);
            }

            if (payment_status === 'refunded') {
                updateData.status = 'cancelled';

                // Release reserved stock
                const { data: product } = await supabaseAdmin
                    .from('products')
                    .select('reserved_stock')
                    .eq('id', currentOrder.product_id)
                    .single();

                await supabaseAdmin
                    .from('products')
                    .update({
                        reserved_stock: Math.max(0, (product?.reserved_stock || 0) - currentOrder.quantity)
                    })
                    .eq('id', currentOrder.product_id);
            }
        }

        if (admin_notes !== undefined) {
            updateData.admin_notes = admin_notes;
        }

        // Update order
        const { data: updatedOrder, error: updateError } = await supabaseAdmin
            .from('product_orders')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating order:', updateError);
            return res.status(500).json({ error: 'Failed to update order' });
        }

        res.json({
            success: true,
            order: updatedOrder,
            message: 'Order updated successfully'
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE cancel order
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const isUserAdmin = await isAdmin(req.user.id);

        // Get order
        const { data: order, error: fetchError } = await supabaseAdmin
            .from('product_orders')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Non-admins can only cancel their own pending orders
        if (!isUserAdmin) {
            if (order.user_id !== req.user.id) {
                return res.status(403).json({ error: 'Access denied' });
            }
            if (order.status !== 'pending_verification') {
                return res.status(400).json({ error: 'Can only cancel pending orders' });
            }
        }

        // If advance was paid, release reserved stock
        if (order.payment_status === 'advance_received') {
            const { data: product } = await supabaseAdmin
                .from('products')
                .select('reserved_stock')
                .eq('id', order.product_id)
                .single();

            await supabaseAdmin
                .from('products')
                .update({
                    reserved_stock: Math.max(0, (product?.reserved_stock || 0) - order.quantity)
                })
                .eq('id', order.product_id);
        }

        // Update order status to cancelled
        const { error: updateError } = await supabaseAdmin
            .from('product_orders')
            .update({
                status: 'cancelled',
                payment_status: order.payment_status === 'advance_received' ? 'refunded' : order.payment_status
            })
            .eq('id', id);

        if (updateError) {
            console.error('Error cancelling order:', updateError);
            return res.status(500).json({ error: 'Failed to cancel order' });
        }

        res.json({ success: true, message: 'Order cancelled' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
