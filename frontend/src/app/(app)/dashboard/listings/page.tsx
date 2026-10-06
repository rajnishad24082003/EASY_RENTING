import type { Metadata } from "next";
import { RequireAuth } from "@/lib/auth/require-auth";
import { MyListingsView } from "@/features/listings/components/my-listings-view";

export const metadata: Metadata = { title: "My listings" };

export default function ListingsPage() {
  return (
    <RequireAuth roles={["OWNER"]}>
      <MyListingsView />
    </RequireAuth>
  );
}
