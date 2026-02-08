import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/products
 * Get all products (public)
 */
router.get('/', async (req, res) => {
    try {
        const { category, brand, minPrice, maxPrice, featured } = req.query;

        let query = supabaseAdmin.from('products').select('*');

        // Apply filters
        if (category) query = query.eq('category', category);
        if (brand) query = query.eq('brand', brand);
        if (minPrice) query = query.gte('price', parseFloat(minPrice));
        if (maxPrice) query = query.lte('price', parseFloat(maxPrice));
        if (featured === 'true') query = query.eq('featured', true);

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ products: data });

    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /api/products/:id
 * Get single product by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabaseAdmin
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ product: data });

    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/products
 * Create a new product (admin only)
 */
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const {
            brand,
            model,
            price,
            category,
            ram,
            storage,
            specs,
            rating,
            stock,
            featured,
            image
        } = req.body;

        if (!brand || !model || !price || !category) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const { data, error } = await supabaseAdmin
            .from('products')
            .insert({
                brand,
                model,
                price,
                category,
                ram: ram || '',
                storage: storage || '',
                specs: specs || {},
                rating: rating || 0,
                stock: stock || 0,
                featured: featured || false,
                image: image || '',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.status(201).json({ message: 'Product created successfully', product: data });

    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * PUT /api/products/:id
 * Update a product (admin only)
 */
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body, updated_at: new Date().toISOString() };

        const { data, error } = await supabaseAdmin
            .from('products')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Product updated successfully', product: data });

    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * DELETE /api/products/:id
 * Delete a product (admin only)
 */
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabaseAdmin
            .from('products')
            .delete()
            .eq('id', id);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Product deleted successfully' });

    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
