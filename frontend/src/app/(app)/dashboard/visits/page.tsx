import type { Metadata } from "next";
import { RequireAuth } from "@/lib/auth/require-auth";
import { VisitsView } from "@/features/visits/components/visits-view";

export const metadata: Metadata = { title: "Visits" };

export default function VisitsPage() {
  return (
    <RequireAuth roles={["TENANT", "OWNER"]}>
      <VisitsView />
    </RequireAuth>
  );
}
