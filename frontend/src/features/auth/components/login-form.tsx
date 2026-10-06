"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { fieldA11y, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api/auth";
import { getErrorMessage, isApiError } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/use-auth";
import { applyApiFieldErrors } from "@/lib/forms";
import { homeForRole, safeNextPath } from "@/lib/navigation";
import { loginSchema, type LoginValues } from "../schemas";
import { AuthCard } from "./auth-card";

const DEMO_PASSWORD = "Password@123";
const DEMO_ACCOUNTS = [
  { label: "Tenant", email: "tenant@easyrenting.in" },
  { label: "Owner", email: "owner@easyrenting.in" },
  { label: "Admin", email: "admin@easyrenting.in" },
];

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const { status, user } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const { register, handleSubmit, setError, setValue, formState } = form;
  const { errors } = formState;

  const login = useMutation({
    mutationFn: authApi.login,
    meta: { skipGlobalError: true },
    onError: (error) => {
      if (!applyApiFieldErrors(error, setError, ["email", "password"])) {
        setFormError(
          isApiError(error) && error.status === 401 ? "Incorrect email or password." : getErrorMessage(error),
        );
      }
    },
  });

  // Already signed in (or just signed in): leave the login page.
  useEffect(() => {
    if (status === "authenticated" && user) router.replace(next ?? homeForRole(user.role));
  }, [status, user, next, router]);

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    login.mutate(values);
  });

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to shortlist homes, chat with owners and manage visits."
      footer={
        <>
          New to EasyRenting?{" "}
          <Link
            href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
            className="font-medium text-brand-700 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </p>
        )}
        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            {...fieldA11y("email", errors.email?.message)}
            {...register("email")}
          />
        </FormField>
        <FormField label="Password" htmlFor="password" error={errors.password?.message}>
          <Input
            type="password"
            autoComplete="current-password"
            {...fieldA11y("password", errors.password?.message)}
            {...register("password")}
          />
        </FormField>
        <Button type="submit" className="w-full" size="lg" loading={login.isPending || login.isSuccess}>
          Log in
        </Button>
      </form>

      <div className="mt-6 rounded-xl bg-zinc-50 p-3">
        <p className="text-xs font-medium text-zinc-600">Demo accounts (password {DEMO_PASSWORD})</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <Button
              key={account.email}
              variant="outline"
              size="sm"
              onClick={() => {
                setValue("email", account.email, { shouldValidate: true });
                setValue("password", DEMO_PASSWORD, { shouldValidate: true });
              }}
            >
              {account.label}
            </Button>
          ))}
        </div>
      </div>
    </AuthCard>
  );
}
