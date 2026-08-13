import { MessageCircle } from "lucide-react";

import { buildWhatsAppLink } from "@/lib/whatsapp/link";

/**
 * Floating WhatsApp contact button.
 *
 * Rendered on every storefront page. Deliberately bottom-LEFT: the sticky
 * "Add to bag" bar on mobile product pages occupies the bottom-right, and
 * overlapping the primary purchase action with a support button is a
 * conversion own-goal.
 */
export function WhatsAppFloat({
  number,
  message = "Hi Aastha Silver & Jewels, I'd like some help choosing a piece.",
}: {
  number: string;
  message?: string;
}) {
  if (!number) return null;

  return (
    <a
      href={buildWhatsAppLink(number, message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 left-5 z-30 inline-flex size-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[var(--shadow-raised)] transition-transform duration-200 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 lg:size-14"
    >
      <MessageCircle className="size-6" aria-hidden="true" />
    </a>
  );
}
