-- Coach message attachments table
CREATE TABLE IF NOT EXISTS public.coach_message_attachments (
  id          uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id  uuid         NOT NULL REFERENCES public.coach_messages(id) ON DELETE CASCADE,
  coach_id    uuid         NOT NULL REFERENCES public.profiles(id),
  client_id   uuid         NOT NULL REFERENCES public.profiles(id),
  file_name   text         NOT NULL,
  file_path   text         NOT NULL,
  file_size   bigint,
  mime_type   text,
  created_at  timestamptz  DEFAULT now() NOT NULL
);

ALTER TABLE public.coach_message_attachments ENABLE ROW LEVEL SECURITY;

-- Coaches can manage their own attachments
CREATE POLICY "coach_msg_attachments_coach"
  ON public.coach_message_attachments
  FOR ALL
  USING  (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Clients can view attachments sent to them
CREATE POLICY "coach_msg_attachments_client_view"
  ON public.coach_message_attachments
  FOR SELECT
  USING (client_id = auth.uid());

-- Admins can view all
CREATE POLICY "coach_msg_attachments_admin_view"
  ON public.coach_message_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- Storage bucket: coach-documents (private, 10 MB, restricted file types)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'coach-documents',
  'coach-documents',
  false,
  10485760, -- 10 MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Coaches upload to their own top-level folder
CREATE POLICY "coach_docs_storage_insert"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'coach-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Coaches delete their own files
CREATE POLICY "coach_docs_storage_delete"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'coach-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Coaches can read their own files; clients can read files sent to them
CREATE POLICY "coach_docs_storage_select"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'coach-documents'
    AND auth.role() = 'authenticated'
    AND (
      -- Coach who uploaded it
      (storage.foldername(name))[1] = auth.uid()::text
      -- Client the file was sent to
      OR EXISTS (
        SELECT 1 FROM public.coach_message_attachments
        WHERE file_path = name
          AND client_id = auth.uid()
      )
      -- Admins
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );
