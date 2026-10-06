"use client";

import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { PropertyImage } from "@/components/property-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { PropertyImageDto } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/** Cover-first image grid with a keyboard-navigable lightbox. */
export function PropertyGallery({ images, title }: { images: PropertyImageDto[]; title: string }) {
  const ordered = [...images].sort((a, b) => Number(b.cover) - Number(a.cover) || a.sortOrder - b.sortOrder);
  const [index, setIndex] = useState<number | null>(null);

  if (ordered.length === 0) {
    return (
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-zinc-100 sm:aspect-[21/9]">
        <PropertyImage src={null} alt={title} sizes="100vw" />
      </div>
    );
  }

  const go = (delta: number) => setIndex((i) => (i === null ? i : (i + delta + ordered.length) % ordered.length));
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight") go(1);
    if (event.key === "ArrowLeft") go(-1);
  };
  const thumbs = ordered.slice(1, 5);

  return (
    <>
      <div className="relative grid h-64 grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl sm:h-[26rem]">
        <button
          type="button"
          onClick={() => setIndex(0)}
          className={cn("relative row-span-2 bg-zinc-100", thumbs.length ? "col-span-4 sm:col-span-2" : "col-span-4")}
          aria-label="Open photo 1"
        >
          <PropertyImage src={ordered[0].url} alt={title} sizes="(min-width: 640px) 50vw, 100vw" priority />
        </button>
        {thumbs.map((image, i) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setIndex(i + 1)}
            className={cn("relative hidden bg-zinc-100 sm:block", thumbs.length === 1 && "col-span-2 row-span-2")}
            aria-label={`Open photo ${i + 2}`}
          >
            <PropertyImage src={image.url} alt="" sizes="25vw" className="transition-opacity hover:opacity-90" />
          </button>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="absolute right-3 bottom-3 bg-white/95"
          onClick={() => setIndex(0)}
        >
          <Images aria-hidden /> {ordered.length} photo{ordered.length === 1 ? "" : "s"}
        </Button>
      </div>

      <Dialog open={index !== null} onOpenChange={(open) => !open && setIndex(null)}>
        <DialogContent
          title={`${title} — photo ${(index ?? 0) + 1} of ${ordered.length}`}
          hideTitle
          className="max-w-5xl bg-zinc-950 p-2 sm:p-4"
          onKeyDown={onKeyDown}
        >
          {index !== null && (
            <div className="relative aspect-[4/3] w-full sm:aspect-[16/10]">
              <PropertyImage
                src={ordered[index].url}
                alt={`Photo ${index + 1} of ${title}`}
                sizes="90vw"
                className="object-contain"
              />
              {ordered.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-white/90"
                    onClick={() => go(-1)}
                    aria-label="Previous photo"
                  >
                    <ChevronLeft aria-hidden />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-white/90"
                    onClick={() => go(1)}
                    aria-label="Next photo"
                  >
                    <ChevronRight aria-hidden />
                  </Button>
                </>
              )}
              <p className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                {index + 1} / {ordered.length}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
