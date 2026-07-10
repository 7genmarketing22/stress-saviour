"use client";

import { FileText, X } from "lucide-react";

interface AttachmentPreviewProps {
  file: File;
  onRemove: () => void;
}

export function AttachmentPreview({ file, onRemove }: AttachmentPreviewProps) {
  const isImage = file.type.startsWith("image/");
  const sizeKb = (file.size / 1024).toFixed(1);
  const previewUrl = isImage ? URL.createObjectURL(file) : null;

  return (
    <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/50 border border-border w-fit max-w-full">
      {isImage && previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="preview"
          className="w-10 h-10 rounded-lg object-cover shrink-0"
          onLoad={() => URL.revokeObjectURL(previewUrl)}
        />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-primary" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
        <p className="text-[10px] text-muted-foreground">{sizeKb} KB</p>
      </div>

      <button
        onClick={onRemove}
        className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
        title="Remove"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
