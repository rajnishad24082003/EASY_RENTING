"use client";

import { SendHorizontal } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";

const MAX_LENGTH = 2000;

export function MessageComposer({
  onSend,
  onTyping,
  disabled,
}: {
  onSend: (content: string) => void;
  onTyping: () => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const send = () => {
    const content = value.trim();
    if (!content || disabled) return;
    onSend(content);
    setValue("");
    requestAnimationFrame(resize);
    ref.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  };

  return (
    <form
      className="flex items-end gap-2 border-t border-zinc-200 bg-white p-3"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <label htmlFor="message-input" className="sr-only">
        Type a message
      </label>
      <textarea
        id="message-input"
        ref={ref}
        rows={1}
        value={value}
        maxLength={MAX_LENGTH}
        disabled={disabled}
        placeholder="Type a message…"
        onChange={(e) => {
          setValue(e.target.value);
          resize();
          if (e.target.value) onTyping();
        }}
        onKeyDown={onKeyDown}
        className="max-h-40 min-h-10 flex-1 resize-none rounded-xl border border-zinc-300 px-3 py-2 text-sm focus-visible:border-brand-500 focus-visible:ring-4 focus-visible:ring-brand-500/15 focus-visible:outline-none"
      />
      <Button type="submit" size="icon" disabled={!value.trim() || disabled} aria-label="Send message">
        <SendHorizontal aria-hidden />
      </Button>
    </form>
  );
}
