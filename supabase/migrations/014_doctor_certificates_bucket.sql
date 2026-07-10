-- Doctor certificates/degree document storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'doctor-certificates',
  'doctor-certificates',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Certificates are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'doctor-certificates');

CREATE POLICY "Doctors can upload their own certificates"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'doctor-certificates'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Doctors can delete their own certificates"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'doctor-certificates'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
