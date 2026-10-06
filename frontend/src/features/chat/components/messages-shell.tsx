"use client";

import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { RequireAuth } from "@/lib/auth/require-auth";
import { cn } from "@/lib/utils";
import { ConversationList } from "./conversation-list";

/** Two-pane inbox on desktop; on mobile shows either the list or the open thread. */
export function MessagesShell({ children }: { children: ReactNode }) {
  const params = useParams<{ id?: string }>();
  const activeId = params.id ?? null;

  return (
    <RequireAuth>
      <div className="mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-7xl md:px-6 md:py-6">
        <div className="flex min-h-0 flex-1 overflow-hidden bg-white md:rounded-2xl md:border md:border-zinc-200 md:shadow-(--shadow-card)">
          <aside
            className={cn(
              "w-full min-w-0 flex-col border-r border-zinc-200 md:flex md:w-80 lg:w-96",
              activeId ? "hidden" : "flex",
            )}
          >
            <h1 className="border-b border-zinc-200 px-4 py-3.5 text-lg font-semibold">Messages</h1>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ConversationList activeId={activeId} />
            </div>
          </aside>
          <section className={cn("min-w-0 flex-1 flex-col", activeId ? "flex" : "hidden md:flex")}>{children}</section>
        </div>
      </div>
    </RequireAuth>
  );
}
