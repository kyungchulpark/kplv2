-- Update handle_new_user function to include youtube_channel
-- This allows users to optionally provide their YouTube channel during signup

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, psn_id, youtube_channel, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'psn_id', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'youtube_channel', -- Extract youtube_channel from user metadata
    'user',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
