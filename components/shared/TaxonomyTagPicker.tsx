"use client";

import { cn } from "@/lib/utils";
import type { CatalogItem } from "@/lib/public/catalog";

interface TaxonomyTagPickerProps {
  items: CatalogItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  groupByKind?: boolean;
  symptoms?: CatalogItem[];
  conditions?: CatalogItem[];
}

export function TaxonomyTagPicker({
  items,
  selectedIds,
  onChange,
  disabled = false,
  groupByKind = false,
  symptoms = [],
  conditions = [],
}: TaxonomyTagPickerProps) {
  const toggle = (id: string) => {
    if (disabled) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((value) => value !== id));
      return;
    }
    onChange([...selectedIds, id]);
  };

  if (groupByKind && (symptoms.length > 0 || conditions.length > 0)) {
    return (
      <div className="space-y-4">
        {symptoms.length > 0 && (
          <TagGroup
            title="Symptoms you treat"
            items={symptoms}
            selectedIds={selectedIds}
            onToggle={toggle}
            disabled={disabled}
          />
        )}
        {conditions.length > 0 && (
          <TagGroup
            title="Conditions you treat"
            items={conditions}
            selectedIds={selectedIds}
            onToggle={toggle}
            disabled={disabled}
          />
        )}
      </div>
    );
  }

  return (
    <TagGroup
      items={items}
      selectedIds={selectedIds}
      onToggle={toggle}
      disabled={disabled}
    />
  );
}

function TagGroup({
  title,
  items,
  selectedIds,
  onToggle,
  disabled,
}: {
  title?: string;
  items: CatalogItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      {title && <p className="text-xs font-semibold text-slate-600">{title}</p>}
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const active = selectedIds.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(item.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                active
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:text-brand-600",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
