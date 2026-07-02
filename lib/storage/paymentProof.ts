import { createClient } from "@/lib/supabase/client";

const BUCKET = "payment-proofs";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function validatePaymentProofFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Please upload a JPEG, PNG, WebP, or GIF screenshot.";
  }
  if (file.size > MAX_BYTES) {
    return "Screenshot must be smaller than 5MB.";
  }
  return null;
}

export async function uploadPaymentProof(
  patientId: string,
  paymentId: string,
  file: File
): Promise<string> {
  const validationError = validatePaymentProofFile(file);
  if (validationError) throw new Error(validationError);

  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${patientId}/${paymentId}/proof.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}
