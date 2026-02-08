import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/cart
 * Get user's cart items
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('cart_items')
            .select(`
                *,
                product:products(*)
            `)
            .eq('user_id', req.user.id);

        if (error) {
            console.error('Get cart error:', error);
            return res.status(400).json({ error: error.message });
        }

        res.json({ items: data || [] });

    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/cart
 * Add item to cart
 */
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;

        if (!productId) {
            return res.status(400).json({ error: 'Product ID is required' });
        }

        // Check if item already in cart
        const { data: existing } = await supabaseAdmin
            .from('cart_items')
            .select('*')
            .eq('user_id', req.user.id)
            .eq('product_id', productId)
            .single();

        if (existing) {
            // Update quantity
            const { data, error } = await supabaseAdmin
                .from('cart_items')
                .update({ quantity: existing.quantity + quantity })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) {
                console.error('Update cart error:', error);
                return res.status(400).json({ error: error.message });
            }

            return res.json({ message: 'Cart updated', item: data });
        }

        // Add new item
        const { data, error } = await supabaseAdmin
            .from('cart_items')
            .insert({
                user_id: req.user.id,
                product_id: productId,
                quantity,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Add to cart error:', error);
            return res.status(400).json({ error: error.message });
        }

        res.status(201).json({ message: 'Added to cart', item: data });

    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * PUT /api/cart/:id
 * Update cart item quantity
 */
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity } = req.body;

        if (quantity <= 0) {
            // Remove item if quantity is 0 or less
            const { error } = await supabaseAdmin
                .from('cart_items')
                .delete()
                .eq('id', id)
                .eq('user_id', req.user.id);

            if (error) {
                return res.status(400).json({ error: error.message });
            }

            return res.json({ message: 'Item removed from cart' });
        }

        const { data, error } = await supabaseAdmin
            .from('cart_items')
            .update({ quantity })
            .eq('id', id)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Cart updated', item: data });

    } catch (error) {
        console.error('Update cart error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * DELETE /api/cart/:id
 * Remove item from cart
 */
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabaseAdmin
            .from('cart_items')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Item removed from cart' });

    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * DELETE /api/cart
 * Clear entire cart
 */
router.delete('/', authMiddleware, async (req, res) => {
    try {
        const { error } = await supabaseAdmin
            .from('cart_items')
            .delete()
            .eq('user_id', req.user.id);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Cart cleared' });

    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
