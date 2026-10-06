"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SidebarNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match only the exact path (for index routes). */
  exact?: boolean;
}

interface SidebarLayoutProps {
  title: string;
  items: SidebarNavItem[];
  banner?: ReactNode;
  children: ReactNode;
}

/** Sidebar on desktop, horizontally scrollable tab bar on mobile. */
export function SidebarLayout({ title, items, banner, children }: SidebarLayoutProps) {
  const pathname = usePathname();
  const isActive = (item: SidebarNavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col md:flex-row">
      <aside className="border-b border-zinc-200 md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <nav aria-label={title} className="md:sticky md:top-16 md:p-4">
          <p className="hidden px-3 pt-2 pb-3 text-xs font-semibold tracking-wider text-zinc-400 uppercase md:block">
            {title}
          </p>
          <ul className="flex gap-1 overflow-x-auto px-4 py-2 md:flex-col md:p-0">
            {items.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <li key={item.href} className="shrink-0">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                      active ? "bg-brand-50 text-brand-700" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {banner}
        {children}
      </div>
    </div>
  );
}
