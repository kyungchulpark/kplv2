-- ============================================================================
-- Migration 033: Fix avatar upload policies for hyphenated UUID filenames
-- ============================================================================

-- Drop old policies that relied on split_part('-')
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Users can upload avatars when the file is stored under avatars/ and
-- the filename begins with their 36-character UUID.
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = 'avatars'
    AND substring(storage.filename(name) from 1 for 36) = auth.uid()::text
  );

-- Users can update their own avatars
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND substring(storage.filename(name) from 1 for 36) = auth.uid()::text
  );

-- Users can delete their own avatars
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND substring(storage.filename(name) from 1 for 36) = auth.uid()::text
  );
