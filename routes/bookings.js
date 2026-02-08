import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/bookings
 * Get all bookings (admin) or user's own bookings
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        // Check if admin
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', req.user.id)
            .single();

        let query = supabaseAdmin.from('bookings').select('*');

        // If not admin, only return user's own bookings
        if (!profile || profile.role !== 'admin') {
            query = query.eq('user_id', req.user.id);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ bookings: data });

    } catch (error) {
        console.error('Get bookings error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/bookings
 * Create a new service booking
 */
router.post('/', authMiddleware, async (req, res) => {
    try {
        const {
            customerName,
            phone,
            brand,
            model,
            problemType,
            description,
            preferredDate,
            preferredTime
        } = req.body;

        // Validate required fields
        if (!customerName || !phone || !brand || !model || !problemType) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const { data, error } = await supabaseAdmin
            .from('bookings')
            .insert({
                user_id: req.user.id,
                customer_name: customerName,
                phone,
                brand,
                model,
                problem_type: problemType,
                description: description || '',
                preferred_date: preferredDate,
                preferred_time: preferredTime,
                status: 'pending',
                admin_notes: '',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Booking insert error:', error);
            return res.status(400).json({ error: error.message });
        }

        res.status(201).json({
            message: 'Booking created successfully!',
            booking: data
        });

    } catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * PUT /api/bookings/:id
 * Update booking status (admin only)
 */
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNotes } = req.body;

        const updateData = {};
        if (status) updateData.status = status;
        if (adminNotes !== undefined) updateData.admin_notes = adminNotes;
        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabaseAdmin
            .from('bookings')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Booking updated successfully', booking: data });

    } catch (error) {
        console.error('Update booking error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * DELETE /api/bookings/:id
 * Cancel/delete a booking
 */
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user owns the booking or is admin
        const { data: booking, error: fetchError } = await supabaseAdmin
            .from('bookings')
            .select('user_id')
            .eq('id', id)
            .single();

        if (fetchError || !booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Check ownership
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', req.user.id)
            .single();

        if (booking.user_id !== req.user.id && profile?.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized to delete this booking' });
        }

        const { error } = await supabaseAdmin
            .from('bookings')
            .delete()
            .eq('id', id);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ message: 'Booking deleted successfully' });

    } catch (error) {
        console.error('Delete booking error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
