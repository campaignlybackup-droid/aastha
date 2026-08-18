"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Trash2, Eye, EyeOff, Check, X, HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Label, Textarea, NativeSelect } from "@/components/ui/field";
import { Alert, Badge } from "@/components/ui/primitives";
import { createFaq, updateFaq, deleteFaq, toggleFaqActive } from "@/server/actions/cms";

export type FaqItemData = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  position: number;
  isActive: boolean;
};

const CATEGORIES = ["General", "Shipping", "Returns", "Care", "Orders", "Products"];

export function FaqManager({ initialFaqs }: { initialFaqs: FaqItemData[] }) {
  const router = useRouter();
  const [faqs, setFaqs] = React.useState<FaqItemData[]>(initialFaqs);
  const [activeCategory, setActiveCategory] = React.useState<string>("All");
  const [isAdding, setIsAdding] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  // Form State
  const [question, setQuestion] = React.useState("");
  const [answer, setAnswer] = React.useState("");
  const [category, setCategory] = React.useState("General");
  const [position, setPosition] = React.useState(0);
  const [isActive, setIsActive] = React.useState(true);

  const [pending, startTransition] = React.useTransition();
  const [message, setMessage] = React.useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const filteredFaqs = faqs.filter((f) => {
    if (activeCategory === "All") return true;
    return (f.category ?? "General") === activeCategory;
  });

  function resetForm() {
    setQuestion("");
    setAnswer("");
    setCategory("General");
    setPosition(0);
    setIsActive(true);
    setIsAdding(false);
    setEditingId(null);
    setMessage(null);
  }

  function startEdit(faq: FaqItemData) {
    setEditingId(faq.id);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setCategory(faq.category ?? "General");
    setPosition(faq.position);
    setIsActive(faq.isActive);
    setIsAdding(false);
    setMessage(null);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      let result;
      if (editingId) {
        result = await updateFaq(editingId, { question, answer, category, position, isActive });
      } else {
        result = await createFaq({ question, answer, category, position, isActive });
      }

      if (!result.ok) {
        setMessage({ tone: "danger", text: result.error });
        return;
      }

      setMessage({ tone: "success", text: result.message ?? "Saved successfully." });
      resetForm();
      router.refresh();
    });
  }

  function handleToggle(id: string, current: boolean) {
    startTransition(async () => {
      const result = await toggleFaqActive(id, !current);
      if (result.ok) {
        setFaqs((prev) => prev.map((f) => (f.id === id ? { ...f, isActive: !current } : f)));
        router.refresh();
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this FAQ?")) return;

    startTransition(async () => {
      const result = await deleteFaq(id);
      if (result.ok) {
        setFaqs((prev) => prev.filter((f) => f.id !== id));
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header controls & Category filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveCategory("All")}
            className={
              activeCategory === "All"
                ? "rounded-sm bg-brand-800 px-3 py-1.5 text-xs font-medium text-sand-50"
                : "rounded-sm border border-line-strong px-3 py-1.5 text-xs text-content-muted hover:border-[var(--color-accent)]"
            }
          >
            All FAQs ({faqs.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = faqs.filter((f) => (f.category ?? "General") === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={
                  activeCategory === cat
                    ? "rounded-sm bg-brand-800 px-3 py-1.5 text-xs font-medium text-sand-50"
                    : "rounded-sm border border-line-strong px-3 py-1.5 text-xs text-content-muted hover:border-[var(--color-accent)]"
                }
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {!isAdding && !editingId && (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              resetForm();
              setIsAdding(true);
            }}
          >
            <Plus className="size-4" />
            Add New FAQ
          </Button>
        )}
      </div>

      {message && (
        <Alert variant={message.tone === "success" ? "success" : "danger"}>
          {message.text}
        </Alert>
      )}

      {/* Add / Edit Form Modal / Block */}
      {(isAdding || editingId) && (
        <form onSubmit={handleSave} className="rounded-md border border-gold-500/40 bg-surface-raised p-6 space-y-4 shadow-card">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="font-display text-lg font-medium text-brand-900">
              {editingId ? "Edit FAQ" : "Add New FAQ"}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="text-content-muted hover:text-content"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <Label required>Category</Label>
              <NativeSelect
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field>
              <Label>Position (Display Order)</Label>
              <Input
                type="number"
                value={position}
                onChange={(e) => setPosition(parseInt(e.target.value) || 0)}
              />
            </Field>
          </div>

          <Field>
            <Label required>Question</Label>
            <Input
              type="text"
              placeholder="e.g. How do I clean my 925 sterling silver jewellery?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
          </Field>

          <Field>
            <Label required>Answer</Label>
            <Textarea
              rows={4}
              placeholder="Provide a clear, helpful response..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              required
            />
          </Field>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="faq-active-check"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 rounded border-line text-brand-700 focus:ring-brand-700"
            />
            <label htmlFor="faq-active-check" className="text-sm text-content">
              Active / Visible on storefront
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-line">
            <Button type="button" variant="outline" size="sm" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={pending}>
              {editingId ? "Update FAQ" : "Save FAQ"}
            </Button>
          </div>
        </form>
      )}

      {/* List of FAQs */}
      {filteredFaqs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-line bg-surface-raised p-12 text-center">
          <HelpCircle className="size-8 text-content-subtle mb-2" />
          <p className="text-sm text-content-muted">No FAQs found for this filter.</p>
        </div>
      ) : (
        <div className="divide-y divide-line rounded-md border border-line bg-surface-raised">
          {filteredFaqs.map((faq) => (
            <div key={faq.id} className="p-4 transition-colors hover:bg-sand-50/50">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={faq.isActive ? "success" : "neutral"}>
                      {faq.isActive ? "Active" : "Hidden"}
                    </Badge>
                    <Badge variant="outline">{faq.category ?? "General"}</Badge>
                    <span className="text-xs text-content-subtle">Pos: {faq.position}</span>
                  </div>
                  <h4 className="font-medium text-base text-content">{faq.question}</h4>
                  <p className="text-sm text-content-muted leading-relaxed whitespace-pre-wrap">
                    {faq.answer}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(faq.id, faq.isActive)}
                    title={faq.isActive ? "Hide FAQ" : "Show FAQ"}
                    className="p-1.5 text-content-muted hover:text-content rounded-xs"
                  >
                    {faq.isActive ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => startEdit(faq)}
                    title="Edit FAQ"
                    className="p-1.5 text-content-muted hover:text-[var(--color-accent)] rounded-xs"
                  >
                    <Edit2 className="size-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(faq.id)}
                    title="Delete FAQ"
                    className="p-1.5 text-content-muted hover:text-danger-700 rounded-xs"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
