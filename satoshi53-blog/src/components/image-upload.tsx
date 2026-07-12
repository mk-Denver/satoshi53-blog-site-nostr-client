"use client";

import { useState, useRef } from "react";
import { Upload, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadImage } from "@/lib/upload";

/**
 * Image upload field with fallback URL input.
 * Writers can either upload from their computer (via nostr.build)
 * or paste a URL directly.
 */
export function ImageUpload({
  value,
  onChange,
  sk,
  label,
  placeholder,
}: {
  value: string;
  onChange: (url: string) => void;
  sk: Uint8Array | null;
  label: string;
  placeholder?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!sk) {
      setError("Sign in as a writer to upload images.");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    // Validate size (10MB max for nostr.build)
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10MB.");
      return;
    }

    setError(null);
    setUploading(true);
    const res = await uploadImage({ sk, file });
    setUploading(false);

    if (!res.ok || !res.url) {
      setError(res.error || "Upload failed.");
      return;
    }

    onChange(res.url);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 block">{label}</label>
      <div className="flex flex-col gap-2">
        {value && (
          <div className="relative rounded-[var(--radius)] border border-border overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="Preview" className="w-full max-h-48 object-cover" />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
            id={`file-${label.replace(/\s/g, "-").toLowerCase()}`}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading || !sk}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" /> Upload from computer
              </>
            )}
          </Button>
          {!sk && (
            <span className="text-xs text-muted-foreground self-center">
              Sign in as writer to upload
            </span>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "Paste a URL or upload an image..."}
        />
      </div>
    </div>
  );
}
