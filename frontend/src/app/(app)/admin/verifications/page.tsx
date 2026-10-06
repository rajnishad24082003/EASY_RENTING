import type { Metadata } from "next";
import { AdminVerifications } from "@/features/admin/components/admin-verifications";

export const metadata: Metadata = { title: "Verifications" };

export default function AdminVerificationsPage() {
  return <AdminVerifications />;
}
