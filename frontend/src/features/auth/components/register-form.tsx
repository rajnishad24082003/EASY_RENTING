"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Building2, KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { fieldA11y, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api/auth";
import { getErrorMessage, isApiError } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/use-auth";
import { applyApiFieldErrors } from "@/lib/forms";
import { homeForRole, safeNextPath } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { registerSchema, type RegisterValues } from "../schemas";
import { AuthCard } from "./auth-card";

const ROLE_OPTIONS = [
  { value: "TENANT", label: "I'm looking to rent", icon: KeyRound },
  { value: "OWNER", label: "I'm a property owner", icon: Building2 },
] as const;

const FIELDS = ["name", "email", "phone", "password", "role"] as const;

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const { status, user } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const { register, handleSubmit, setError, control, setValue, formState } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      role: searchParams.get("role") === "OWNER" ? "OWNER" : "TENANT",
    },
  });
  const { errors } = formState;
  const role = useWatch({ control, name: "role" });

  const signup = useMutation({
    mutationFn: authApi.register,
    meta: { skipGlobalError: true },
    onError: (error) => {
      if (isApiError(error) && error.code === "CONFLICT") {
        setError("email", { message: "An account with this email already exists." });
        return;
      }
      if (!applyApiFieldErrors(error, setError, FIELDS)) setFormError(getErrorMessage(error));
    },
  });

  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(next ?? (user.role === "OWNER" ? "/dashboard/verification" : homeForRole(user.role)));
    }
  }, [status, user, next, router]);

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    signup.mutate(values);
  });

  return (
    <AuthCard
      title="Create your account"
      subtitle="Zero brokerage. Verified owners. Real homes."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
            className="font-medium text-brand-700 hover:underline"
          >
            Log in
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
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-zinc-800">Account type</legend>
          <div className="grid grid-cols-2 gap-2" role="radiogroup">
            {ROLE_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={role === value}
                onClick={() => setValue("role", value)}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-xl border p-3 text-left text-sm transition-colors",
                  role === value
                    ? "border-brand-600 bg-brand-50 text-brand-800 ring-1 ring-brand-600"
                    : "border-zinc-300 text-zinc-700 hover:border-zinc-400",
                )}
              >
                <Icon className="size-5" aria-hidden />
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <FormField label="Full name" htmlFor="name" error={errors.name?.message}>
          <Input autoComplete="name" {...fieldA11y("name", errors.name?.message)} {...register("name")} />
        </FormField>
        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            {...fieldA11y("email", errors.email?.message)}
            {...register("email")}
          />
        </FormField>
        <FormField
          label="Mobile number"
          htmlFor="phone"
          error={errors.phone?.message}
          hint="10-digit Indian mobile number"
        >
          <div className="flex">
            <span className="inline-flex items-center rounded-l-xl border border-r-0 border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-500">
              +91
            </span>
            <Input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              className="rounded-l-none"
              {...fieldA11y("phone", errors.phone?.message)}
              {...register("phone")}
            />
          </div>
        </FormField>
        <FormField
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
          hint="At least 8 characters with a letter and a number"
        >
          <Input
            type="password"
            autoComplete="new-password"
            {...fieldA11y("password", errors.password?.message)}
            {...register("password")}
          />
        </FormField>
        <Button type="submit" className="w-full" size="lg" loading={signup.isPending || signup.isSuccess}>
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
