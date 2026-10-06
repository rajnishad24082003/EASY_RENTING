"use client";

import { MessageSquare, Plus, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useChatUnreadCount } from "@/features/chat/hooks";
import { CountBadge, NotificationBell } from "@/features/notifications/components/notification-bell";
import { useAuth } from "@/lib/auth/use-auth";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { UserMenu } from "./user-menu";

export function SiteHeader() {
  const { status, user } = useAuth();
  const pathname = usePathname();
  const { data: unreadMessages } = useChatUnreadCount(status === "authenticated");
  const showListCta = !user || user.role === "OWNER";

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Logo />
        <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Main">
          <Link
            href="/search"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              pathname.startsWith("/search") && "bg-zinc-100 text-zinc-900",
            )}
          >
            <Search aria-hidden /> Find a home
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/search"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}
            aria-label="Search homes"
          >
            <Search className="size-5!" aria-hidden />
          </Link>
          {showListCta && (
            <Link
              href={user ? "/dashboard/listings/new" : "/register?role=OWNER"}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden sm:inline-flex")}
            >
              <Plus aria-hidden /> List your property
            </Link>
          )}

          {status === "loading" ? (
            <Skeleton className="size-9 rounded-full" />
          ) : user ? (
            <>
              <NotificationBell />
              <Link
                href="/messages"
                aria-label="Messages"
                className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")}
              >
                <MessageSquare className="size-5!" aria-hidden />
                <CountBadge count={unreadMessages} label={`${unreadMessages} unread messages`} />
              </Link>
              <UserMenu user={user} />
            </>
          ) : (
            <>
              <Link
                href={
                  pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/register")
                    ? "/login"
                    : `/login?next=${encodeURIComponent(pathname)}`
                }
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Log in
              </Link>
              <Link href="/register" className={buttonVariants({ size: "sm" })}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
