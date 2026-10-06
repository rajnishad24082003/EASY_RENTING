import { ArrowRight, BadgeCheck, CalendarCheck, IndianRupee, MessageSquare } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { FeaturedListings } from "@/features/search/components/featured-listings";
import { HeroSearch } from "@/features/search/components/hero-search";
import { CITIES } from "@/lib/constants";

const STEPS = [
  {
    icon: BadgeCheck,
    title: "Verified owners only",
    body: "Every owner is ID-verified by our team before their listings go live. No fake listings, no middlemen.",
  },
  {
    icon: IndianRupee,
    title: "Zero brokerage",
    body: "Deal directly with the owner. Save a month's rent you'd otherwise pay a broker.",
  },
  {
    icon: MessageSquare,
    title: "Chat & schedule visits",
    body: "Message owners in real time and book a visit slot that suits you — all in one place.",
  },
];

const CITY_GRADIENTS = ["from-brand-500 to-orange-400", "from-sky-600 to-cyan-400", "from-violet-600 to-fuchsia-400"];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 size-[48rem] -translate-x-1/2 rounded-full bg-brand-200/30 blur-3xl"
        />
        <div className="relative mx-auto max-w-4xl px-4 pt-16 pb-20 text-center sm:px-6 sm:pt-24">
          <p className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white/70 px-3 py-1 text-xs font-medium text-brand-700">
            <BadgeCheck className="size-3.5" aria-hidden /> Zero brokerage · Verified owners
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance text-zinc-900 sm:text-6xl">
            Find a home you&apos;ll love, <span className="text-brand-600">without the broker</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-pretty text-zinc-600">
            Describe what you&apos;re looking for in plain words. Our smart search turns it into filters and finds
            matching homes from verified owners.
          </p>
          <div className="mx-auto mt-8 max-w-3xl text-left">
            <HeroSearch />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6" aria-labelledby="cities-heading">
        <h2 id="cities-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Explore by city
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {CITIES.map((city, i) => (
            <Link
              key={city.name}
              href={`/search?city=${encodeURIComponent(city.name)}`}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${CITY_GRADIENTS[i % CITY_GRADIENTS.length]} p-6 text-white shadow-(--shadow-card) transition-transform hover:-translate-y-0.5`}
            >
              <p className="text-2xl font-semibold">{city.name}</p>
              <p className="mt-1 text-sm text-white/80">{city.tagline}</p>
              <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium">
                Browse rentals{" "}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <FeaturedListings />

      <section className="border-y border-zinc-200 bg-zinc-50" aria-labelledby="how-heading">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 id="how-heading" className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            How EasyRenting works
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-(--shadow-card)">
                <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-zinc-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-zinc-900 p-8 text-white sm:flex-row sm:items-center sm:p-12">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Own a property?</h2>
            <p className="mt-2 max-w-lg text-zinc-300">
              List it for free, get verified once, and connect with genuine tenants. Manage visits and chats from your
              dashboard.
            </p>
          </div>
          <Link href="/register?role=OWNER" className={buttonVariants({ size: "lg" })}>
            <CalendarCheck aria-hidden /> List your property
          </Link>
        </div>
      </section>
    </>
  );
}
