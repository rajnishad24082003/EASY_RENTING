import type { Metadata } from "next";
import { AdminListings } from "@/features/admin/components/admin-listings";

export const metadata: Metadata = { title: "Listings" };

export default function AdminListingsPage() {
  return <AdminListings />;
}
