"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Upload, ImageIcon, X } from "lucide-react";
import { validatePaymentProofFile } from "@/lib/storage/paymentProof";

interface PaymentProofUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  currentPreview?: string | null;
}

export function PaymentProofUpload({
  onFileSelect,
  disabled,
  currentPreview,
}: PaymentProofUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentPreview ?? null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validatePaymentProofFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setPreview(URL.createObjectURL(file));
    onFileSelect(file);
  };

  const clear = () => {
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        disabled={disabled}
        onChange={handleChange}
      />
      {preview ? (
        <div className="relative rounded-lg border border-border overflow-hidden bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Payment proof preview" className="w-full max-h-48 object-contain" />
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-8 w-8 p-0 bg-background/80"
              onClick={clear}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-border hover:border-brand-300 hover:bg-brand-50/50 transition-colors disabled:opacity-50"
        >
          <div className="h-10 w-10 rounded-full bg-brand-50 flex items-center justify-center">
            <Upload className="h-5 w-5 text-brand-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Upload payment screenshot</p>
            <p className="text-xs text-muted-foreground mt-0.5">JPEG, PNG or WebP · Max 5MB</p>
          </div>
        </button>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {!preview && !error && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <ImageIcon className="h-3 w-3" />
          Screenshot must clearly show amount, date, and recipient account.
        </p>
      )}
    </div>
  );
}
