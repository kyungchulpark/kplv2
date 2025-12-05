# Supabase Storage Setup Guide

This guide covers setting up Supabase Storage for team logo uploads in the KPL system.

## 📦 Storage Bucket Creation

### 1. Create the `team-logos` Bucket

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **New bucket**
5. Configure the bucket:
   - **Name**: `team-logos`
   - **Public bucket**: ✅ **Checked** (logos need to be publicly accessible)
   - **File size limit**: 2 MB
   - **Allowed MIME types**: `image/*` (PNG, JPG, WEBP, etc.)

### 2. Set Up Row Level Security (RLS) Policies

After creating the bucket, set up RLS policies for security:

#### Policy 1: Public Read Access
Anyone can view team logos (required for public website display).

```sql
CREATE POLICY "Public Access to Team Logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'team-logos');
```

**Steps in Dashboard:**
1. Go to Storage → team-logos → Policies
2. Click **New Policy**
3. Template: **Custom Policy**
4. Name: `Public Access to Team Logos`
5. Allowed operation: `SELECT`
6. Policy definition:
   ```sql
   bucket_id = 'team-logos'
   ```

#### Policy 2: Authenticated Upload
Only authenticated users can upload logos.

```sql
CREATE POLICY "Authenticated Users Can Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'team-logos'
  AND auth.role() = 'authenticated'
);
```

**Steps in Dashboard:**
1. New Policy → **Custom Policy**
2. Name: `Authenticated Users Can Upload`
3. Allowed operation: `INSERT`
4. WITH CHECK clause:
   ```sql
   bucket_id = 'team-logos' AND auth.role() = 'authenticated'
   ```

#### Policy 3: User Can Update Own Files
Users can update their own uploaded files.

```sql
CREATE POLICY "Users Can Update Own Files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'team-logos'
  AND auth.uid() = owner
);
```

**Steps in Dashboard:**
1. New Policy → **Custom Policy**
2. Name: `Users Can Update Own Files`
3. Allowed operation: `UPDATE`
4. USING clause:
   ```sql
   bucket_id = 'team-logos' AND auth.uid() = owner
   ```

#### Policy 4: Admin Delete Access
Only admins can delete logos.

```sql
CREATE POLICY "Admins Can Delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'team-logos'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

**Steps in Dashboard:**
1. New Policy → **Custom Policy**
2. Name: `Admins Can Delete`
3. Allowed operation: `DELETE`
4. USING clause:
   ```sql
   bucket_id = 'team-logos' AND EXISTS (
     SELECT 1 FROM profiles
     WHERE profiles.id = auth.uid()
     AND profiles.role = 'admin'
   )
   ```

---

## 🔧 Configuration Summary

| Setting | Value |
|---------|-------|
| Bucket Name | `team-logos` |
| Public Access | ✅ Yes (for viewing) |
| Max File Size | 2 MB |
| Allowed Types | `image/*` |
| Upload Auth | Authenticated users only |
| Delete Auth | Admins only |

---

## 📝 Usage in Code

### Upload Example
```typescript
import { createClient } from "@/utils/supabase/client";

async function uploadTeamLogo(file: File) {
  const supabase = createClient();

  // Check file size (2MB limit)
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("File size must be less than 2MB");
  }

  // Generate unique filename
  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random()}.${fileExt}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from("team-logos")
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from("team-logos")
    .getPublicUrl(fileName);

  return publicUrl;
}
```

### Display Example
```tsx
<img
  src={team.logo_url}
  alt={team.name}
  className="h-8 w-8 object-contain"
/>
```

---

## ✅ Verification Checklist

After setup, verify the following:

- [ ] Bucket `team-logos` exists and is public
- [ ] RLS policies are enabled (4 policies total)
- [ ] Unauthenticated users can view logos (test with public URL)
- [ ] Authenticated users can upload logos (test via `/teams/create`)
- [ ] Non-admins cannot delete logos (test fails as expected)
- [ ] Admins can delete logos (test via admin panel)
- [ ] File size limit is enforced (2MB max)

---

## 🔍 Testing

### Test Public Access
```bash
curl https://your-project-id.supabase.co/storage/v1/object/public/team-logos/test.png
```
Should return the image file.

### Test Upload (via browser console)
```javascript
const supabase = createClient();
const file = document.querySelector('input[type="file"]').files[0];

supabase.storage
  .from('team-logos')
  .upload('test.png', file)
  .then(console.log);
```

---

## 🚨 Troubleshooting

### Issue: "403 Forbidden" on upload
- **Cause**: User not authenticated or RLS policy missing
- **Fix**: Ensure user is logged in and INSERT policy exists

### Issue: "413 Payload Too Large"
- **Cause**: File exceeds 2MB limit
- **Fix**: Compress image before upload or reject in client

### Issue: Public URL returns 404
- **Cause**: Bucket not set to public
- **Fix**: Edit bucket settings → Enable public access

### Issue: Old logo not deleted after new upload
- **Expected behavior**: Old files remain unless manually deleted
- **Best practice**: Delete old file before uploading new one

---

## 📚 Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [RLS Policy Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage API Reference](https://supabase.com/docs/reference/javascript/storage-from-upload)

---

**Last Updated**: 2025-12-05
**Status**: Ready for Implementation
