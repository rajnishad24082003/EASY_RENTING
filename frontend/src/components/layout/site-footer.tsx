import Link from "next/link";
import { CITIES } from "@/lib/constants";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="space-y-3 md:col-span-2">
          <Logo />
          <p className="max-w-sm text-sm text-zinc-500">
            Rent directly from verified owners. Zero brokerage, honest listings, and visits scheduled in a couple of
            taps.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Popular cities</h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">
            {CITIES.map((city) => (
              <li key={city.name}>
                <Link href={`/search?city=${encodeURIComponent(city.name)}`} className="hover:text-zinc-900">
                  Rentals in {city.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">EasyRenting</h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">
            <li>
              <Link href="/search" className="hover:text-zinc-900">
                Find a home
              </Link>
            </li>
            <li>
              <Link href="/register?role=OWNER" className="hover:text-zinc-900">
                List your property
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-zinc-900">
                Log in
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} EasyRenting. Built as a portfolio project.
      </div>
    </footer>
  );
}
