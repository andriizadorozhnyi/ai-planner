"use client";

import { formatDue, isOverdue, todayISO } from "../lib/due";
import type { Task } from "../lib/types";

interface Props {
  tasks: Task[];
  onToggle: (id: string) => void;
  capacityHours: number;
  onCapacityChange: (hours: number) => void;
  onGoToInbox: () => void;
}

/** Minutes → "Xг Yхв" — short, tabular-friendly. */
function fmt(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h && m) return `${h} год ${m} хв`;
  if (h) return `${h} год`;
  return `${m} хв`;
}

export default function TodayScreen({
  tasks,
  onToggle,
  capacityHours,
  onCapacityChange,
  onGoToInbox,
}: Props) {
  const doneCount = tasks.filter((t) => t.done).length;
  const plannedMin = tasks.reduce((s, t) => s + (t.estimateMin ?? 0), 0);
  const capacityMin = capacityHours * 60;
  const fillPct = Math.min(120, Math.round((plannedMin / capacityMin) * 100));
  const overloaded = plannedMin > capacityMin;
  const remainingMin = Math.max(0, capacityMin - plannedMin);

  const setHours = (h: number) =>
    onCapacityChange(Math.min(16, Math.max(1, h)));

  return (
    <div className="flex h-full flex-col px-5 pt-8">
      <h1 className="text-[34px] leading-none font-medium tracking-tight">Сьогодні</h1>
      <p className="mt-2 text-[15px] text-(--color-muted)">
        {tasks.length === 0
          ? "Чекліст на день."
          : `${doneCount} з ${tasks.length} виконано`}
      </p>

      {tasks.length === 0 ? (
        <EmptyState onGoToInbox={onGoToInbox} />
      ) : (
        <>
          {/* KPI tile — the day at a glance. The big number IS the headline. */}
          <section
            className={`mt-5 rounded-2xl border p-5 transition ${
              overloaded
                ? "border-(--color-accent)/40 bg-(--color-accent)/10"
                : "border-(--color-border) bg-(--color-surface)"
            }`}
            aria-label="Завантаженість дня"
          >
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <div
                  className={`text-[32px] leading-none font-medium tracking-tight tabular-nums ${
                    overloaded ? "text-(--color-accent)" : "text-(--color-text)"
                  }`}
                >
                  {fmt(plannedMin)}
                </div>
                <div className="mt-1 text-[13px] text-(--color-muted)">
                  з {capacityHours} год дня
                  {!overloaded && plannedMin > 0 && (
                    <> · вільно {fmt(remainingMin)}</>
                  )}
                </div>
              </div>

              {/* Capacity stepper — 44×44 each, tabular numerals for steady width */}
              <div className="flex items-center gap-2" aria-label="Ємність дня">
                <button
                  type="button"
                  aria-label="Менше годин"
                  onClick={() => setHours(capacityHours - 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-(--color-border) bg-(--color-bg-alt) text-xl leading-none text-(--color-text) transition active:scale-90"
                >
                  −
                </button>
                <span className="min-w-7 text-center text-[15px] font-medium tabular-nums">
                  {capacityHours}
                </span>
                <button
                  type="button"
                  aria-label="Більше годин"
                  onClick={() => setHours(capacityHours + 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-(--color-border) bg-(--color-bg-alt) text-xl leading-none text-(--color-text) transition active:scale-90"
                >
                  +
                </button>
              </div>
            </div>

            {/* Progress bar — also the realism signal. Red overflow when over. */}
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className={`h-full rounded-full transition-[width] ${
                  overloaded ? "bg-(--color-accent)" : "bg-white/60"
                }`}
                style={{ width: `${Math.min(100, fillPct)}%` }}
              />
            </div>
            {overloaded && (
              <p className="mt-3 text-[13px] font-medium text-(--color-accent)">
                Перенеси частину на інший день або прибери дрібниці.
              </p>
            )}
          </section>

          <ul className="mt-4 flex-1 space-y-2 overflow-y-auto pb-4">
            {tasks.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => onToggle(task.id)}
                  className="flex min-h-14 w-full items-center gap-4 rounded-2xl border border-(--color-border) bg-(--color-surface) p-4 text-left transition active:scale-[0.99]"
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${
                      task.done
                        ? "border-(--color-accent) bg-(--color-accent) text-white"
                        : "border-(--color-border)"
                    }`}
                  >
                    {task.done && <CheckIcon />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-[17px] leading-snug ${
                        task.done
                          ? "text-(--color-muted) line-through"
                          : "text-(--color-text)"
                      }`}
                    >
                      {task.title}
                    </div>
                    {task.due && !task.done && (
                      <div
                        className={`mt-0.5 text-[12px] tabular-nums ${
                          isOverdue(task, todayISO())
                            ? "font-medium text-(--color-accent)"
                            : "text-(--color-caption)"
                        }`}
                      >
                        {isOverdue(task, todayISO()) ? "⚠ " : "📅 "}
                        {formatDue(task.due, todayISO())}
                      </div>
                    )}
                  </div>
                  {task.estimateMin != null && (
                    <span className="shrink-0 text-[13px] tabular-nums text-(--color-muted)">
                      {fmt(task.estimateMin)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function EmptyState({ onGoToInbox }: { onGoToInbox: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center pb-10 text-center">
      <div className="text-[42px]" aria-hidden="true">☀️</div>
      <p className="mt-4 max-w-[280px] text-[17px] leading-snug text-(--color-text)">
        На сьогодні нічого.
      </p>
      <p className="mt-1 max-w-[280px] text-[15px] text-(--color-muted)">
        Перенеси задачі з Inbox — і день візьме форму.
      </p>
      <button
        type="button"
        onClick={onGoToInbox}
        className="mt-6 h-12 rounded-2xl border border-(--color-border) bg-(--color-surface) px-6 text-[15px] font-medium text-(--color-text) transition active:scale-95"
      >
        Відкрити Inbox →
      </button>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
