import { createClient } from "@/lib/supabase/client";

const BUCKET = "doctor-certificates";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export function validateCertificateFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Only JPEG, PNG, WebP images and PDF files are allowed.";
  }
  if (file.size > MAX_BYTES) {
    return "File must be smaller than 10 MB.";
  }
  return null;
}

export async function uploadDoctorCertificate(
  userId: string,
  file: File
): Promise<{ id: string; name: string; url: string; uploaded_at: string }> {
  const validationError = validateCertificateFile(file);
  if (validationError) throw new Error(validationError);

  const supabase = createClient();
  const id = crypto.randomUUID();
  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const path = `${userId}/${id}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return {
    id,
    name: file.name,
    url: data.publicUrl,
    uploaded_at: new Date().toISOString(),
  };
}

export async function removeDoctorCertificate(
  userId: string,
  certId: string,
  fileName: string
): Promise<void> {
  const supabase = createClient();
  const ext = fileName.split(".").pop()?.toLowerCase() || "pdf";
  const path = `${userId}/${certId}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
