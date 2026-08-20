import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FaqAccordion } from "@/components/storefront/faq-accordion";
import { PageHeader } from "@/components/storefront/page-header";
import { Alert } from "@/components/ui/primitives";
import { sanitizeRichText } from "@/lib/cms/sanitize";
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/json-ld";
import { formatMobile } from "@/lib/utils";
import { buildWhatsAppLink } from "@/lib/whatsapp/link";
import { publicEnv } from "@/lib/env";
import { getActiveFaqs, getSetting } from "@/server/catalog";
import {
  PAGE_DEFINITIONS,
  getStaticPage,
  type StaticPageSlug,
} from "@/server/pages";

/**
 * Static content pages: /about, /contact, /faq and the four policies.
 *
 * One catch-all route rather than seven near-identical files. `/faq` is
 * special-cased because its content is the FAQ table, not free text.
 *
 * A page with no body yet renders its outline instead of blank space, so the
 * gap is obvious to the owner and honest to a customer — better than shipping
 * invented policy text that a customer could hold the business to.
 */

const FAQ_SLUG = "faq";

export async function generateStaticParams() {
  return [
    ...Object.keys(PAGE_DEFINITIONS).map((page) => ({ page })),
    { page: FAQ_SLUG },
  ];
}

function isStaticPage(page: string): page is StaticPageSlug {
  return page in PAGE_DEFINITIONS;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}): Promise<Metadata> {
  const { page } = await params;

  if (page === FAQ_SLUG) {
    return {
      title: "Frequently Asked Questions",
      description:
        "Answers about silver purity, care, shipping, returns and orders.",
      alternates: { canonical: "/faq" },
    };
  }

  if (!isStaticPage(page)) return {};

  const content = await getStaticPage(page);

  return {
    title: content.seoTitle || content.title,
    description: content.seoDescription || content.intro,
    alternates: { canonical: `/${page}` },
    // An unwritten page has nothing worth indexing.
    ...(content.body ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function StaticContentPage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;

  if (page === FAQ_SLUG) return <FaqPage />;
  if (!isStaticPage(page)) notFound();

  const content = await getStaticPage(page);
  const definition = PAGE_DEFINITIONS[page];
  const contact = page === "contact" ? await getSetting("contact") : null;

  const crumbs = [
    { name: "Home", href: "/" },
    { name: content.title, href: `/${page}` },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />

      <PageHeader crumbs={crumbs} title={content.title} description={content.intro} />

      <div className="u-container pb-24">
        <div className="mx-auto max-w-3xl">
          {content.body ? (
            <div
              className="space-y-4 text-sm leading-relaxed text-content-muted md:text-base [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-content [&_h3]:mt-6 [&_h3]:font-display [&_h3]:text-xl [&_h3]:text-content [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc"
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(content.body) }}
            />
          ) : (
            <Alert variant="info" title="This page hasn't been written yet">
              <p className="mb-2">
                It should cover:
              </p>
              <ul className="ml-5 list-disc space-y-1">
                {definition.prompts.map((prompt) => (
                  <li key={prompt}>{prompt}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs">
                Staff: write this under Admin → Pages. Until then this page is
                excluded from search engines.
              </p>
            </Alert>
          )}

          {contact ? <ContactDetails contact={contact} /> : null}
        </div>
      </div>
    </>
  );
}

function ContactDetails({
  contact,
}: {
  contact: {
    email: string;
    phone: string;
    whatsapp: string;
    addressLines: string[];
    city: string;
    state: string;
    hours: string;
  };
}) {
  const whatsapp = contact.whatsapp || publicEnv.supportWhatsapp;
  const hasAnything =
    contact.email || contact.phone || whatsapp || contact.addressLines.length;

  if (!hasAnything) {
    return (
      <Alert variant="warning" className="mt-8">
        No contact details have been set yet. Add them under Admin → Settings →
        Contact.
      </Alert>
    );
  }

  return (
    <div className="mt-10 grid gap-6 sm:grid-cols-2">
      {whatsapp ? (
        <div className="rounded-md border border-line bg-surface-raised p-5">
          <h2 className="u-eyebrow mb-2 text-content-subtle">WhatsApp</h2>
          <a
            href={buildWhatsAppLink(
              whatsapp,
              "Hi Aastha Silver & Jewels, I have a question.",
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline underline-offset-4 hover:text-[var(--color-accent)]"
          >
            Message us on WhatsApp
          </a>
          <p className="mt-1 text-xs text-content-subtle">
            {formatMobile(whatsapp)}
          </p>
        </div>
      ) : null}

      {contact.phone ? (
        <div className="rounded-md border border-line bg-surface-raised p-5">
          <h2 className="u-eyebrow mb-2 text-content-subtle">Phone</h2>
          <a
            href={`tel:${contact.phone.replace(/\s/g, "")}`}
            className="text-sm underline underline-offset-4 hover:text-[var(--color-accent)]"
          >
            {contact.phone}
          </a>
          {contact.hours ? (
            <p className="mt-1 text-xs text-content-subtle">{contact.hours}</p>
          ) : null}
        </div>
      ) : null}

      {contact.email ? (
        <div className="rounded-md border border-line bg-surface-raised p-5">
          <h2 className="u-eyebrow mb-2 text-content-subtle">Email</h2>
          <a
            href={`mailto:${contact.email}`}
            className="text-sm underline underline-offset-4 hover:text-[var(--color-accent)]"
          >
            {contact.email}
          </a>
        </div>
      ) : null}

      {contact.addressLines.length ? (
        <div className="rounded-md border border-line bg-surface-raised p-5">
          <h2 className="u-eyebrow mb-2 text-content-subtle">Address</h2>
          <address className="text-sm not-italic leading-relaxed text-content-muted">
            {contact.addressLines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
            {contact.city || contact.state ? (
              <span className="block">
                {[contact.city, contact.state].filter(Boolean).join(", ")}
              </span>
            ) : null}
          </address>
        </div>
      ) : null}
    </div>
  );
}

async function FaqPage() {
  const faqs = await getActiveFaqs(undefined, 50);

  const crumbs = [
    { name: "Home", href: "/" },
    { name: "FAQ", href: "/faq" },
  ];

  // Group by category so a long list stays navigable.
  const grouped = new Map<string, typeof faqs>();
  for (const faq of faqs) {
    const key = faq.category ?? "General";
    grouped.set(key, [...(grouped.get(key) ?? []), faq]);
  }

  const schema = faqJsonLd(
    faqs.map((f) => ({ question: f.question, answer: f.answer })),
  );

  return (
    <>
      <JsonLd data={schema ? [breadcrumbJsonLd(crumbs), schema] : [breadcrumbJsonLd(crumbs)]} />

      <PageHeader
        crumbs={crumbs}
        title="Frequently asked questions"
        description="Silver purity, care, shipping, returns and orders."
      />

      <div className="u-container pb-24">
        <div className="mx-auto max-w-3xl space-y-10">
          {faqs.length === 0 ? (
            <Alert variant="info">
              No questions have been added yet. Staff can add them in the admin.
            </Alert>
          ) : (
            [...grouped.entries()].map(([category, items]) => (
              <section key={category}>
                <h2 className="mb-4 font-display text-2xl">{category}</h2>
                <FaqAccordion
                  faqs={items.map((f) => ({
                    id: f.id,
                    question: f.question,
                    answer: f.answer,
                  }))}
                />
              </section>
            ))
          )}
        </div>
      </div>
    </>
  );
}
