import { AdminHeading, Panel } from "@/components/admin/ui";
import { FaqManager } from "@/components/admin/faq-manager";
import { db } from "@/lib/db";
import { requireArea } from "@/server/auth";

export const metadata = { title: "FAQs Management" };

export default async function AdminFaqsPage() {
  await requireArea("homepage");

  const faqs = await db.faq.findMany({
    orderBy: [{ category: "asc" }, { position: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      question: true,
      answer: true,
      category: true,
      position: true,
      isActive: true,
    },
  });

  return (
    <>
      <AdminHeading
        title="FAQs Management"
        description={`Manage ${faqs.length} storefront frequently asked questions`}
      />

      <Panel>
        <FaqManager initialFaqs={faqs} />
      </Panel>
    </>
  );
}
