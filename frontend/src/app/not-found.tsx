import { MapPinOff } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-4 py-20">
      <EmptyState
        className="w-full"
        icon={MapPinOff}
        title="Page not found"
        description="The page you're looking for doesn't exist or may have moved."
        action={
          <div className="flex gap-2">
            <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Go home
            </Link>
            <Link href="/search" className={buttonVariants({ size: "sm" })}>
              Browse rentals
            </Link>
          </div>
        }
      />
    </main>
  );
}
