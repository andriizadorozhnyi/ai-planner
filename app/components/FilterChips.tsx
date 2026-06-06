"use client";

export interface FilterChip<K extends string> {
  key: K;
  label: string;
  /** Optional small badge number to the right of the label. */
  count?: number;
}

interface Props<K extends string> {
  chips: FilterChip<K>[];
  active: K;
  onChange: (key: K) => void;
  /** Optional label for screen readers. */
  ariaLabel?: string;
}

/**
 * Horizontal scrollable chip rail. Active chip is filled SKELAR red; inactive
 * chips are ghost-bordered. Chip height 36px — comfortably tappable while
 * leaving room for the headline above.
 */
export default function FilterChips<K extends string>({
  chips,
  active,
  onChange,
  ariaLabel,
}: Props<K>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel ?? "Фільтри"}
      className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {chips.map((c) => {
        const isActive = c.key === active;
        return (
          <button
            key={c.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(c.key)}
            className={`flex h-9 shrink-0 items-center gap-2 rounded-full border px-4 text-[14px] font-medium tracking-tight transition active:scale-95 ${
              isActive
                ? "border-(--color-accent) bg-(--color-accent) text-white"
                : "border-(--color-border) bg-(--color-surface) text-(--color-muted) active:bg-(--color-surface-2)"
            }`}
          >
            <span>{c.label}</span>
            {typeof c.count === "number" && c.count > 0 && (
              <span
                className={`text-[12px] tabular-nums ${
                  isActive ? "text-white/80" : "text-(--color-caption)"
                }`}
              >
                {c.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
