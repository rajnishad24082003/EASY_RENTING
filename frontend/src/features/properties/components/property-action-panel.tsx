"use client";

import { CalendarPlus, MessageSquare, Pencil } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PropertyDetailDto } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/use-auth";
import { formatINR } from "@/lib/format";
import { loginHref } from "@/lib/navigation";
import { useStartConversation } from "@/features/chat/hooks";
import { ShortlistButton } from "@/features/shortlist/components/shortlist-button";
import { ScheduleVisitForm } from "@/features/visits/components/schedule-visit-form";

function ChatWithOwnerButton({ property }: { property: PropertyDetailDto }) {
  const router = useRouter();
  const start = useStartConversation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(`Hi ${property.owner.name.split(" ")[0]}, is this home still available?`);

  const send = () =>
    start.mutate(
      { propertyId: property.id, message: message.trim() },
      { onSuccess: (conversation) => router.push(`/messages/${conversation.id}`) },
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <MessageSquare aria-hidden /> Chat with owner
      </Button>
      <DialogContent title={`Message ${property.owner.name}`} description={property.title}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="first-message">Your message</Label>
          <Textarea
            id="first-message"
            rows={4}
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button disabled={!message.trim()} loading={start.isPending || start.isSuccess} onClick={send}>
            Send message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PropertyActionPanel({ property }: { property: PropertyDetailDto }) {
  const { user, status } = useAuth();
  const pathname = usePathname();
  const isOwnerOfListing = !!user && user.id === property.owner.id;
  const isAdmin = user?.role === "ADMIN";

  return (
    <Card className="space-y-5 p-5">
      <div>
        <p className="text-2xl font-semibold">
          {formatINR(property.rent)}
          <span className="text-base font-normal text-zinc-500">/month</span>
        </p>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-zinc-50 p-2.5">
            <dt className="text-xs text-zinc-500">Deposit</dt>
            <dd className="font-medium">{formatINR(property.deposit)}</dd>
          </div>
          <div className="rounded-lg bg-zinc-50 p-2.5">
            <dt className="text-xs text-zinc-500">Maintenance</dt>
            <dd className="font-medium">
              {property.maintenance ? `${formatINR(property.maintenance)}/mo` : "Included"}
            </dd>
          </div>
        </dl>
      </div>

      {status === "loading" ? null : isOwnerOfListing || isAdmin ? (
        <div className="space-y-2">
          <Link href={`/dashboard/listings/${property.id}/edit`} className={buttonVariants({ className: "w-full" })}>
            <Pencil aria-hidden /> Edit listing
          </Link>
          <p className="text-center text-xs text-zinc-500">
            {isOwnerOfListing ? "This is your listing." : "You're viewing as an admin."} {property.viewCount} views so
            far.
          </p>
        </div>
      ) : user?.role === "TENANT" ? (
        <>
          <div>
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <CalendarPlus className="size-4 text-brand-600" aria-hidden /> Schedule a visit
            </h2>
            <ScheduleVisitForm propertyId={property.id} />
          </div>
          <div className="flex gap-2 border-t border-zinc-100 pt-4">
            <div className="flex-1">
              <ChatWithOwnerButton property={property} />
            </div>
            <ShortlistButton propertyId={property.id} shortlisted={property.shortlisted} variant="inline" />
          </div>
        </>
      ) : user ? (
        <p className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">
          Owner accounts can&apos;t book visits or message other owners. Log in with a tenant account to contact this
          owner.
        </p>
      ) : (
        <div className="space-y-2">
          <Link href={loginHref(pathname)} className={buttonVariants({ className: "w-full" })}>
            <CalendarPlus aria-hidden /> Log in to schedule a visit
          </Link>
          <Link href={loginHref(pathname)} className={buttonVariants({ variant: "outline", className: "w-full" })}>
            <MessageSquare aria-hidden /> Chat with owner
          </Link>
          <p className="text-center text-xs text-zinc-500">
            New here?{" "}
            <Link
              href={`/register?next=${encodeURIComponent(pathname)}`}
              className="font-medium text-brand-700 underline"
            >
              Create a free account
            </Link>
          </p>
        </div>
      )}
    </Card>
  );
}
