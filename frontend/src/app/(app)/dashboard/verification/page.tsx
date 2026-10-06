import type { Metadata } from "next";
import { RequireAuth } from "@/lib/auth/require-auth";
import { VerificationView } from "@/features/verification/components/verification-view";

export const metadata: Metadata = { title: "Owner verification" };

export default function VerificationPage() {
  return (
    <RequireAuth roles={["OWNER"]}>
      <VerificationView />
    </RequireAuth>
  );
}
