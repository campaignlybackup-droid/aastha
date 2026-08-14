"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, Input, Label, Textarea } from "@/components/ui/field";
import { Alert, Badge } from "@/components/ui/primitives";
import { saveStaticPage } from "@/server/actions/cms";

type PageContent = {
  slug: string;
  title: string;
  intro: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
  prompts: string[];
};

/**
 * Static page editor.
 *
 * The prompts are shown beside the body field rather than pre-filled into it.
 * Pre-filling would put draft legal text in the owner's mouth that they might
 * publish unread; a checklist makes them write it.
 */
export function PagesEditor({ pages }: { pages: PageContent[] }) {
  const [open, setOpen] = React.useState<string | null>(
    pages.find((p) => !p.body)?.slug ?? pages[0]?.slug ?? null,
  );

  return (
    <ul className="divide-y divide-line">
      {pages.map((page) => (
        <li key={page.slug}>
          <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
            <button
              type="button"
              onClick={() => setOpen(open === page.slug ? null : page.slug)}
              aria-expanded={open === page.slug}
              className="min-w-0 flex-1 text-left"
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{page.title}</span>
                {page.body ? (
                  <Badge variant="success">Written</Badge>
                ) : (
                  <Badge variant="warning">Empty</Badge>
                )}
              </span>
              <span className="mt-0.5 block text-xs text-content-subtle">
                /{page.slug}
              </span>
            </button>

            <Link
              href={`/${page.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xs border border-line-strong px-2.5 py-1.5 text-xs text-content-muted hover:border-[var(--color-accent)]"
            >
              <ExternalLink className="size-3" aria-hidden="true" />
              View
            </Link>
          </div>

          {open === page.slug ? <PageForm page={page} /> : null}
        </li>
      ))}
    </ul>
  );
}

function PageForm({ page }: { page: PageContent }) {
  const router = useRouter();
  const [form, setForm] = React.useState({
    title: page.title,
    intro: page.intro,
    body: page.body,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
  });
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<
    { tone: "success" | "danger"; text: string } | null
  >(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const result = await saveStaticPage({ slug: page.slug, ...form });
      setMessage(
        result.ok
          ? { tone: "success", text: result.message ?? "Saved." }
          : { tone: "danger", text: result.error },
      );
      if (result.ok) router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="border-t border-line bg-surface-sunken px-5 py-5">
      <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
        <div className="space-y-4">
          <Field>
            <Label required>Page title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              maxLength={120}
            />
          </Field>

          <Field>
            <Label>Intro line</Label>
            <Input
              value={form.intro}
              onChange={(e) => setForm({ ...form, intro: e.target.value })}
              maxLength={300}
            />
          </Field>

          <Field>
            <Label>Content</Label>
            <Textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={16}
              className="font-mono text-xs"
              placeholder={"<h2>Heading</h2>\n<p>Paragraph…</p>\n<ul><li>Point</li></ul>"}
            />
            <FieldDescription>
              Basic HTML: h2, h3, p, ul, ol, li, strong, em, a. Sanitised before
              display.
            </FieldDescription>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label>SEO title</Label>
              <Input
                value={form.seoTitle}
                onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
                maxLength={120}
                placeholder={form.title}
              />
            </Field>

            <Field>
              <Label>SEO description</Label>
              <Input
                value={form.seoDescription}
                onChange={(e) =>
                  setForm({ ...form, seoDescription: e.target.value })
                }
                maxLength={300}
                placeholder={form.intro}
              />
            </Field>
          </div>

          {message ? (
            <Alert variant={message.tone === "success" ? "success" : "danger"}>
              {message.text}
            </Alert>
          ) : null}

          <Button type="submit" size="sm" loading={pending}>
            Save page
          </Button>
        </div>

        <aside className="rounded-sm border border-line bg-surface-raised p-4">
          <h3 className="u-eyebrow mb-2.5 text-content-subtle">
            This page should cover
          </h3>
          <ul className="ml-4 list-disc space-y-1.5 text-xs leading-relaxed text-content-muted">
            {page.prompts.map((prompt) => (
              <li key={prompt}>{prompt}</li>
            ))}
          </ul>
        </aside>
      </div>
    </form>
  );
}
