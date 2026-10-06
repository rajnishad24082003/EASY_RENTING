"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check, Rocket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch, type Control } from "react-hook-form";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getErrorMessage, isApiError } from "@/lib/api/errors";
import type { PropertyStatus } from "@/lib/api/types";
import { bhkLabel, formatDate, formatINR } from "@/lib/format";
import { applyApiFieldErrors } from "@/lib/forms";
import {
  AMENITY_LABELS,
  FURNISHING_LABELS,
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  TENANT_PREFERENCE_LABELS,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import { useProperty, useSaveProperty, useSetPropertyStatus } from "@/features/properties/hooks";
import { PROPERTY_STATUS_BADGE } from "@/features/properties/status-badge";
import {
  ALL_FIELDS,
  emptyListingValues,
  listingSchema,
  STEP_FIELDS,
  toPropertyRequest,
  type ListingField,
  type ListingValues,
} from "../schema";
import { BasicsStep, DetailsStep, LocationStep, PricingStep, type StepProps } from "./listing-steps";
import { PhotoManager } from "./photo-manager";

const STEPS = [
  { id: "basics", title: "Basics", description: "What kind of home is it?" },
  { id: "location", title: "Location", description: "Where is it? Pin it on the map." },
  { id: "details", title: "Details & amenities", description: "Furnishing, availability and facilities." },
  { id: "pricing", title: "Pricing", description: "Rent, deposit and maintenance." },
  { id: "photos", title: "Photos", description: "Listings with photos get far more responses." },
  { id: "review", title: "Review", description: "Check everything before publishing." },
] as const;

const PRICING_STEP = 3;
const PHOTOS_STEP = 4;
const REVIEW_STEP = 5;

function stepOfField(field: string): number {
  const index = Object.values(STEP_FIELDS).findIndex((fields) => (fields as readonly string[]).includes(field));
  return index === -1 ? 0 : index;
}

interface ListingWizardProps {
  propertyId?: string;
  initialValues?: ListingValues;
  initialStatus?: PropertyStatus;
}

export function ListingWizard({ propertyId, initialValues, initialStatus }: ListingWizardProps) {
  const router = useRouter();
  const isEdit = !!propertyId;
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(isEdit ? REVIEW_STEP : 0);
  const [savedId, setSavedId] = useState(propertyId);
  const [status, setStatus] = useState<PropertyStatus | undefined>(initialStatus);
  const save = useSaveProperty();
  const setPropertyStatus = useSetPropertyStatus();

  const { register, control, setValue, trigger, setError, handleSubmit, formState } = useForm<ListingValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: initialValues ?? emptyListingValues(),
    mode: "onTouched",
  });
  const stepProps: StepProps = { register, control, errors: formState.errors, setValue };

  const goTo = (next: number) => {
    setStep(next);
    setMaxStep((m) => Math.max(m, next));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const persist = handleSubmit(
    (values) => {
      // New listings start as drafts until published from the review step. On update, resend
      // DRAFT/ACTIVE so the backend's "default ACTIVE" can't silently publish a draft.
      const nextStatus = !savedId ? "DRAFT" : status === "DRAFT" || status === "ACTIVE" ? status : undefined;
      save.mutate(
        { id: savedId, body: toPropertyRequest(values, nextStatus) },
        {
          onSuccess: (detail) => {
            setSavedId(detail.id);
            setStatus(detail.status);
            toast.success(savedId ? "Changes saved" : "Draft saved — now add some photos");
            goTo(PHOTOS_STEP);
          },
          onError: (error) => {
            if (applyApiFieldErrors(error, setError, ALL_FIELDS) && isApiError(error)) {
              const firstField = error.fieldErrors.find((e) => (ALL_FIELDS as string[]).includes(e.field))?.field ?? "";
              setStep(stepOfField(firstField));
              toast.error("Please fix the highlighted fields.");
            } else {
              toast.error(getErrorMessage(error));
            }
          },
        },
      );
    },
    (errors) => setStep(stepOfField(Object.keys(errors)[0] ?? "")),
  );

  const next = async () => {
    if (step < PRICING_STEP) {
      const fields = Object.values(STEP_FIELDS)[step] as readonly ListingField[];
      if (await trigger([...fields])) goTo(step + 1);
    } else if (step === PRICING_STEP) {
      await persist();
    } else if (step === PHOTOS_STEP) {
      goTo(REVIEW_STEP);
    }
  };

  const finish = (publish: boolean) => {
    if (!savedId) return;
    if (!publish) {
      router.push("/dashboard/listings");
      return;
    }
    setPropertyStatus.mutate(
      { id: savedId, status: "ACTIVE" },
      {
        onSuccess: () => {
          toast.success("Listing published", {
            description: "It will be visible to tenants once your account is verified.",
          });
          router.push("/dashboard/listings");
        },
      },
    );
  };

  const current = STEPS[step];
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{isEdit ? "Edit listing" : "List a new property"}</h1>
        <p className="text-sm text-zinc-500">
          Step {step + 1} of {STEPS.length} · {current.description}
        </p>
      </div>

      <ol className="flex gap-1 overflow-x-auto pb-1" aria-label="Listing steps">
        {STEPS.map((s, i) => {
          const reachable = i <= maxStep && (i < PHOTOS_STEP || !!savedId);
          return (
            <li key={s.id} className="min-w-0 flex-1">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => setStep(i)}
                aria-current={i === step ? "step" : undefined}
                className="group flex w-full min-w-24 flex-col gap-1.5 text-left disabled:cursor-not-allowed"
              >
                <span
                  className={cn(
                    "h-1.5 rounded-full",
                    i <= step ? "bg-brand-600" : i <= maxStep ? "bg-brand-200" : "bg-zinc-200",
                  )}
                />
                <span className={cn("truncate text-xs font-medium", i === step ? "text-zinc-900" : "text-zinc-500")}>
                  {i + 1}. {s.title}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <Card className="p-5 sm:p-6">
        <h2 className="mb-5 text-lg font-semibold">{current.title}</h2>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void next();
          }}
        >
          {step === 0 && <BasicsStep {...stepProps} />}
          {step === 1 && <LocationStep {...stepProps} />}
          {step === 2 && <DetailsStep {...stepProps} />}
          {step === 3 && <PricingStep {...stepProps} />}
          {step === PHOTOS_STEP && savedId && <PhotoManager propertyId={savedId} />}
          {step === REVIEW_STEP && savedId && <ReviewStep control={control} propertyId={savedId} status={status} />}

          <div className="mt-8 flex flex-col-reverse gap-2 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-between">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
              <ArrowLeft aria-hidden /> Back
            </Button>
            {step < REVIEW_STEP ? (
              <Button type="submit" loading={save.isPending}>
                {step === PRICING_STEP
                  ? isEdit || savedId
                    ? "Save & continue"
                    : "Save draft & add photos"
                  : "Continue"}
                <ArrowRight aria-hidden />
              </Button>
            ) : status === "ACTIVE" ? (
              <Button onClick={() => finish(false)}>
                <Check aria-hidden /> Done
              </Button>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={() => finish(false)}>
                  {status === "DRAFT" ? "Keep as draft" : "Done"}
                </Button>
                <Button loading={setPropertyStatus.isPending} onClick={() => finish(true)}>
                  <Rocket aria-hidden /> Publish listing
                </Button>
              </div>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}

function ReviewStep({
  control,
  propertyId,
  status,
}: {
  control: Control<ListingValues>;
  propertyId: string;
  status: PropertyStatus | undefined;
}) {
  const v = useWatch({ control }) as Partial<ListingValues>;
  const { data: property } = useProperty(propertyId);
  const rows: [string, string][] = [
    ["Title", v.title ?? ""],
    ["Type", `${bhkLabel(v.bhk ?? 0, v.propertyType)} ${v.propertyType ? PROPERTY_TYPE_LABELS[v.propertyType] : ""}`],
    ["Bathrooms / area", `${v.bathrooms ?? "–"} bath · ${v.areaSqft ?? "–"} sq.ft`],
    ["Address", [v.addressLine, v.locality, v.city, v.state, v.pincode].filter(Boolean).join(", ")],
    ["Furnishing", v.furnishing ? FURNISHING_LABELS[v.furnishing] : "–"],
    ["Preferred tenants", v.tenantPreference ? TENANT_PREFERENCE_LABELS[v.tenantPreference] : "–"],
    ["Available from", v.availableFrom ? formatDate(v.availableFrom) : "–"],
    ["Rent", v.rent !== undefined ? `${formatINR(v.rent)}/month` : "–"],
    ["Deposit", v.deposit !== undefined ? formatINR(v.deposit) : "–"],
    ["Maintenance", v.maintenance ? `${formatINR(v.maintenance)}/month` : "Included"],
    ["Amenities", v.amenities?.length ? v.amenities.map((a) => AMENITY_LABELS[a]).join(", ") : "None"],
    ["Photos", property ? `${property.images.length} uploaded` : "…"],
  ];
  return (
    <div className="space-y-4">
      {status && (
        <p className="flex items-center gap-2 text-sm text-zinc-600">
          Current status: <Badge variant={PROPERTY_STATUS_BADGE[status]}>{PROPERTY_STATUS_LABELS[status]}</Badge>
        </p>
      )}
      <dl className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-3">
            <dt className="text-sm text-zinc-500">{label}</dt>
            <dd className="text-sm text-zinc-900 sm:col-span-2">{value}</dd>
          </div>
        ))}
      </dl>
      {property && property.images.length === 0 && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Tip: listings without photos get very few enquiries. Go back a step to add some.
        </p>
      )}
    </div>
  );
}
