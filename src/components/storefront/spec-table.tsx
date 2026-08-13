import type { ProductDetail } from "@/server/catalog";

/**
 * Jewellery specification table.
 *
 * Rows are omitted when the product has no value for them, so a chain does not
 * show an empty "Stone" row. `extraSpecs` appends admin-defined key/value
 * pairs for attributes that do not deserve a database column.
 */
export function SpecTable({ product }: { product: ProductDetail }) {
  const rows: Array<[string, string]> = [];

  const push = (label: string, value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === "") return;
    rows.push([label, String(value)]);
  };

  push("Silver purity", product.silverPurity);
  push(
    "Weight",
    product.silverWeightGram ? `${product.silverWeightGram} g` : null,
  );
  push("Dimensions", product.dimensions);
  push("Finish", product.finish);
  push("Plating", product.plating);
  push("Stone", product.stoneType);
  push("Stone colour", product.stoneColour);
  push("Stone count", product.stoneCount);
  push("Adjustable", product.isAdjustable ? "Yes" : null);
  push(
    "Occasion",
    product.occasion.length ? product.occasion.join(", ") : null,
  );
  push(
    "Worn by",
    product.gender
      ? product.gender.charAt(0) + product.gender.slice(1).toLowerCase()
      : null,
  );
  push("SKU", product.sku);

  if (product.extraSpecs && typeof product.extraSpecs === "object") {
    for (const [label, value] of Object.entries(
      product.extraSpecs as Record<string, unknown>,
    )) {
      if (typeof value === "string" || typeof value === "number") {
        push(label, value);
      }
    }
  }

  if (!rows.length) return null;

  return (
    <dl className="divide-y divide-line/70 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[9rem_1fr] gap-3 py-2.5">
          <dt className="text-content-subtle">{label}</dt>
          <dd className="text-content">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
