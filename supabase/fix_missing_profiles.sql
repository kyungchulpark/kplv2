-- ============================================
-- Fix missing profiles for existing users
-- ============================================
-- This script creates profile entries for users who don't have one
-- Run this if you have users who signed up before the auto-create trigger was added

-- Insert profiles for users who don't have one
INSERT INTO public.profiles (id, email, role, created_at, updated_at)
SELECT
  au.id,
  au.email,
  'user', -- default role
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Show results
SELECT
  COUNT(*) as profiles_created
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Verify all users now have profiles
SELECT
  COUNT(DISTINCT au.id) as total_users,
  COUNT(DISTINCT p.id) as total_profiles,
  COUNT(DISTINCT au.id) - COUNT(DISTINCT p.id) as missing_profiles
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id;
