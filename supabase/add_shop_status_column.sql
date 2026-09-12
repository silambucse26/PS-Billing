-- ====================================================================
-- Pashu Central: Add Status Column to Shops Table
-- Run this SQL in your Supabase Project -> SQL Editor
-- ====================================================================

-- 1. Add status column to shops table with default 'pending'
ALTER TABLE public.shops
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 2. Reload schema cache for PostgREST API
NOTIFY pgrst, 'reload schema';
