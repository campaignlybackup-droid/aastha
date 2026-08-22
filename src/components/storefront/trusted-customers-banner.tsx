import * as React from "react";
import { Award, CheckCircle, Heart, ShieldCheck, Star, Truck, Users } from "lucide-react";

export function TrustedCustomersBanner() {
  return (
    <section className="w-full bg-gradient-to-b from-sand-50/60 via-surface-sunken to-sand-50/40 py-12 md:py-16 border-y border-line-subtle">
      <div className="u-container">
        {/* --- Top Trust Badge & Heading -------------------------------- */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-800 shadow-2xs">
            <ShieldCheck className="size-3.5 text-emerald-600" aria-hidden="true" />
            <span>Trusted Across India</span>
          </div>

          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-sand-950 sm:text-4xl">
            Trusted by 2,000+ Happy Customers
          </h2>

          <p className="mt-2.5 text-sm leading-relaxed text-content-muted sm:text-base">
            Join thousands of jewellery lovers who trust Aastha for authentic, hallmarked 925 sterling silver craftsmanship.
          </p>

          {/* --- Rating & Customer Avatars ------------------------------- */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <div className="flex -space-x-2 overflow-hidden">
              <div className="inline-block size-9 rounded-full ring-2 ring-white bg-amber-100 flex items-center justify-center font-display text-xs font-bold text-amber-900 shadow-2xs">
                AN
              </div>
              <div className="inline-block size-9 rounded-full ring-2 ring-white bg-emerald-100 flex items-center justify-center font-display text-xs font-bold text-emerald-900 shadow-2xs">
                PS
              </div>
              <div className="inline-block size-9 rounded-full ring-2 ring-white bg-rose-100 flex items-center justify-center font-display text-xs font-bold text-rose-900 shadow-2xs">
                RK
              </div>
              <div className="inline-block size-9 rounded-full ring-2 ring-white bg-indigo-100 flex items-center justify-center font-display text-xs font-bold text-indigo-900 shadow-2xs">
                MD
              </div>
              <div className="inline-block size-9 rounded-full ring-2 ring-white bg-brand-800 text-sand-50 flex items-center justify-center text-[10px] font-bold shadow-2xs">
                2k+
              </div>
            </div>

            <div className="flex items-center gap-2 text-left">
              <div className="flex text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="size-4 fill-amber-400 stroke-amber-500" />
                ))}
              </div>
              <span className="text-xs font-semibold text-sand-900">
                4.9/5 <span className="font-normal text-content-muted">(500+ Verified Reviews)</span>
              </span>
            </div>
          </div>
        </div>

        {/* --- 4 Key Trust Pillars Grid ---------------------------------- */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TrustCard
            icon={Award}
            title="925 Certified Silver"
            description="Every piece comes hallmarked with an authenticity guarantee certificate."
          />
          <TrustCard
            icon={Truck}
            title="Insured Express Shipping"
            description="Pan-India delivery across 25,000+ pincodes with safe tamper-proof packing."
          />
          <TrustCard
            icon={Heart}
            title="2,000+ Satisfied Buyers"
            description="Loved for exquisite craftsmanship, durability, and premium finish."
          />
          <TrustCard
            icon={CheckCircle}
            title="Hassle-Free 7-Day Returns"
            description="Shop with confidence with our transparent return and exchange policy."
          />
        </div>
      </div>
    </section>
  );
}

function TrustCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-xl border border-line/70 bg-surface-raised p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-accent)] hover:shadow-md">
      <div className="mb-3.5 flex size-10 items-center justify-center rounded-lg bg-sand-100 text-[var(--color-accent)] transition-colors group-hover:bg-[var(--color-accent)] group-hover:text-white">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <h3 className="font-display text-base font-semibold text-sand-950">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-content-muted">{description}</p>
    </div>
  );
}
