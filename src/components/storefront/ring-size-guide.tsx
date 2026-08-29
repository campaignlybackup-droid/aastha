"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Ruler,
  Maximize2,
  X,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Search,
} from "lucide-react";

import { PageHeader } from "@/components/storefront/page-header";
import { Button } from "@/components/ui/button";

const RING_SIZES_TABLE = [
  { mm: 41, indian: 1, us: "1" },
  { mm: 42, indian: 2, us: "2" },
  { mm: 43, indian: 3, us: "2 ½" },
  { mm: 44, indian: 4, us: "3" },
  { mm: 45, indian: 5, us: "3 ¼" },
  { mm: 46, indian: 6, us: "3 ¾" },
  { mm: 47, indian: 7, us: "4" },
  { mm: 48, indian: 8, us: "4 ½" },
  { mm: 49, indian: 9, us: "5" },
  { mm: 50, indian: 10, us: "5 ½" },
  { mm: 51, indian: 11, us: "5 ¾" },
  { mm: 52, indian: 12, us: "6" },
  { mm: 53, indian: 13, us: "6 ½" },
  { mm: 54, indian: 14, us: "7" },
  { mm: 55, indian: 15, us: "7 ¼" },
  { mm: 56, indian: 16, us: "7 ½" },
  { mm: 57, indian: 17, us: "8" },
  { mm: 58, indian: 18, us: "8 ½" },
  { mm: 59, indian: 19, us: "8 ¾" },
  { mm: 60, indian: 20, us: "9" },
  { mm: 61, indian: 21, us: "9 ½" },
  { mm: 62, indian: 22, us: "10" },
  { mm: 63, indian: 23, us: "10 ¼" },
  { mm: 64, indian: 24, us: "10 ¾" },
  { mm: 65, indian: 25, us: "11" },
  { mm: 66, indian: 26, us: "11 ½" },
  { mm: 67, indian: 27, us: "12" },
];

export function RingSizeGuidePage({
  categoryName = "Measure Ring Size",
  categoryDescription,
}: {
  categoryName?: string;
  categoryDescription?: string | null;
}) {
  const [activeTab, setActiveTab] = React.useState<"guide" | "chart1" | "chart2">("guide");
  const [lightboxImg, setLightboxImg] = React.useState<{ src: string; title: string } | null>(null);
  const [selectedMm, setSelectedMm] = React.useState<number>(53);
  const [filterSearch, setFilterSearch] = React.useState<string>("");

  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Rings", href: "/category/rings" },
    { name: categoryName, href: "/category/measure-ring-size" },
  ];

  // Calculated size lookup
  const matchedSize = React.useMemo(() => {
    return (
      RING_SIZES_TABLE.find((item) => item.mm === selectedMm) || {
        mm: selectedMm,
        indian: Math.max(1, Math.min(27, Math.round(selectedMm - 40))),
        us: `${Math.max(1, Math.min(12, Math.round((selectedMm - 40) / 2)))}`,
      }
    );
  }, [selectedMm]);

  const filteredTable = React.useMemo(() => {
    if (!filterSearch.trim()) return RING_SIZES_TABLE;
    const q = filterSearch.toLowerCase().trim();
    return RING_SIZES_TABLE.filter(
      (row) =>
        row.mm.toString().includes(q) ||
        row.indian.toString().includes(q) ||
        row.us.toLowerCase().includes(q)
    );
  }, [filterSearch]);

  return (
    <div className="bg-sand-50/40 min-h-screen pb-20">
      <PageHeader
        crumbs={crumbs}
        eyebrow="Sizing Guide"
        title="Ring Size Chart & Measurement Guide"
        description={
          categoryDescription ||
          "Find your perfect fit in 925 Sterling Silver rings using our standard Indian & US size charts."
        }
      />

      <div className="u-container mt-8 space-y-12">
        {/* Interactive Quick Size Calculator */}
        <section className="rounded-2xl border border-gold-300/60 bg-surface p-6 sm:p-8 shadow-sm font-sans">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-gold-300/80 bg-gold-50/80 px-3 py-0.5 text-xs font-semibold text-gold-900 mb-2">
                <Sparkles className="size-3.5 text-gold-600" />
                <span>Instant Ring Size Calculator</span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl text-brand-950 font-normal">
                Select Your Finger Circumference
              </h2>
              <p className="text-xs sm:text-sm text-content-muted mt-1">
                Slide to your measured circumference in millimeters (mm) to get your exact Indian & US ring sizes.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-sand-100/80 rounded-xl px-4 py-3 border border-line">
              <Ruler className="size-5 text-gold-700 shrink-0" />
              <div>
                <div className="text-[10px] uppercase font-semibold text-content-subtle tracking-wider">
                  Circumference
                </div>
                <div className="text-lg font-bold text-brand-950 font-mono">
                  {selectedMm} mm
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            {/* Slider Controls */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between text-xs text-content-subtle font-mono">
                <span>41 mm (Size 1)</span>
                <span>54 mm (Size 14)</span>
                <span>67 mm (Size 27)</span>
              </div>

              <input
                type="range"
                min={41}
                max={67}
                value={selectedMm}
                onChange={(e) => setSelectedMm(Number(e.target.value))}
                className="w-full h-2.5 bg-sand-200 rounded-lg appearance-none cursor-pointer accent-gold-600"
              />

              {/* Number Buttons for Quick Jump */}
              <div className="flex flex-wrap gap-1.5 pt-2">
                {[46, 49, 51, 54, 56, 58, 60, 62].map((val) => (
                  <button
                    key={val}
                    onClick={() => setSelectedMm(val)}
                    className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
                      selectedMm === val
                        ? "border-gold-600 bg-gold-50 text-gold-900 font-semibold shadow-2xs"
                        : "border-line bg-surface text-content-muted hover:border-gold-300"
                    }`}
                  >
                    {val} mm
                  </button>
                ))}
              </div>
            </div>

            {/* Results Card */}
            <div className="rounded-xl border border-gold-300/80 bg-gradient-to-br from-gold-50/40 via-surface to-gold-50/20 p-5 space-y-3">
              <div className="text-xs font-semibold text-gold-900 uppercase tracking-wide">
                Your Recommended Size
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-lg bg-surface border border-line p-3 text-center shadow-2xs">
                  <div className="text-[10px] text-content-subtle font-semibold uppercase">
                    Indian Size
                  </div>
                  <div className="text-2xl font-bold text-brand-950 font-display">
                    {matchedSize.indian}
                  </div>
                </div>

                <div className="rounded-lg bg-surface border border-line p-3 text-center shadow-2xs">
                  <div className="text-[10px] text-content-subtle font-semibold uppercase">
                    US / Canada
                  </div>
                  <div className="text-2xl font-bold text-brand-950 font-display">
                    {matchedSize.us}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tab Navigation for 3 Reference Charts */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h2 className="font-display text-2xl text-brand-950 font-normal tracking-tight">
                Ring Size Reference Charts & Instructions
              </h2>
              <p className="text-xs sm:text-sm text-content-muted mt-1 font-sans">
                Click any image to enlarge in high resolution or switch tabs to view detailed measurement graphics.
              </p>
            </div>

            <Link
              href="/category/rings"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-sm bg-brand-900 px-4 py-2 text-xs font-medium text-white hover:bg-brand-800 transition-colors"
            >
              <span>Shop All Rings</span>
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab("guide")}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === "guide"
                  ? "bg-brand-900 text-white shadow-2xs"
                  : "bg-surface border border-line text-content-muted hover:border-gold-300"
              }`}
            >
              1. Step-by-Step Measurement Guide
            </button>
            <button
              onClick={() => setActiveTab("chart1")}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === "chart1"
                  ? "bg-brand-900 text-white shadow-2xs"
                  : "bg-surface border border-line text-content-muted hover:border-gold-300"
              }`}
            >
              2. Full Size Conversion Chart (Indian & US)
            </button>
            <button
              onClick={() => setActiveTab("chart2")}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === "chart2"
                  ? "bg-brand-900 text-white shadow-2xs"
                  : "bg-surface border border-line text-content-muted hover:border-gold-300"
              }`}
            >
              3. Diameter & Circumference Breakdown
            </button>
          </div>

          {/* 3 Main Display Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Card 1: Measure Guide Diagram */}
            <div
              className={`rounded-2xl border bg-surface p-4 shadow-sm transition-all overflow-hidden flex flex-col justify-between ${
                activeTab === "guide"
                  ? "border-gold-500 ring-2 ring-gold-200/50"
                  : "border-line hover:border-gold-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="rounded-full bg-gold-100/80 px-2.5 py-0.5 text-[10px] font-semibold text-gold-900">
                    Step-by-Step Guide
                  </span>
                  <button
                    onClick={() =>
                      setLightboxImg({
                        src: "/ring-size/measure-ring-guide.jpg",
                        title: "How to Measure Ring Size (4 Steps)",
                      })
                    }
                    className="inline-flex items-center gap-1 text-xs text-gold-700 hover:text-gold-900 font-medium"
                  >
                    <Maximize2 className="size-3.5" /> Enlarge
                  </button>
                </div>
                <h3 className="font-display text-lg text-brand-950 font-normal mb-1">
                  How to Measure at Home
                </h3>
                <p className="text-xs text-content-muted mb-4 font-sans">
                  Wrap a string or strip of paper around your finger, mark the point, and measure with a ruler.
                </p>

                <div
                  className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-sand-100 border border-line cursor-pointer group"
                  onClick={() =>
                    setLightboxImg({
                      src: "/ring-size/measure-ring-guide.jpg",
                      title: "How to Measure Ring Size (4 Steps)",
                    })
                  }
                >
                  <Image
                    src="/ring-size/measure-ring-guide.jpg"
                    alt="How to Measure Ring Size Diagram"
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="object-contain p-2 transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-brand-950/0 group-hover:bg-brand-950/10 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-surface/95 text-brand-950 px-3 py-1.5 rounded-full text-xs font-medium shadow-md flex items-center gap-1">
                      <Maximize2 className="size-3" /> Click to Zoom
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Full Ring Size Chart */}
            <div
              className={`rounded-2xl border bg-surface p-4 shadow-sm transition-all overflow-hidden flex flex-col justify-between ${
                activeTab === "chart1"
                  ? "border-gold-500 ring-2 ring-gold-200/50"
                  : "border-line hover:border-gold-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="rounded-full bg-gold-100/80 px-2.5 py-0.5 text-[10px] font-semibold text-gold-900">
                    Indian & US Sizes (1-27)
                  </span>
                  <button
                    onClick={() =>
                      setLightboxImg({
                        src: "/ring-size/ring-size-chart-full.jpg",
                        title: "Full Indian & US Ring Size Chart",
                      })
                    }
                    className="inline-flex items-center gap-1 text-xs text-gold-700 hover:text-gold-900 font-medium"
                  >
                    <Maximize2 className="size-3.5" /> Enlarge
                  </button>
                </div>
                <h3 className="font-display text-lg text-brand-950 font-normal mb-1">
                  Full Ring Size Conversion Chart
                </h3>
                <p className="text-xs text-content-muted mb-4 font-sans">
                  Circumference (mm) to Indian Ring Size and US/Canada equivalencies.
                </p>

                <div
                  className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-sand-100 border border-line cursor-pointer group"
                  onClick={() =>
                    setLightboxImg({
                      src: "/ring-size/ring-size-chart-full.jpg",
                      title: "Full Indian & US Ring Size Chart",
                    })
                  }
                >
                  <Image
                    src="/ring-size/ring-size-chart-full.jpg"
                    alt="Full Ring Size Chart"
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="object-contain p-2 transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-brand-950/0 group-hover:bg-brand-950/10 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-surface/95 text-brand-950 px-3 py-1.5 rounded-full text-xs font-medium shadow-md flex items-center gap-1">
                      <Maximize2 className="size-3" /> Click to Zoom
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Summary Chart */}
            <div
              className={`rounded-2xl border bg-surface p-4 shadow-sm transition-all overflow-hidden flex flex-col justify-between ${
                activeTab === "chart2"
                  ? "border-gold-500 ring-2 ring-gold-200/50"
                  : "border-line hover:border-gold-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="rounded-full bg-gold-100/80 px-2.5 py-0.5 text-[10px] font-semibold text-gold-900">
                    Diameter Reference
                  </span>
                  <button
                    onClick={() =>
                      setLightboxImg({
                        src: "/ring-size/ring-size-chart-summary.jpg",
                        title: "Diameter & Circumference Ring Size Chart",
                      })
                    }
                    className="inline-flex items-center gap-1 text-xs text-gold-700 hover:text-gold-900 font-medium"
                  >
                    <Maximize2 className="size-3.5" /> Enlarge
                  </button>
                </div>
                <h3 className="font-display text-lg text-brand-950 font-normal mb-1">
                  Diameter & Circumference Summary
                </h3>
                <p className="text-xs text-content-muted mb-4 font-sans">
                  Quick dimensions matrix in millimeters for standard ring sizes.
                </p>

                <div
                  className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-sand-100 border border-line cursor-pointer group"
                  onClick={() =>
                    setLightboxImg({
                      src: "/ring-size/ring-size-chart-summary.jpg",
                      title: "Diameter & Circumference Ring Size Chart",
                    })
                  }
                >
                  <Image
                    src="/ring-size/ring-size-chart-summary.jpg"
                    alt="Diameter & Circumference Summary Chart"
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="object-contain p-2 transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-brand-950/0 group-hover:bg-brand-950/10 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-surface/95 text-brand-950 px-3 py-1.5 rounded-full text-xs font-medium shadow-md flex items-center gap-1">
                      <Maximize2 className="size-3" /> Click to Zoom
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Searchable Data Table for Mobile & Complete Conversion */}
        <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-xl text-brand-950 font-normal">
                Complete Ring Size Table
              </h3>
              <p className="text-xs text-content-muted mt-0.5">
                Search by circumference (mm), Indian size, or US size.
              </p>
            </div>

            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-content-subtle" />
              <input
                type="text"
                placeholder="Search size (e.g. 53, Size 13, US 7)"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-line bg-sand-50/50 focus:bg-surface focus:outline-none focus:border-gold-500 font-sans"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-sand-100/70 border-b border-line text-brand-950 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">Circumference (mm)</th>
                  <th className="p-3">Indian Ring Size</th>
                  <th className="p-3">US / Canada Size</th>
                  <th className="p-3 text-right">Quick Selection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredTable.map((row) => (
                  <tr
                    key={row.mm}
                    className={`hover:bg-gold-50/30 transition-colors ${
                      selectedMm === row.mm ? "bg-gold-50/60 font-semibold" : ""
                    }`}
                  >
                    <td className="p-3 font-mono text-brand-950">{row.mm} mm</td>
                    <td className="p-3 font-medium text-brand-950">
                      Indian Size {row.indian}
                    </td>
                    <td className="p-3 text-content-muted">US Size {row.us}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedMm(row.mm)}
                        className="text-[11px] font-medium text-gold-700 hover:text-gold-900 underline"
                      >
                        Select {row.mm}mm
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="rounded-2xl bg-gradient-to-r from-brand-950 via-brand-900 to-brand-950 text-white p-8 sm:p-12 text-center space-y-4 shadow-md">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/40 bg-gold-400/10 px-3.5 py-1 text-xs font-semibold text-gold-200 uppercase tracking-wide font-sans">
            <Sparkles className="size-3.5 text-gold-300 shrink-0" />
            <span>Ready to Shop?</span>
          </div>

          <h2 className="font-display text-2xl sm:text-4xl text-sand-50 font-normal tracking-tight max-w-xl mx-auto">
            Explore Handcrafted 925 Sterling Silver Rings
          </h2>
          <p className="text-xs sm:text-sm text-sand-200/90 max-w-md mx-auto font-sans">
            Every order comes with a Certificate of Authenticity and free hallmarked silver guarantee.
          </p>

          <div className="pt-2">
            <Link
              href="/category/rings"
              className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-6 py-3 text-xs font-semibold text-brand-950 hover:bg-gold-400 transition-colors shadow-sm"
            >
              <span>Shop All 925 Silver Rings</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </div>

      {/* Lightbox Zoom Modal */}
      {lightboxImg ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-fadeIn"
          onClick={() => setLightboxImg(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] bg-surface rounded-2xl p-4 sm:p-6 overflow-hidden flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
              <h3 className="font-display text-lg text-brand-950 font-medium">
                {lightboxImg.title}
              </h3>
              <button
                onClick={() => setLightboxImg(null)}
                className="rounded-full p-1.5 text-content-muted hover:bg-sand-100 hover:text-brand-950 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="relative w-full h-[65vh] rounded-xl overflow-hidden bg-sand-50">
              <Image
                src={lightboxImg.src}
                alt={lightboxImg.title}
                fill
                sizes="100vw"
                className="object-contain"
                priority
              />
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-content-muted pt-2 border-t border-line">
              <span>Press ESC or click anywhere outside to close</span>
              <Button size="sm" variant="outline" onClick={() => setLightboxImg(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
