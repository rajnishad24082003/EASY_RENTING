"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fieldA11y, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { usersApi } from "@/lib/api/auth";
import { getErrorMessage } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/use-auth";
import { formatDate } from "@/lib/format";
import { applyApiFieldErrors } from "@/lib/forms";
import { ROLE_LABELS, VERIFICATION_STATUS_LABELS } from "@/lib/labels";
import { profileSchema, type ProfileValues } from "@/features/auth/schemas";

export function ProfileForm() {
  const { user } = useAuth();
  const { register, handleSubmit, setError, reset, formState } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: { name: user?.name ?? "", phone: user?.phone ?? "" },
  });
  const { errors, isDirty } = formState;

  const update = useMutation({
    mutationFn: usersApi.updateMe,
    meta: { skipGlobalError: true },
    onSuccess: (updated) => {
      reset({ name: updated.name, phone: updated.phone });
      toast.success("Profile updated");
    },
    onError: (error) => {
      if (!applyApiFieldErrors(error, setError, ["name", "phone"])) toast.error(getErrorMessage(error));
    },
  });

  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-zinc-500">
          Your contact details are shared with owners/tenants once a visit is confirmed.
        </p>
      </div>
      <Card className="flex items-center gap-4 p-5">
        <Avatar name={user.name} src={user.avatarUrl} className="size-14 text-lg" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{user.name}</p>
          <p className="truncate text-sm text-zinc-500">{user.email}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge>{ROLE_LABELS[user.role]}</Badge>
            {user.role === "OWNER" && (
              <Badge variant={user.verificationStatus === "VERIFIED" ? "success" : "warning"}>
                {VERIFICATION_STATUS_LABELS[user.verificationStatus]}
              </Badge>
            )}
            <Badge variant="outline">Joined {formatDate(user.createdAt)}</Badge>
          </div>
        </div>
      </Card>
      <Card className="p-5">
        <form onSubmit={handleSubmit((values) => update.mutate(values))} noValidate className="space-y-4">
          <FormField label="Full name" htmlFor="profile-name" error={errors.name?.message} required>
            <Input autoComplete="name" {...fieldA11y("profile-name", errors.name?.message)} {...register("name")} />
          </FormField>
          <FormField label="Mobile number" htmlFor="profile-phone" error={errors.phone?.message} required>
            <Input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              autoComplete="tel-national"
              {...fieldA11y("profile-phone", errors.phone?.message)}
              {...register("phone")}
            />
          </FormField>
          <FormField label="Email" htmlFor="profile-email" hint="Email can't be changed.">
            <Input id="profile-email" value={user.email} disabled readOnly />
          </FormField>
          <div className="flex justify-end">
            <Button type="submit" disabled={!isDirty} loading={update.isPending}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
