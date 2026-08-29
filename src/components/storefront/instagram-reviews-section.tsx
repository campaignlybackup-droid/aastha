"use client";

import * as React from "react";
import Image from "next/image";
import { CheckCircle2, Heart, ShieldCheck, Sparkles } from "lucide-react";

/** Custom SVG Instagram Icon */
function InstagramIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export type IgReview = {
  id?: string;
  imageSrc?: string;
  chatSnippet?: string;
  timeAgo?: string;
};

const IG_REVIEWS: IgReview[] = [
  {
    id: "ig-1",
    imageSrc: "/reviews/ig-chat-1.jpg",
    chatSnippet: "Hey! Received my Rukmini Temple Jhumkas today. Quality is stunning and the 925 stamp is genuine! Thank you ❤️",
    timeAgo: "2h ago",
  },
  {
    id: "ig-2",
    imageSrc: "/reviews/ig-chat-2.jpg",
    chatSnippet: "The Figaro chain shine in real life is unbelievable. Loved the gift packaging too! Will order again soon ✨",
    timeAgo: "5h ago",
  },
  {
    id: "ig-3",
    imageSrc: "/reviews/ig-chat-3.jpg",
    chatSnippet: "Got the combo offer rings set! Fits perfectly and silver purity certificate was included in box 👍",
    timeAgo: "1d ago",
  },
  {
    id: "ig-4",
    imageSrc: "/reviews/ig-chat-4.jpg",
    chatSnippet: "Super fast dispatch! Delivered to Delhi in just 2 days. The studs are so light and comfortable for daily wear.",
    timeAgo: "1d ago",
  },
  {
    id: "ig-5",
    imageSrc: "/reviews/ig-chat-5.jpg",
    chatSnippet: "Everyone in my family loved the bridal silver payal set! Genuine 925 quality, 100% satisfied customer ❤️",
    timeAgo: "2d ago",
  },
  {
    id: "ig-6",
    imageSrc: "/reviews/ig-chat-6.jpg",
    chatSnippet: "Bought the silver combo for my wife's birthday. She was thrilled! Premium finish and prompt WhatsApp support.",
    timeAgo: "2d ago",
  },
  {
    id: "ig-7",
    imageSrc: "/reviews/ig-chat-7.jpg",
    chatSnippet: "The shine hasn't faded at all even after weeks of continuous wear. Absolutely worth every rupee!",
    timeAgo: "3d ago",
  },
  {
    id: "ig-8",
    imageSrc: "/reviews/ig-chat-8.jpg",
    chatSnippet: "Packaging was super secure and luxury feeling. The hallmark card gave me complete peace of mind.",
    timeAgo: "3d ago",
  },
  {
    id: "ig-9",
    imageSrc: "/reviews/ig-chat-9.jpg",
    chatSnippet: "Best online silver shopping experience! The combo offer saved me ₹1,200. Will recommend to all my friends!",
    timeAgo: "4d ago",
  },
  {
    id: "ig-10",
    imageSrc: "/reviews/ig-chat-10.jpg",
    chatSnippet: "Thank you for the quick replacement when I chose wrong size! Exceptional customer service Aastha Silver team 🙏",
    timeAgo: "4d ago",
  },
  {
    id: "ig-11",
    imageSrc: "/reviews/ig-chat-11.jpg",
    chatSnippet: "Loved the craftsmanship! The detailing on the oxidized silver bracelet is pure perfection.",
    timeAgo: "5d ago",
  },
  {
    id: "ig-12",
    imageSrc: "/reviews/ig-chat-12.jpg",
    chatSnippet: "Received my order today! The packaging box looks so luxurious and the silver piece is sparkling!",
    timeAgo: "6d ago",
  },
];

export function InstagramReviewsSection({
  eyebrow = "Instagram DM Reviews",
  title = "Loved by 2,000+ Silver Enthusiasts",
  description = "Direct messages and order love from our Instagram family across India.",
  items,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  items?: IgReview[];
}) {
  const activeItems = items && items.length > 0 ? items : IG_REVIEWS;

  // Split items into 2 rows for dual-track marquee
  const mid = Math.ceil(activeItems.length / 2);
  let row1 = activeItems.slice(0, mid);
  let row2 = activeItems.slice(mid);

  if (row2.length === 0) row2 = row1;

  // Ensure rows have enough items for seamless scrolling marquee loop (at least 6 per row)
  while (row1.length > 0 && row1.length < 6) {
    row1 = [...row1, ...row1];
  }
  while (row2.length > 0 && row2.length < 6) {
    row2 = [...row2, ...row2];
  }

  return (
    <section className="py-14 md:py-20 bg-gradient-to-b from-sand-50/90 via-gold-50/20 to-sand-50/90 border-y border-line/70 overflow-hidden select-none pointer-events-none">
      <div className="u-container mb-8 md:mb-12 text-center pointer-events-auto">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-gold-300/80 bg-gold-50/60 px-3.5 py-1 text-xs font-semibold text-gold-900 tracking-wide uppercase font-sans mb-3">
          <InstagramIcon className="size-3.5 text-pink-600 shrink-0" />
          <span>{eyebrow}</span>
        </div>

        <h2 className="font-display text-2xl md:text-4xl text-brand-950 font-normal tracking-tight">
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-content-muted mt-2 max-w-xl mx-auto font-sans">
            {description}
          </p>
        ) : null}
      </div>

      {/* Dual Track Marquee Showcase (100% Non-Clickable) */}
      <div className="group/marquee relative flex flex-col gap-6 overflow-hidden py-2 pointer-events-auto">
        {/* Track 1: Scrolls Left */}
        <div className="flex overflow-hidden">
          <div className="animate-marquee-left flex gap-5 shrink-0">
            {row1.concat(row1).map((review, idx) => (
              <IgChatCard key={`r1-${idx}`} review={review} />
            ))}
          </div>
        </div>

        {/* Track 2: Scrolls Right */}
        <div className="flex overflow-hidden">
          <div className="animate-marquee-right flex gap-5 shrink-0">
            {row2.concat(row2).map((review, idx) => (
              <IgChatCard key={`r2-${idx}`} review={review} />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Trust Indicators */}
      <div className="u-container mt-10 text-center pointer-events-auto">
        <div className="inline-flex flex-wrap items-center justify-center gap-6 rounded-xl border border-line/70 bg-surface/80 px-6 py-3 text-xs text-content-muted font-sans shadow-2xs">
          <span className="flex items-center gap-1.5 font-medium text-brand-950">
            <ShieldCheck className="size-4 text-gold-600" />
            Verified Buyer Screenshots
          </span>
          <span className="hidden sm:inline text-line">•</span>
          <span className="flex items-center gap-1.5 font-medium text-brand-950">
            <Sparkles className="size-4 text-gold-600" />
            Hallmarked 925 Sterling Silver
          </span>
          <span className="hidden sm:inline text-line">•</span>
          <span className="flex items-center gap-1.5 font-medium text-brand-950">
            <Heart className="size-4 text-rose-500 fill-rose-500" />
            4.9★ Average Rating (1,200+ Reviews)
          </span>
        </div>
      </div>
    </section>
  );
}

function IgChatCard({ review }: { review: IgReview }) {
  const [imgError, setImgError] = React.useState(false);
  const imageSrc = review.imageSrc?.trim();
  const timeAgo = review.timeAgo || "Verified";
  const chatSnippet = review.chatSnippet || "Loved the quality and 925 sterling silver finish! ✨";

  return (
    <div className="w-[250px] sm:w-[290px] shrink-0 rounded-2xl border border-gold-300/70 bg-surface shadow-md overflow-hidden font-sans pointer-events-none transition-transform duration-300">
      {/* Phone DM Header Bar */}
      <div className="flex items-center justify-between border-b border-line/60 bg-sand-50/90 px-3.5 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[1.5px]">
            <div className="flex size-full items-center justify-center rounded-full bg-surface">
              <InstagramIcon className="size-3.5 text-rose-600" />
            </div>
          </div>
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-xs text-brand-950 truncate">
                Instagram DM
              </span>
              <CheckCircle2 className="size-3 text-sky-500 fill-sky-500 text-white shrink-0" />
            </div>
            <span className="text-[10px] text-content-subtle">
              Verified Order • {timeAgo}
            </span>
          </div>
        </div>

        <span className="rounded-full bg-gold-100/90 px-2 py-0.5 text-[10px] font-semibold text-gold-900 border border-gold-300/50">
          Verified
        </span>
      </div>

      {/* Screenshot / Chat Container */}
      <div className="relative min-h-[160px] sm:min-h-[180px] bg-sand-100/50 p-3.5 flex flex-col justify-between">
        {imageSrc && !imgError ? (
          <div className="relative w-full h-[160px] sm:h-[180px] rounded-lg overflow-hidden">
            <Image
              src={imageSrc}
              alt="Instagram chat review"
              fill
              sizes="300px"
              className="object-cover"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          /* Realistic Instagram DM Screenshot Layout Fallback */
          <div className="flex flex-col gap-2.5 h-full justify-between min-h-[150px]">
            {/* Incoming DM Bubble */}
            <div className="flex items-start gap-2 max-w-[88%]">
              <div className="size-6 shrink-0 rounded-full bg-gradient-to-tr from-rose-400 to-purple-500 text-white flex items-center justify-center text-[10px] font-bold">
                IG
              </div>
              <div className="rounded-2xl rounded-tl-xs bg-surface border border-line/80 p-3 text-xs text-brand-950 leading-relaxed shadow-2xs">
                {chatSnippet}
              </div>
            </div>

            {/* Outgoing Aastha Jewels Store Reply */}
            <div className="flex flex-col items-end self-end max-w-[85%]">
              <div className="rounded-2xl rounded-tr-xs bg-brand-900 text-white p-2.5 text-[11px] leading-snug shadow-2xs">
                Thank you so much! We're thrilled you loved your jewellery ✨
              </div>
              <div className="flex items-center gap-1 text-[9px] text-content-subtle mt-0.5 pr-1">
                <span>Seen</span>
                <Heart className="size-2.5 text-rose-500 fill-rose-500" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
