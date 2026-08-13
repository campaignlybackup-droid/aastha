/**
 * Builds a wa.me deep link.
 *
 * Safe on both server and client — no secrets involved, this is just a URL.
 * Sending an actual template message is a different concern; see
 * src/lib/whatsapp/client.ts.
 */
export function buildWhatsAppLink(number: string, message?: string): string {
  const digits = number.replace(/\D/g, "");
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
