import { Home } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const OPTIMIZABLE_HOSTS = ["https://images.unsplash.com/"];

interface PropertyImageProps {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}

/**
 * Fills its (relatively positioned) parent. Unsplash seed images go through the Next image optimizer;
 * uploaded images (`/api/v1/files/...`, proxied to the backend) are served as-is.
 */
export function PropertyImage({ src, alt, sizes, className, priority }: PropertyImageProps) {
  if (!src) {
    return (
      <div className={cn("absolute inset-0 flex items-center justify-center bg-zinc-100 text-zinc-400", className)}>
        <Home className="size-8" aria-hidden />
        <span className="sr-only">{alt}</span>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={!OPTIMIZABLE_HOSTS.some((host) => src.startsWith(host))}
      className={cn("object-cover", className)}
    />
  );
}
