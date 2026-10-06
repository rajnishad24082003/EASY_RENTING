import type { Metadata } from "next";
import { RequireAuth } from "@/lib/auth/require-auth";
import { EditListing } from "@/features/listings/components/edit-listing";

export const metadata: Metadata = { title: "Edit listing" };

export default async function EditListingPage({ params }: PageProps<"/dashboard/listings/[id]/edit">) {
  const { id } = await params;
  return (
    <RequireAuth roles={["OWNER", "ADMIN"]}>
      <EditListing id={id} />
    </RequireAuth>
  );
}
