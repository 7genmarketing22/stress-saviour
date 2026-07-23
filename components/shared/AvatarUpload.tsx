"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";

interface AvatarUploadProps {
  name: string;
  avatarUrl?: string | null;
  onUpload: (file: File) => Promise<void>;
  onError?: (message: string) => void;
  size?: "lg" | "xl";
  className?: string;
  hint?: string;
}

export function AvatarUpload({
  name,
  avatarUrl,
  onUpload,
  onError,
  size = "lg",
  className,
  hint = "Click to upload photo",
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await onUpload(file);
    } catch (err) {
      onError?.(getErrorMessage(err, "Failed to upload avatar"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="relative group rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-70"
        aria-label="Upload profile photo"
      >
        <UserAvatar name={name} avatarUrl={avatarUrl} size={size} ring />
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : (
            <Camera className="h-5 w-5 text-white" />
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleChange}
          className="hidden"
        />
      </button>
      <p className="text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}
