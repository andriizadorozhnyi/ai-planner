"use client";

import type { TabKey } from "../lib/types";

interface Props {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  inboxCount: number;
}

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "capture", label: "Capture", icon: <CaptureIcon /> },
  { key: "inbox", label: "Inbox", icon: <InboxIcon /> },
  { key: "week", label: "Тиждень", icon: <WeekIcon /> },
];

/**
 * Bottom tab bar — sits in the thumb-zone. Tap targets are min 64×56 (well
 * above iOS 44pt), with a 2px red bar indicating the active tab instead of
 * a heavy fill (SKELAR brand favors restraint).
 */
export default function TabBar({ active, onChange, inboxCount }: Props) {
  return (
    <nav
      className="shrink-0 border-t border-(--color-border) bg-(--color-surface)"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: "0 -4px 20px rgba(26, 22, 20, 0.05)",
      }}
      aria-label="Основна навігація"
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
              className={`group relative flex h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium tracking-tight transition active:scale-95 ${
                isActive ? "text-(--color-text)" : "text-(--color-muted)"
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-6 w-6 items-center justify-center transition ${
                  isActive ? "text-(--color-accent)" : ""
                }`}
              >
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {tab.key === "inbox" && inboxCount > 0 && (
                <span
                  className="absolute right-[calc(50%-26px)] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-(--color-accent) px-1 text-[10px] font-semibold text-white"
                  aria-label={`${inboxCount} нерозібраних`}
                >
                  {inboxCount}
                </span>
              )}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-6 top-0 h-0.5 rounded-b-full bg-(--color-accent)"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// Geometric Hugeicons-style line icons — single stroke weight, square caps.
function CaptureIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4l10-10-4-4L4 16v4Z" />
      <path d="m14 6 4 4" />
    </svg>
  );
}
function InboxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 13h5l1 3h6l1-3h5" />
      <path d="M5 5h14l2 8v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6l2-8Z" />
    </svg>
  );
}
function WeekIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  );
}
