"use client";

import { useMemo, useState } from "react";
import { addDaysISO, formatDue, hasDue, isOverdue, todayISO } from "../lib/due";
import type { Priority, Task } from "../lib/types";
import FilterChips, { type FilterChip } from "./FilterChips";

const PRIORITY_COLOR: Record<Priority, string> = {
  high: "bg-(--color-accent)",
  medium: "bg-white/60",
  low: "bg-white/25",
};

type FilterKey = "all" | "high" | "due" | "overdue";

interface Props {
  tasks: Task[];
  /** Schedule a task to a specific day (ISO yyyy-mm-dd). */
  onSchedule: (id: string, day: string) => void;
  onDelete: (id: string) => void;
  onGoToCapture: () => void;
}

export default function InboxScreen({
  tasks,
  onSchedule,
  onDelete,
  onGoToCapture,
}: Props) {
  const today = todayISO();
  const tomorrow = addDaysISO(today, 1);
  const [filter, setFilter] = useState<FilterKey>("all");

  // Counts power the chip badges. Compute over the FULL list so the user can
  // see "there are 3 overdue items" even from inside another filter.
  const counts = useMemo(() => {
    let high = 0;
    let due = 0;
    let overdue = 0;
    for (const t of tasks) {
      if (t.priority === "high") high++;
      if (hasDue(t)) due++;
      if (isOverdue(t, today)) overdue++;
    }
    return { all: tasks.length, high, due, overdue };
  }, [tasks, today]);

  const visible = useMemo(() => {
    switch (filter) {
      case "high":
        return tasks.filter((t) => t.priority === "high");
      case "due":
        return tasks.filter(hasDue);
      case "overdue":
        return tasks.filter((t) => isOverdue(t, today));
      default:
        return tasks;
    }
  }, [tasks, filter, today]);

  const chips: FilterChip<FilterKey>[] = [
    { key: "all", label: "Усі", count: counts.all },
    { key: "high", label: "Високі", count: counts.high },
    { key: "due", label: "З дедлайном", count: counts.due },
    { key: "overdue", label: "Прострочені", count: counts.overdue },
  ];

  return (
    <div className="flex h-full flex-col overflow-y-auto px-5 pt-8 pb-6">
      <h1 className="text-[34px] leading-none font-medium tracking-tight">Inbox</h1>
      <p className="mt-2 text-[15px] text-(--color-muted)">
        {tasks.length === 0
          ? "Сюди потраплять розпарсені задачі."
          : `${tasks.length} ${pluralUk(tasks.length, ["задача", "задачі", "задач"])} чекає`}
      </p>

      {tasks.length === 0 ? (
        <EmptyState onGoToCapture={onGoToCapture} />
      ) : (
        <>
          <div className="mt-4">
            <FilterChips
              chips={chips}
              active={filter}
              onChange={setFilter}
              ariaLabel="Фільтри Inbox"
            />
          </div>

          {visible.length === 0 ? (
            <FilteredEmpty filter={filter} onReset={() => setFilter("all")} />
          ) : (
            <ul className="mt-4 space-y-2">
              {visible.map((task) => {
                const overdue = isOverdue(task, today);
                return (
                  <li
                    key={task.id}
                    className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-4"
                  >
                    {/* Row 1: text + estimate */}
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${PRIORITY_COLOR[task.priority ?? "low"]}`}
                        aria-label={`Пріоритет: ${task.priority ?? "low"}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[17px] leading-snug">{task.title}</div>
                        <div className="mt-1 flex items-center gap-3 text-[12px] text-(--color-caption)">
                          {task.estimateMin != null && (
                            <span className="tabular-nums">{fmt(task.estimateMin)}</span>
                          )}
                          {task.due && (
                            <span
                              className={`tabular-nums ${
                                overdue
                                  ? "font-medium text-(--color-accent)"
                                  : "text-(--color-muted)"
                              }`}
                            >
                              {overdue ? "⚠ " : "📅 "}
                              {formatDue(task.due, today)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Row 2: actions */}
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSchedule(task.id, today)}
                        className="h-11 flex-1 rounded-xl bg-(--color-accent) text-[14px] font-medium text-white transition active:scale-95 active:bg-(--color-accent-press)"
                      >
                        Сьогодні
                      </button>
                      <button
                        type="button"
                        onClick={() => onSchedule(task.id, tomorrow)}
                        className="h-11 flex-1 rounded-xl border border-(--color-border) bg-(--color-bg-alt) text-[14px] font-medium text-(--color-text) transition active:scale-95"
                      >
                        Завтра
                      </button>
                      <button
                        type="button"
                        aria-label="Видалити"
                        onClick={() => onDelete(task.id)}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-(--color-border) text-(--color-muted) transition active:scale-95"
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ onGoToCapture }: { onGoToCapture: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center pb-10 text-center">
      <div className="text-[42px]" aria-hidden="true">📥</div>
      <p className="mt-4 max-w-[280px] text-[17px] leading-snug text-(--color-text)">
        Inbox порожній.
      </p>
      <p className="mt-1 max-w-[280px] text-[15px] text-(--color-muted)">
        Запиши або продиктуй, що в голові — AI розкладе.
      </p>
      <button
        type="button"
        onClick={onGoToCapture}
        className="mt-6 h-12 rounded-2xl bg-(--color-accent) px-6 text-[15px] font-medium text-white transition active:scale-95 active:bg-(--color-accent-press)"
      >
        Записати думку →
      </button>
    </div>
  );
}

function FilteredEmpty({
  filter,
  onReset,
}: {
  filter: FilterKey;
  onReset: () => void;
}) {
  const label =
    filter === "high"
      ? "Високих задач немає."
      : filter === "due"
        ? "Задач із дедлайном немає."
        : "Прострочених немає.";
  return (
    <div className="flex flex-1 flex-col items-center justify-center pb-10 text-center">
      <p className="max-w-[280px] text-[17px] leading-snug text-(--color-text)">
        {label}
      </p>
      <p className="mt-1 max-w-[280px] text-[15px] text-(--color-muted)">
        {filter === "overdue" ? "Молодець." : "Спробуй інший фільтр."}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-6 h-12 rounded-2xl border border-(--color-border) bg-(--color-surface) px-6 text-[15px] font-medium text-(--color-text) transition active:scale-95"
      >
        Показати всі
      </button>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function fmt(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h && m) return `${h} год ${m} хв`;
  if (h) return `${h} год`;
  return `${m} хв`;
}

function pluralUk(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}
