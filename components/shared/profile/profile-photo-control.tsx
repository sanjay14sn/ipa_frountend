"use client";

import { useRef } from "react";
import { Camera, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ExpandableImage } from "../file-preview/expandable-image";
import { AvatarMonogram, type AvatarSize } from "./avatar-monogram";

export interface ProfilePhotoControlProps {
  /** Used for the initials fallback while no photo is stored. */
  name?: string | null;
  /** Renderable photo URL (from uploadedFileSrc), or null when none stored. */
  src: string | null;
  onSelectFile: (file: File) => void;
  onRemove: () => void;
  isBusy?: boolean;
  disabled?: boolean;
  size?: AvatarSize;
  /** Click the photo to view it full size. Default true (when a photo exists). */
  expandable?: boolean;
  className?: string;
}

/**
 * Kit control: avatar preview + hidden file input + replace/remove actions.
 * Props-only (PORT-01) — validation, mutations, and toasts live in the
 * domain component that renders it.
 */
export function ProfilePhotoControl({
  name,
  src,
  onSelectFile,
  onRemove,
  isBusy = false,
  disabled = false,
  size = "lg",
  expandable = true,
  className,
}: ProfilePhotoControlProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blocked = isBusy || disabled;

  return (
    <div
      data-testid="profile-photo-control"
      className={cn("flex items-center gap-3", className)}
    >
      {expandable && src ? (
        <ExpandableImage
          src={src}
          alt={name ? `${name} photo` : "Profile photo"}
          filename={name || "profile-photo"}
          className="shrink-0 rounded-full"
        >
          <AvatarMonogram name={name} src={src} size={size} />
        </ExpandableImage>
      ) : (
        <AvatarMonogram name={name} src={src} size={size} />
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelectFile(file);
          // Reset so picking the same file again re-fires onChange.
          e.target.value = "";
        }}
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={blocked}
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
            {isBusy ? "Uploading…" : src ? "Replace photo" : "Upload photo"}
          </Button>
          {src ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={blocked}
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          JPEG, PNG or WebP · up to 5 MB
        </p>
      </div>
    </div>
  );
}
