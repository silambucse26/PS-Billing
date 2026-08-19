-- ====================================================================
-- Pashu Central: Add Profile Avatar and Shop Logo Columns
-- Run this SQL in your Supabase Project -> SQL Editor
-- ====================================================================

-- 1. Add avatar_url column to profiles table (if not exists)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Add logo_url and image_url columns to shops table (if not exists)
ALTER TABLE public.shops
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 3. Reload schema cache for PostgREST API
NOTIFY pgrst, 'reload schema';
