import type { Metadata } from "next";
import { RequireAuth } from "@/lib/auth/require-auth";
import { ListingWizard } from "@/features/listings/components/listing-wizard";

export const metadata: Metadata = { title: "New listing" };

export default function NewListingPage() {
  return (
    <RequireAuth roles={["OWNER"]}>
      <ListingWizard />
    </RequireAuth>
  );
}
