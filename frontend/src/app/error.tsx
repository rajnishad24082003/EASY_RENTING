"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function GlobalRouteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-4 py-20">
      <EmptyState
        className="w-full"
        tone="danger"
        icon={AlertTriangle}
        title="Something went wrong"
        description="An unexpected error occurred while rendering this page."
        action={<Button onClick={() => retry()}>Try again</Button>}
      />
    </main>
  );
}
