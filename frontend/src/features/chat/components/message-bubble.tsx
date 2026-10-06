import { AlertCircle, Check, CheckCheck, Clock } from "lucide-react";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "../cache";

function DeliveryStatus({ message }: { message: ChatMessage }) {
  if (message.pending) return <Clock className="size-3.5" aria-label="Sending" />;
  if (message.readAt) return <CheckCheck className="size-3.5 text-sky-300" aria-label="Read" />;
  return <Check className="size-3.5" aria-label="Sent" />;
}

export function MessageBubble({
  message,
  mine,
  onRetry,
}: {
  message: ChatMessage;
  mine: boolean;
  onRetry: (message: ChatMessage) => void;
}) {
  return (
    <div className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap shadow-xs sm:max-w-[65%]",
          mine ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md bg-zinc-100 text-zinc-900",
          message.failed && "bg-red-100 text-red-900",
        )}
      >
        {message.content}
        <span
          className={cn(
            "mt-0.5 flex items-center justify-end gap-1 text-[10px]",
            mine && !message.failed ? "text-white/75" : "text-zinc-500",
          )}
        >
          {formatTime(message.createdAt)}
          {mine && !message.failed && <DeliveryStatus message={message} />}
        </span>
      </div>
      {message.failed && (
        <button
          type="button"
          onClick={() => onRetry(message)}
          className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"
        >
          <AlertCircle className="size-3.5" aria-hidden /> Not sent · Retry
        </button>
      )}
    </div>
  );
}
