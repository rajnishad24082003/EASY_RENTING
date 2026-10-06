import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSpinner } from "@/components/ui/spinner";
import { MessagesShell } from "@/features/chat/components/messages-shell";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesLayout({ children }: LayoutProps<"/messages">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <MessagesShell>{children}</MessagesShell>
    </Suspense>
  );
}
