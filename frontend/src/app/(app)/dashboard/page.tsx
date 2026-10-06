import type { Metadata } from "next";
import { RoleHomeRedirect } from "@/components/layout/role-home-redirect";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return <RoleHomeRedirect />;
}
