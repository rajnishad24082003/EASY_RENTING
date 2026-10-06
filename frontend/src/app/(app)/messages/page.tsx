import { MessagesSquare } from "lucide-react";

export default function MessagesIndexPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-zinc-500">
      <span className="flex size-14 items-center justify-center rounded-full bg-zinc-100">
        <MessagesSquare className="size-7" aria-hidden />
      </span>
      <p className="font-medium text-zinc-800">Select a conversation</p>
      <p className="max-w-xs text-sm">Pick a chat from the list to read and reply to messages.</p>
    </div>
  );
}
