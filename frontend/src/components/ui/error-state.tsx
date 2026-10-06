import { AlertTriangle } from "lucide-react";
import { getErrorMessage } from "@/lib/api/errors";
import { Button } from "./button";
import { EmptyState } from "./empty-state";

export function ErrorState({
  error,
  onRetry,
  title = "Couldn't load this",
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <EmptyState
      tone="danger"
      icon={AlertTriangle}
      title={title}
      description={getErrorMessage(error)}
      className={className}
      action={
        onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )
      }
    />
  );
}
