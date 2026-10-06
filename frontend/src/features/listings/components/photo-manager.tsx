"use client";

import { ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { PropertyImage } from "@/components/property-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useProperty, usePropertyImages } from "@/features/properties/hooks";
import { cn } from "@/lib/utils";

export const MAX_IMAGES = 15;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Splits picked files into uploadable ones and human-readable rejection reasons. */
export function validateImageFiles(files: File[], existingCount: number): { accepted: File[]; errors: string[] } {
  const accepted: File[] = [];
  const errors: string[] = [];
  for (const file of files) {
    if (!IMAGE_TYPES.includes(file.type)) errors.push(`${file.name}: only JPEG, PNG or WebP images are allowed`);
    else if (file.size > MAX_IMAGE_BYTES) errors.push(`${file.name}: larger than 5 MB`);
    else if (existingCount + accepted.length >= MAX_IMAGES)
      errors.push(`${file.name}: a listing can have at most ${MAX_IMAGES} photos`);
    else accepted.push(file);
  }
  return { accepted, errors };
}

interface PendingPreview {
  key: string;
  url: string;
}

export function PhotoManager({ propertyId }: { propertyId: string }) {
  const { data: property, isPending, isError, error, refetch } = useProperty(propertyId);
  const { upload, remove, setCover } = usePropertyImages(propertyId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [previews, setPreviews] = useState<PendingPreview[]>([]);

  const images = [...(property?.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const { accepted, errors } = validateImageFiles(Array.from(fileList), images.length + previews.length);
    errors.forEach((message) => toast.error(message));
    if (accepted.length === 0) return;
    const pending = accepted.map((file, i) => ({ key: `${Date.now()}-${i}`, url: URL.createObjectURL(file) }));
    setPreviews((prev) => [...prev, ...pending]);
    upload.mutate(accepted, {
      onSuccess: () => toast.success(`${accepted.length} photo${accepted.length > 1 ? "s" : ""} uploaded`),
      onSettled: () => {
        pending.forEach((p) => URL.revokeObjectURL(p.url));
        setPreviews((prev) => prev.filter((p) => !pending.some((q) => q.key === p.key)));
      },
    });
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  if (isPending) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />;

  const remaining = MAX_IMAGES - images.length - previews.length;

  return (
    <div className="space-y-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragging ? "border-brand-500 bg-brand-50" : "border-zinc-300 bg-zinc-50/50",
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm">
          <ImagePlus className="size-6" aria-hidden />
        </span>
        <div>
          <p className="font-medium">Drag & drop photos here</p>
          <p className="text-sm text-zinc-500">
            JPEG, PNG or WebP · up to 5 MB each · {remaining} of {MAX_IMAGES} remaining
          </p>
        </div>
        <Button variant="outline" size="sm" disabled={remaining <= 0} onClick={() => inputRef.current?.click()}>
          Choose files
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_TYPES.join(",")}
          multiple
          className="sr-only"
          aria-label="Upload photos"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {(images.length > 0 || previews.length > 0) && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, i) => (
            <li key={image.id} className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-zinc-100">
              <PropertyImage src={image.url} alt={`Photo ${i + 1}`} sizes="25vw" />
              {image.cover && (
                <Badge variant="dark" className="absolute top-2 left-2">
                  <Star aria-hidden /> Cover
                </Badge>
              )}
              <div className="absolute inset-x-2 bottom-2 flex justify-end gap-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                {!image.cover && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white/95"
                    loading={setCover.isPending && setCover.variables === image.id}
                    onClick={() => setCover.mutate(image.id)}
                  >
                    Set cover
                  </Button>
                )}
                <Button
                  size="icon-sm"
                  variant="outline"
                  className="bg-white/95"
                  aria-label={`Delete photo ${i + 1}`}
                  loading={remove.isPending && remove.variables === image.id}
                  onClick={() => remove.mutate(image.id)}
                >
                  <Trash2 className="text-red-600" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
          {previews.map((preview) => (
            <li key={preview.key} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-zinc-100">
              {/* Local blob preview; next/image can't optimise object URLs. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.url} alt="Uploading" className="size-full object-cover opacity-60" />
              <span className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="size-6 animate-spin text-white drop-shadow" aria-label="Uploading" />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
