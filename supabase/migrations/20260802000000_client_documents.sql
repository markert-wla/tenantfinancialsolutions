-- Create client_documents table
CREATE TABLE IF NOT EXISTS public.client_documents (
  id          uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id   uuid         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name   text         NOT NULL,
  file_path   text         NOT NULL,
  file_size   bigint,
  mime_type   text,
  uploaded_at timestamptz  DEFAULT now() NOT NULL
);

ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- Clients can manage their own documents
CREATE POLICY "client_documents_own"
  ON public.client_documents
  FOR ALL
  USING  (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

-- Coaches and admins can view any client's documents
CREATE POLICY "client_documents_coach_view"
  ON public.client_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('coach', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- Storage bucket
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-documents',
  'client-documents',
  false,
  5242880,  -- 5 MB hard limit
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: clients upload to their own sub-folder
CREATE POLICY "client_docs_storage_insert"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'client-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage RLS: clients read their own; coaches/admins read all
CREATE POLICY "client_docs_storage_select"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'client-documents'
    AND auth.role() = 'authenticated'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('coach', 'admin')
      )
    )
  );

-- Storage RLS: clients delete only their own files
CREATE POLICY "client_docs_storage_delete"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'client-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
