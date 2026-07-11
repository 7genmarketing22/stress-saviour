import { createClient } from "@/lib/supabase/client";

const BUCKET = "payout-receipts";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export function validatePayoutReceiptFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Only JPG, PNG, or PDF files are accepted.";
  }
  if (file.size > MAX_BYTES) {
    return "File must be smaller than 10 MB.";
  }
  return null;
}

export async function uploadPayoutReceipt(
  adminId: string,
  payoutReference: string,
  file: File,
): Promise<string> {
  const err = validatePayoutReceiptFile(file);
  if (err) throw new Error(err);

  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${adminId}/${payoutReference}/receipt.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}
