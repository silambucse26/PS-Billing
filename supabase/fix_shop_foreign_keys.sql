-- Fix Foreign Key Constraint for profiles.shop_id
-- Run this in your Supabase SQL Editor to allow shop deletion without foreign key violations.

-- 1. Drop existing restrictive constraint if present
ALTER TABLE IF EXISTS public.profiles
  DROP CONSTRAINT IF EXISTS profiles_shop_id_fkey;

-- 2. Re-add constraint with ON DELETE SET NULL
-- When a shop is deleted, any profile linked to that shop will have shop_id automatically set to NULL.
ALTER TABLE IF EXISTS public.profiles
  ADD CONSTRAINT profiles_shop_id_fkey
  FOREIGN KEY (shop_id)
  REFERENCES public.shops(id)
  ON DELETE SET NULL;

-- 3. Also ensure franchise_id on profiles has ON DELETE SET NULL
ALTER TABLE IF EXISTS public.profiles
  DROP CONSTRAINT IF EXISTS profiles_franchise_id_fkey;

ALTER TABLE IF EXISTS public.profiles
  ADD CONSTRAINT profiles_franchise_id_fkey
  FOREIGN KEY (franchise_id)
  REFERENCES public.franchises(id)
  ON DELETE SET NULL;
