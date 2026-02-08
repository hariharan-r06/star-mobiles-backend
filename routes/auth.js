import express from 'express';
import { supabase, supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/**
 * POST /api/auth/signup
 * Register a new user with email/phone and password
 */
router.post('/signup', async (req, res) => {
    try {
        const { email, password, name, phone } = req.body;

        // Validate required fields
        if (!password || !name) {
            return res.status(400).json({ error: 'Password and name are required' });
        }

        if (!email && !phone) {
            return res.status(400).json({ error: 'Email or phone number is required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Prepare signup data
        const signupData = {
            password,
            options: {
                data: {
                    name,
                    phone: phone || '',
                    email: email || ''
                }
            }
        };

        // Add email or phone based on what's provided
        if (email) {
            signupData.email = email;
        }
        if (phone) {
            signupData.phone = phone.startsWith('+91') ? phone : `+91${phone}`;
        }

        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp(signupData);

        if (authError) {
            return res.status(400).json({ error: authError.message });
        }

        // Create profile in profiles table using admin client
        if (authData.user) {
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .upsert({
                    id: authData.user.id,
                    email: email || '',
                    name: name,
                    phone: phone || '',
                    role: 'user',
                    created_at: new Date().toISOString()
                });

            if (profileError) {
                console.error('Profile creation error:', profileError);
            }
        }

        res.status(201).json({
            success: true,
            message: email
                ? 'Account created successfully! Please check your email to verify.'
                : 'Account created successfully!',
            user: authData.user,
            session: authData.session
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Server error during signup' });
    }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Fetch user profile using admin client to bypass RLS
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        console.log('Login profile fetch:', { userId: data.user.id, profile, error: profileError?.message });

        res.json({
            success: true,
            message: 'Login successful!',
            user: data.user,
            profile: profile || null,
            session: data.session
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

/**
 * POST /api/auth/login-phone
 * Login with phone number and password
 */
router.post('/login-phone', async (req, res) => {
    try {
        const { phone, password } = req.body;

        if (!phone || !password) {
            return res.status(400).json({ error: 'Phone number and password are required' });
        }

        const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;

        const { data, error } = await supabase.auth.signInWithPassword({
            phone: formattedPhone,
            password
        });

        if (error) {
            return res.status(401).json({ error: 'Invalid phone number or password' });
        }

        // Fetch user profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        res.json({
            success: true,
            message: 'Login successful!',
            user: data.user,
            profile,
            session: data.session
        });

    } catch (error) {
        console.error('Phone login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

/**
 * POST /api/auth/send-otp
 * Send OTP to phone number for verification
 */
router.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;

        const { data, error } = await supabase.auth.signInWithOtp({
            phone: formattedPhone
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({
            success: true,
            message: 'OTP sent successfully!',
            data
        });

    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ error: 'Server error while sending OTP' });
    }
});

/**
 * POST /api/auth/verify-otp
 * Verify OTP for phone login
 */
router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({ error: 'Phone and OTP are required' });
        }

        const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone}`;

        const { data, error } = await supabase.auth.verifyOtp({
            phone: formattedPhone,
            token: otp,
            type: 'sms'
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Fetch or create profile
        if (data.user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            return res.json({
                success: true,
                message: 'Phone verified successfully!',
                user: data.user,
                profile,
                session: data.session
            });
        }

        res.json({
            success: true,
            message: 'Phone verified successfully!',
            user: data.user,
            session: data.session
        });

    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({ error: 'Server error during OTP verification' });
    }
});

/**
 * POST /api/auth/forgot-password
 * Send password reset email
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.FRONTEND_URL}/reset-password`
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({
            success: true,
            message: 'Password reset email sent! Check your inbox.'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/auth/reset-password
 * Reset password with new password
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { password } = req.body;
        const authHeader = req.headers.authorization;

        if (!password) {
            return res.status(400).json({ error: 'New password is required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication token required' });
        }

        const token = authHeader.split(' ')[1];

        // Set the session from the token
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (userError || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Update password
        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({
            success: true,
            message: 'Password reset successfully!'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/auth/logout
 * Logout current user
 */
router.post('/logout', async (req, res) => {
    try {
        const { error } = await supabase.auth.signOut();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ success: true, message: 'Logged out successfully' });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Server error during logout' });
    }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Fetch profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        res.json({ success: true, user, profile });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const { name, phone, address } = req.body;

        const { data, error } = await supabase
            .from('profiles')
            .update({
                name,
                phone,
                address,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
            .select()
            .single();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ success: true, message: 'Profile updated successfully', profile: data });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/auth/change-password
 * Change password for logged in user
 */
router.post('/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const authHeader = req.headers.authorization;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const token = authHeader.split(' ')[1];
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Update password
        const { error } = await supabase.auth.updateUser({ password: newPassword });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({ success: true, message: 'Password changed successfully!' });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
