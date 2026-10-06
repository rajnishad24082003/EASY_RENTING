import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSpinner } from "@/components/ui/spinner";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = { title: "Create an account" };

export default function RegisterPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <RegisterForm />
    </Suspense>
  );
}
