-- Update handle_new_user function to set psn_id to NULL by default
-- This ensures new users are redirected to the profile setup page
-- to properly enter their PSN ID and trigger legacy profile merging if needed

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, psn_id, youtube_channel, role, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'psn_id', -- Default to NULL if not provided (removed email fallback)
    NEW.raw_user_meta_data->>'youtube_channel',
    'user',
    true, -- New users are active by default
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
