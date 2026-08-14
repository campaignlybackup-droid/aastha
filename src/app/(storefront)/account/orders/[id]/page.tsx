import { redirect } from "next/navigation";

/**
 * The spec lists /account/orders/[id]; the confirmation page at /order/[id] is
 * the same view and is what order emails and WhatsApp messages link to.
 * Redirecting keeps one canonical URL rather than two pages to maintain.
 */
export default async function AccountOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/order/${id}`);
}
