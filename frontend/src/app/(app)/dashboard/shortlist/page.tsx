import type { Metadata } from "next";
import { RequireAuth } from "@/lib/auth/require-auth";
import { ShortlistView } from "@/features/shortlist/components/shortlist-view";

export const metadata: Metadata = { title: "Shortlist" };

export default function ShortlistPage() {
  return (
    <RequireAuth roles={["TENANT"]}>
      <ShortlistView />
    </RequireAuth>
  );
}
