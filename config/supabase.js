import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load .env from current directory
dotenv.config();

// Read environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables!');
    console.error('   Make sure .env file exists with:');
    console.error('   - VITE_SUPABASE_URL');
    console.error('   - VITE_SUPABASE_ANON_KEY');
    throw new Error('Missing Supabase environment variables');
}

// Client for public operations (uses anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for privileged operations (uses service key)
export const supabaseAdmin = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : supabase;

console.log('✅ Supabase client initialized');
console.log(`   URL: ${supabaseUrl}`);

export default supabase;
