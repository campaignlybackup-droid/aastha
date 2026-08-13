"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { Plus } from "lucide-react";

export function FaqAccordion({
  faqs,
  defaultOpenFirst = false,
}: {
  faqs: Array<{ id: string; question: string; answer: string }>;
  defaultOpenFirst?: boolean;
}) {
  return (
    <Accordion.Root
      type="multiple"
      defaultValue={defaultOpenFirst && faqs[0] ? [faqs[0].id] : []}
      className="divide-y divide-line border-y border-line"
    >
      {faqs.map((faq) => (
        <Accordion.Item key={faq.id} value={faq.id}>
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-start justify-between gap-6 py-5 text-left transition-colors hover:text-[var(--color-accent)]">
              <span className="text-sm leading-relaxed md:text-base">
                {faq.question}
              </span>
              <Plus
                className="mt-0.5 size-4 shrink-0 text-content-muted transition-transform duration-200 group-data-[state=open]:rotate-45"
                aria-hidden="true"
              />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <p className="pb-5 pr-10 text-sm leading-relaxed text-content-muted">
              {faq.answer}
            </p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
