import { supabase, supabaseAdmin } from '../config/supabase.js';

/**
 * Middleware to verify Supabase JWT token and attach user to request
 */
export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        // Verify the token with Supabase Admin (bypasses RLS)
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Attach user to request object
        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
};

/**
 * Middleware to check if user is admin
 */
export const adminMiddleware = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Fetch user profile to check role using Admin client (bypasses RLS)
        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', req.user.id)
            .single();

        if (error || !profile || profile.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        return res.status(500).json({ error: 'Authorization failed' });
    }
};

export default { authMiddleware, adminMiddleware };
