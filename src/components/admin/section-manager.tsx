"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui/primitives";
import {
  createSection,
  deleteSection,
  duplicateSection,
  reorderSections,
  scheduleSection,
  toggleSection,
} from "@/server/actions/cms";
import {
  SECTION_DESCRIPTIONS,
  SECTION_LABELS,
  SECTION_TYPES,
  type SectionType,
} from "@/lib/cms/sections";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Section = {
  id: string;
  type: string;
  typeLabel: string;
  label: string;
  position: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

/**
 * Section list with reordering, visibility, scheduling and duplication.
 *
 * Reordering uses explicit up/down buttons rather than drag-and-drop. Drag
 * needs a keyboard alternative to be accessible at all, and on a phone it
 * fights the page scroll — buttons work everywhere and are unambiguous.
 */
export function SectionManager({ sections }: { sections: Section[] }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<
    { tone: "success" | "danger"; text: string } | null
  >(null);
  const [adding, setAdding] = React.useState(false);
  const [scheduling, setScheduling] = React.useState<string | null>(null);

  // Local copy so reordering feels immediate; the server is the source of
  // truth on the next refresh.
  const [order, setOrder] = React.useState(sections);
  const [seenSections, setSeenSections] = React.useState(sections);
  if (sections !== seenSections) {
    setSeenSections(sections);
    setOrder(sections);
  }

  function run(action: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      setMessage(
        result.ok
          ? { tone: "success", text: result.message ?? "Saved." }
          : { tone: "danger", text: result.error ?? "Something went wrong." },
      );
      router.refresh();
    });
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;

    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);

    run(() => reorderSections(next.map((s) => s.id)));
  }

  return (
    <div>
      {message ? (
        <div className="px-5 pt-4">
          <Alert variant={message.tone === "success" ? "success" : "danger"}>
            {message.text}
          </Alert>
        </div>
      ) : null}

      <ul className="divide-y divide-line">
        {order.length === 0 ? (
          <li className="px-5 py-12 text-center text-sm text-content-muted">
            No sections yet. Add one to start building the homepage.
          </li>
        ) : (
          order.map((section, index) => (
            <li key={section.id} className="px-5 py-4">
              <div className="flex flex-wrap items-start gap-4">
                {/* Reorder ------------------------------------------------ */}
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={pending || index === 0}
                    aria-label={`Move ${section.label} up`}
                    className="inline-flex size-7 items-center justify-center rounded-xs border border-line-strong text-content-muted hover:border-[var(--color-accent)] disabled:opacity-30"
                  >
                    <ArrowUp className="size-3" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={pending || index === order.length - 1}
                    aria-label={`Move ${section.label} down`}
                    className="inline-flex size-7 items-center justify-center rounded-xs border border-line-strong text-content-muted hover:border-[var(--color-accent)] disabled:opacity-30"
                  >
                    <ArrowDown className="size-3" aria-hidden="true" />
                  </button>
                </div>

                {/* Details ------------------------------------------------ */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        !section.isActive && "text-content-subtle",
                      )}
                    >
                      {section.label}
                    </span>
                    <Badge variant="outline">{section.typeLabel}</Badge>
                    {section.isActive ? (
                      <Badge variant="success">Live</Badge>
                    ) : (
                      <Badge variant="neutral">Hidden</Badge>
                    )}
                  </div>

                  {section.startsAt || section.endsAt ? (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-content-subtle">
                      <CalendarClock className="size-3" aria-hidden="true" />
                      {section.startsAt
                        ? `From ${formatDateTime(section.startsAt)}`
                        : "Any time"}
                      {section.endsAt
                        ? ` until ${formatDateTime(section.endsAt)}`
                        : ""}
                    </p>
                  ) : null}

                  {scheduling === section.id ? (
                    <ScheduleForm
                      section={section}
                      pending={pending}
                      onCancel={() => setScheduling(null)}
                      onSave={(startsAt, endsAt) => {
                        setScheduling(null);
                        run(() =>
                          scheduleSection({ id: section.id, startsAt, endsAt }),
                        );
                      }}
                    />
                  ) : null}
                </div>

                {/* Actions ------------------------------------------------ */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <IconButton
                    label={section.isActive ? "Hide section" : "Show section"}
                    disabled={pending}
                    onClick={() => run(() => toggleSection(section.id, !section.isActive))}
                  >
                    {section.isActive ? (
                      <Eye className="size-3.5" aria-hidden="true" />
                    ) : (
                      <EyeOff className="size-3.5" aria-hidden="true" />
                    )}
                  </IconButton>

                  <IconButton
                    label="Schedule section"
                    disabled={pending}
                    onClick={() =>
                      setScheduling(scheduling === section.id ? null : section.id)
                    }
                  >
                    <CalendarClock className="size-3.5" aria-hidden="true" />
                  </IconButton>

                  <IconButton
                    label="Duplicate section"
                    disabled={pending}
                    onClick={() => run(() => duplicateSection(section.id))}
                  >
                    <Copy className="size-3.5" aria-hidden="true" />
                  </IconButton>

                  <DeleteButton
                    label={section.label}
                    disabled={pending}
                    onConfirm={() => run(() => deleteSection(section.id))}
                  />
                </div>
              </div>
            </li>
          ))
        )}
      </ul>

      <div className="border-t border-line px-5 py-4">
        {adding ? (
          <AddSectionForm
            pending={pending}
            onCancel={() => setAdding(false)}
            onAdd={(type, label) => {
              setAdding(false);
              run(() => createSection({ type, label }));
            }}
          />
        ) : (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" />
            Add section
          </Button>
        )}
      </div>
    </div>
  );
}

function IconButton({
  label,
  children,
  disabled,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex size-8 items-center justify-center rounded-xs border border-line-strong text-content-muted transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function DeleteButton({
  label,
  disabled,
  onConfirm,
}: {
  label: string;
  disabled?: boolean;
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = React.useState(false);

  if (confirming) {
    return (
      <span className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onConfirm}
          disabled={disabled}
          className="rounded-xs border border-danger-500 px-2 py-1 text-xs text-danger-700 disabled:opacity-40"
        >
          Delete
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={disabled}
          className="rounded-xs border border-line-strong px-2 py-1 text-xs text-content-muted disabled:opacity-40"
        >
          Keep
        </button>
      </span>
    );
  }

  return (
    <IconButton
      label={`Delete ${label}`}
      disabled={disabled}
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="size-3.5" aria-hidden="true" />
    </IconButton>
  );
}

function AddSectionForm({
  pending,
  onAdd,
  onCancel,
}: {
  pending: boolean;
  onAdd: (type: SectionType, label: string) => void;
  onCancel: () => void;
}) {
  const [type, setType] = React.useState<SectionType>("PRODUCT_CAROUSEL");
  const [label, setLabel] = React.useState("");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onAdd(type, label || SECTION_LABELS[type]);
      }}
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-[16rem_1fr_auto]">
        <div>
          <label htmlFor="section-type" className="sr-only">
            Section type
          </label>
          <select
            id="section-type"
            value={type}
            onChange={(event) => setType(event.target.value as SectionType)}
            className="h-9 w-full rounded-sm border border-line-strong bg-surface-raised px-2 text-sm outline-none focus:border-[var(--color-accent)]"
          >
            {SECTION_TYPES.map((option) => (
              <option key={option} value={option}>
                {SECTION_LABELS[option]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="section-label" className="sr-only">
            Section name
          </label>
          <input
            id="section-label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={`Name (defaults to “${SECTION_LABELS[type]}”)`}
            maxLength={80}
            className="h-9 w-full rounded-sm border border-line-strong bg-surface-raised px-3 text-sm outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" size="sm" loading={pending}>
            Add
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>

      <p className="text-xs text-content-subtle">
        {SECTION_DESCRIPTIONS[type]} New sections are added hidden.
      </p>
    </form>
  );
}

/** `datetime-local` needs "YYYY-MM-DDTHH:mm" in LOCAL time, not an ISO string. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function ScheduleForm({
  section,
  pending,
  onSave,
  onCancel,
}: {
  section: Section;
  pending: boolean;
  onSave: (startsAt: string | null, endsAt: string | null) => void;
  onCancel: () => void;
}) {
  const [startsAt, setStartsAt] = React.useState(toLocalInput(section.startsAt));
  const [endsAt, setEndsAt] = React.useState(toLocalInput(section.endsAt));

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(
          startsAt ? new Date(startsAt).toISOString() : null,
          endsAt ? new Date(endsAt).toISOString() : null,
        );
      }}
      className="mt-3 flex flex-wrap items-end gap-3 rounded-sm bg-surface-sunken p-3"
    >
      <div>
        <label
          htmlFor={`starts-${section.id}`}
          className="mb-1 block text-xs text-content-muted"
        >
          Show from
        </label>
        <input
          id={`starts-${section.id}`}
          type="datetime-local"
          value={startsAt}
          onChange={(event) => setStartsAt(event.target.value)}
          className="h-9 rounded-sm border border-line-strong bg-surface-raised px-2 text-sm outline-none focus:border-[var(--color-accent)]"
        />
      </div>

      <div>
        <label
          htmlFor={`ends-${section.id}`}
          className="mb-1 block text-xs text-content-muted"
        >
          Hide after
        </label>
        <input
          id={`ends-${section.id}`}
          type="datetime-local"
          value={endsAt}
          onChange={(event) => setEndsAt(event.target.value)}
          className="h-9 rounded-sm border border-line-strong bg-surface-raised px-2 text-sm outline-none focus:border-[var(--color-accent)]"
        />
      </div>

      <Button type="submit" size="sm" loading={pending}>
        Save schedule
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>

      <p className="w-full text-xs text-content-subtle">
        Leave both blank to show the section whenever it is set to live.
      </p>
    </form>
  );
}
