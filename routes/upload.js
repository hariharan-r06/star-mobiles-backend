import express from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/**
 * POST /api/upload/image
 * Upload an image to Supabase Storage
 */
router.post('/image', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { image, filename } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'No image provided' });
        }

        // If image is already a public URL, return it
        if (image.startsWith('http://') || image.startsWith('https://')) {
            console.log('Image is already a URL, returning as-is');
            return res.json({ url: image });
        }

        // If image is base64 data URL
        if (image.startsWith('data:')) {
            try {
                // Extract base64 data
                const matches = image.match(/^data:([^;]+);base64,(.+)$/);
                if (!matches) {
                    console.log('Invalid base64 format');
                    return res.json({ url: image }); // Return as-is if can't parse
                }

                const mimeType = matches[1];
                const base64Data = matches[2];
                const extension = mimeType.split('/')[1] || 'jpg';

                // Generate unique filename
                const fileName = `products/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;

                // Convert base64 to buffer
                const buffer = Buffer.from(base64Data, 'base64');

                console.log('Uploading to Supabase Storage:', fileName, 'Size:', buffer.length);

                // Upload to Supabase Storage - bucket name is 'images'
                const { data, error } = await supabaseAdmin.storage
                    .from('images')  // Your bucket name
                    .upload(fileName, buffer, {
                        contentType: mimeType,
                        cacheControl: '3600',
                        upsert: false
                    });

                if (error) {
                    console.error('Supabase storage upload error:', error);
                    // Return base64 as fallback
                    return res.json({ url: image, warning: 'Storage upload failed, using base64' });
                }

                console.log('Upload successful:', data);

                // Get public URL
                const { data: urlData } = supabaseAdmin.storage
                    .from('images')
                    .getPublicUrl(fileName);

                console.log('Public URL:', urlData.publicUrl);

                return res.json({
                    url: urlData.publicUrl,
                    success: true
                });

            } catch (uploadError) {
                console.error('Upload processing error:', uploadError);
                return res.json({ url: image, warning: 'Upload failed, using base64' });
            }
        }

        // If it's plain base64 without data URL prefix
        return res.status(400).json({ error: 'Invalid image format. Use data URL or HTTP URL.' });

    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ error: 'Server error during upload' });
    }
});

/**
 * GET /api/upload/test
 * Test storage bucket access
 */
router.get('/test', async (req, res) => {
    try {
        const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        res.json({
            buckets: buckets.map(b => ({ name: b.name, public: b.public })),
            message: 'Storage access OK'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
