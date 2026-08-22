"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Clock, Search, X } from "lucide-react";

import { MediaImage } from "@/components/ui/media-image";
import { Spinner } from "@/components/ui/primitives";
import { formatPrice } from "@/lib/money";
import { cn } from "@/lib/utils";

type Suggestions = {
  products: Array<{
    slug: string;
    name: string;
    pricePaise: number;
    image: { url: string; alt: string } | null;
  }>;
  categories: Array<{ name: string; slug: string }>;
  collections: Array<{ name: string; slug: string }>;
};

const EMPTY: Suggestions = { products: [], categories: [], collections: [] };
const HISTORY_KEY = "asj.search.history";
const HISTORY_LIMIT = 5;

function readHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, HISTORY_LIMIT) : [];
  } catch {
    // A corrupt or unavailable localStorage must not break search.
    return [];
  }
}

function pushHistory(term: string) {
  try {
    const next = [term, ...readHistory().filter((t) => t !== term)].slice(
      0,
      HISTORY_LIMIT,
    );
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function SearchTrigger({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="inline-flex size-10 items-center justify-center rounded-sm text-sand-100 transition-colors hover:bg-brand-800 hover:text-gold-300">
        {children}
      </Dialog.Trigger>
      <SearchDialogContent onNavigate={() => setOpen(false)} />
    </Dialog.Root>
  );
}

function SearchDialogContent({ onNavigate }: { onNavigate: () => void }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [fetched, setFetched] = React.useState<Suggestions>(EMPTY);
  const [loading, setLoading] = React.useState(false);

  // Read once at mount. This component only renders inside a Radix Portal that
  // is unmounted while the dialog is closed, so the lazy initialiser runs when
  // the overlay opens and picks up anything searched since.
  const [history] = React.useState<string[]>(() =>
    typeof window === "undefined" ? [] : readHistory(),
  );

  const term = query.trim();

  // Below the minimum length there is nothing to show. Deriving this rather
  // than clearing state in the effect keeps the effect free of synchronous
  // setState and removes a render pass.
  const results = term.length < 2 ? EMPTY : fetched;

  // Debounced fetch. The abort controller cancels a request whose response is
  // no longer wanted, so a slow early keystroke cannot overwrite a fast later
  // one.
  React.useEffect(() => {
    if (term.length < 2) return;

    const controller = new AbortController();
    let active = true;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search/suggest?q=${encodeURIComponent(term)}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error("Search failed");
        const data = (await res.json()) as Suggestions;
        if (active) setFetched(data);
      } catch (error) {
        if (active && (error as Error).name !== "AbortError") setFetched(EMPTY);
      } finally {
        if (active) setLoading(false);
      }
    }, 220);

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  function submit(term: string) {
    const value = term.trim();
    if (!value) return;
    pushHistory(value);
    onNavigate();
    router.push(`/search?q=${encodeURIComponent(value)}`);
  }

  const hasResults =
    results.products.length + results.categories.length + results.collections.length >
    0;
  const showEmpty = query.trim().length >= 2 && !loading && !hasResults;

  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-sand-950/40 backdrop-blur-[2px] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
      <Dialog.Content
        className={cn(
          "fixed inset-x-0 top-0 z-50 max-h-[85dvh] overflow-y-auto overscroll-contain bg-surface shadow-[var(--shadow-overlay)]",
          "data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in",
        )}
      >
        <Dialog.Title className="sr-only">Search products</Dialog.Title>
        <Dialog.Description className="sr-only">
          Type at least two characters to see suggestions.
        </Dialog.Description>

        <div className="u-container">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(query);
            }}
            className="flex items-center gap-3 border-b border-line py-5"
            role="search"
          >
            <Search
              className="size-5 shrink-0 text-content-subtle"
              aria-hidden="true"
            />
            <input
              // The dialog exists solely to receive this input, and Radix
              // returns focus to the trigger on close.
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search rings, earrings, chains…"
              aria-label="Search products"
              className="h-11 flex-1 bg-transparent text-base outline-none placeholder:text-content-subtle"
            />
            {loading && term.length >= 2 ? <Spinner className="size-4 text-content-subtle" /> : null}
            <Dialog.Close
              className="inline-flex size-9 items-center justify-center rounded-sm text-content-muted transition-colors hover:bg-sand-100"
              aria-label="Close search"
            >
              <X className="size-5" aria-hidden="true" />
            </Dialog.Close>
          </form>

          <div className="py-6" aria-live="polite">
            {query.trim().length < 2 && history.length > 0 ? (
              <section>
                <p className="u-eyebrow mb-3 text-content-subtle">
                  Recent searches
                </p>
                <ul className="flex flex-wrap gap-2">
                  {history.map((term) => (
                    <li key={term}>
                      <button
                        type="button"
                        onClick={() => submit(term)}
                        className="inline-flex items-center gap-1.5 rounded-xs border border-line px-3 py-1.5 text-sm text-content-muted transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                      >
                        <Clock className="size-3.5" aria-hidden="true" />
                        {term}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {showEmpty ? (
              <div className="py-10 text-center">
                <p className="font-display text-xl">
                  Nothing matched “{query.trim()}”
                </p>
                <p className="mt-2 text-sm text-content-muted">
                  Try a broader term — “earrings”, “oxidised”, “925” — or{" "}
                  <Link
                    href="/shop"
                    onClick={onNavigate}
                    className="underline underline-offset-4"
                  >
                    browse everything
                  </Link>
                  .
                </p>
              </div>
            ) : null}

            {hasResults ? (
              <div className="grid gap-8 md:grid-cols-[1fr_16rem]">
                <section>
                  <p className="u-eyebrow mb-3 text-content-subtle">Products</p>
                  <ul className="space-y-1">
                    {results.products.map((product) => (
                      <li key={product.slug}>
                        <Link
                          href={`/product/${product.slug}`}
                          onClick={onNavigate}
                          className="flex items-center gap-3 rounded-sm p-2 transition-colors hover:bg-sand-100"
                        >
                          <span className="relative size-14 shrink-0 overflow-hidden bg-sand-100">
                            {product.image ? (
                              <MediaImage
                                src={product.image.url}
                                alt=""
                                fill
                                sizes="56px"
                                className="object-cover"
                              />
                            ) : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">
                              {product.name}
                            </span>
                            <span className="block text-sm text-content-muted">
                              {formatPrice(product.pricePaise)}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => submit(query)}
                    className="mt-3 text-sm underline underline-offset-4 hover:text-[var(--color-accent)]"
                  >
                    See all results for “{query.trim()}”
                  </button>
                </section>

                {results.categories.length || results.collections.length ? (
                  <aside className="space-y-6">
                    {results.categories.length ? (
                      <section>
                        <p className="u-eyebrow mb-3 text-content-subtle">
                          Categories
                        </p>
                        <ul className="space-y-1.5">
                          {results.categories.map((c) => (
                            <li key={c.slug}>
                              <Link
                                href={`/category/${c.slug}`}
                                onClick={onNavigate}
                                className="text-sm text-content-muted hover:text-[var(--color-accent)]"
                              >
                                {c.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ) : null}

                    {results.collections.length ? (
                      <section>
                        <p className="u-eyebrow mb-3 text-content-subtle">
                          Collections
                        </p>
                        <ul className="space-y-1.5">
                          {results.collections.map((c) => (
                            <li key={c.slug}>
                              <Link
                                href={`/collections/${c.slug}`}
                                onClick={onNavigate}
                                className="text-sm text-content-muted hover:text-[var(--color-accent)]"
                              >
                                {c.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ) : null}
                  </aside>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
