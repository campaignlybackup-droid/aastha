"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

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
      className="space-y-3"
    >
      {faqs.map((faq) => (
        <Accordion.Item
          key={faq.id}
          value={faq.id}
          className="rounded-lg border border-line/80 bg-surface transition-all duration-200 hover:border-gold-300/80 hover:shadow-xs data-[state=open]:border-gold-400 data-[state=open]:bg-gold-50/20 data-[state=open]:shadow-xs"
        >
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 p-4 text-left transition-colors sm:p-5">
              <span className="font-sans text-sm font-medium leading-snug text-brand-950 md:text-base">
                {faq.question}
              </span>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sand-100/80 transition-colors group-hover:bg-gold-100 group-data-[state=open]:bg-gold-200 group-data-[state=open]:text-gold-900">
                <ChevronDown
                  className="size-4 text-content-muted transition-transform duration-300 group-data-[state=open]:rotate-180 group-data-[state=open]:text-gold-900"
                  aria-hidden="true"
                />
              </span>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <div className="px-4 pb-5 pt-1 text-sm leading-relaxed text-content-muted sm:px-5">
              <p className="border-t border-line/50 pt-3 font-sans text-content-muted">
                {faq.answer}
              </p>
            </div>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
