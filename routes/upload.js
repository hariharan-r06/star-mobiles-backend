import express from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

/**
 * POST /api/upload/image
 * Upload an image (stores as base64 in Supabase storage or returns data URL)
 * For production, you should use Supabase Storage or cloud storage like Cloudinary
 */
router.post('/image', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        // Check if request has the image in body as base64
        const { image, filename } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'No image provided' });
        }

        // If image is already a URL, return it
        if (image.startsWith('http://') || image.startsWith('https://')) {
            return res.json({ url: image });
        }

        // If image is base64 data URL, try to upload to Supabase storage
        if (image.startsWith('data:')) {
            try {
                // Extract base64 data
                const base64Data = image.split(',')[1];
                const mimeType = image.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
                const extension = mimeType.split('/')[1] || 'jpg';

                // Generate unique filename
                const fileName = `products/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;

                // Convert base64 to buffer
                const buffer = Buffer.from(base64Data, 'base64');

                // Upload to Supabase Storage
                const { data, error } = await supabaseAdmin.storage
                    .from('images')
                    .upload(fileName, buffer, {
                        contentType: mimeType,
                        cacheControl: '3600',
                        upsert: false
                    });

                if (error) {
                    console.log('Supabase storage upload error:', error.message);
                    // Fall back to returning the data URL
                    return res.json({ url: image });
                }

                // Get public URL
                const { data: { publicUrl } } = supabaseAdmin.storage
                    .from('images')
                    .getPublicUrl(fileName);

                return res.json({ url: publicUrl });
            } catch (storageError) {
                console.error('Storage error:', storageError);
                // Fall back to returning the data URL
                return res.json({ url: image });
            }
        }

        // If it's just base64 without data URL prefix, assume jpeg
        try {
            const extension = 'jpg';
            const fileName = `products/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;
            const buffer = Buffer.from(image, 'base64');

            const { data, error } = await supabaseAdmin.storage
                .from('images')
                .upload(fileName, buffer, {
                    contentType: 'image/jpeg',
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.log('Supabase storage upload error:', error.message);
                return res.status(400).json({ error: 'Failed to upload image' });
            }

            const { data: { publicUrl } } = supabaseAdmin.storage
                .from('images')
                .getPublicUrl(fileName);

            return res.json({ url: publicUrl });
        } catch (uploadError) {
            console.error('Upload error:', uploadError);
            return res.status(500).json({ error: 'Failed to upload image' });
        }

    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ error: 'Server error during upload' });
    }
});

export default router;
