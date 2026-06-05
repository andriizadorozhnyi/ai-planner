"use client";

import type { TabKey } from "../lib/types";

interface Props {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  inboxCount: number;
}

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "capture", label: "Capture", icon: "✏️" },
  { key: "inbox", label: "Inbox", icon: "📥" },
  { key: "today", label: "Сьогодні", icon: "☀️" },
];

export default function TabBar({ active, onChange, inboxCount }: Props) {
  return (
    <nav
      className="shrink-0 border-t border-(--color-border) bg-(--color-surface)/90 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition active:scale-95 ${
                isActive ? "text-(--color-accent)" : "text-(--color-muted)"
              }`}
            >
              <span className="text-2xl leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.key === "inbox" && inboxCount > 0 && (
                <span className="absolute right-[22%] top-1.5 min-w-5 rounded-full bg-(--color-accent) px-1.5 text-center text-[11px] font-bold text-white">
                  {inboxCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
