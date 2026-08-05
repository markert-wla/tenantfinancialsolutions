-- Add attachments column to coach_messages
-- Stores an array of {name, path, size, mime_type} objects for files
-- attached by coaches when sending messages to clients
ALTER TABLE public.coach_messages
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- ---------------------------------------------------------------------------
-- Storage bucket: coach-documents
-- Coaches upload files here when messaging clients
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'coach-documents',
  'coach-documents',
  false,
  10485760,  -- 10 MB hard limit per file
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Coaches and admins can upload files
CREATE POLICY "coach_docs_storage_insert"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'coach-documents'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('coach', 'admin')
    )
  );

-- File path format: {coachId}/{clientId}/{timestamp}-{filename}
-- Coaches/admins can read all; clients can read files in their sub-folder
CREATE POLICY "coach_docs_storage_select"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'coach-documents'
    AND auth.role() = 'authenticated'
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('coach', 'admin')
      )
      OR (storage.foldername(name))[2] = auth.uid()::text
    )
  );

-- Coaches and admins can delete files
CREATE POLICY "coach_docs_storage_delete"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'coach-documents'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('coach', 'admin')
    )
  );
