"use client";

import { useMemo } from "react";
import {
  addDaysISO,
  dayOfMonth,
  formatDue,
  isOverdue,
  prettyDate,
  todayISO,
  weekdayLong,
  weekdayShort,
} from "../lib/due";
import type { Task } from "../lib/types";

interface Props {
  /** All tasks (the screen filters by day itself). */
  tasks: Task[];
  selectedDay: string;
  onSelectDay: (day: string) => void;
  onToggle: (id: string) => void;
  /** Move all undone tasks from given day → next day. */
  onMoveAllToTomorrow: (fromDay: string) => void;
  /** Move ALL undone overdue tasks (any past day) → today. */
  onCatchUpOverdue: () => void;
  capacityHours: number;
  onCapacityChange: (h: number) => void;
}

function fmt(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h && m) return `${h} год ${m} хв`;
  if (h) return `${h} год`;
  return `${m} хв`;
}

export default function WeekScreen({
  tasks,
  selectedDay,
  onSelectDay,
  onToggle,
  onMoveAllToTomorrow,
  onCatchUpOverdue,
  capacityHours,
  onCapacityChange,
}: Props) {
  const today = todayISO();
  const isToday = selectedDay === today;
  const isPast = selectedDay < today;

  // 7 days: today + next 6. Rolling week, future-facing.
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysISO(today, i)),
    [today],
  );

  // Tasks scheduled to the selected day.
  const dayTasks = useMemo(
    () => tasks.filter((t) => t.day === selectedDay),
    [tasks, selectedDay],
  );

  // Per-day load (in minutes) — drives the small bar under each day chip.
  const loadByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tasks) {
      if (!t.day || t.done) continue;
      map.set(t.day, (map.get(t.day) ?? 0) + (t.estimateMin ?? 0));
    }
    return map;
  }, [tasks]);

  // Overdue across ALL past days — surfaces above the day view, only on today's view.
  const overdueCount = useMemo(
    () => tasks.filter((t) => t.day && t.day < today && !t.done).length,
    [tasks, today],
  );

  const doneCount = dayTasks.filter((t) => t.done).length;
  const plannedMin = dayTasks.reduce((s, t) => s + (t.estimateMin ?? 0), 0);
  const capacityMin = capacityHours * 60;
  const fillPct = Math.min(120, Math.round((plannedMin / capacityMin) * 100));
  const overloaded = plannedMin > capacityMin;
  const remainingMin = Math.max(0, capacityMin - plannedMin);

  const setHours = (h: number) => onCapacityChange(Math.min(16, Math.max(1, h)));

  const undoneOnSelectedDay = dayTasks.filter((t) => !t.done).length;

  return (
    <div className="flex h-full flex-col px-5 pt-8">
      {/* Selected-day headline */}
      <h1 className="text-[34px] leading-none font-medium tracking-tight">
        {isToday ? "Сьогодні" : weekdayLong(selectedDay)}
      </h1>
      <p className="mt-2 text-[15px] text-(--color-muted)">
        {prettyDate(selectedDay)} · {dayTasks.length === 0
          ? "пусто"
          : `${doneCount} з ${dayTasks.length} виконано`}
      </p>

      {/* Day strip — 7 days, horizontally scrollable if needed */}
      <div
        role="tablist"
        aria-label="Дні тижня"
        className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {days.map((d) => {
          const isSel = d === selectedDay;
          const isTodayChip = d === today;
          const load = loadByDay.get(d) ?? 0;
          const loadPct = Math.min(100, Math.round((load / capacityMin) * 100));
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={isSel}
              onClick={() => onSelectDay(d)}
              className={`flex h-16 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border transition active:scale-95 ${
                isSel
                  ? "border-(--color-accent) bg-(--color-accent) text-white"
                  : isTodayChip
                    ? "border-(--color-accent)/50 bg-(--color-surface) text-(--color-text)"
                    : "border-(--color-border) bg-(--color-surface) text-(--color-muted)"
              }`}
            >
              <span className="text-[11px] uppercase tracking-tight">
                {weekdayShort(d)}
              </span>
              <span className="text-[17px] font-medium tabular-nums leading-none">
                {dayOfMonth(d)}
              </span>
              {/* Tiny load bar at the bottom of the chip */}
              <span
                aria-hidden="true"
                className={`mt-0.5 h-0.5 w-7 overflow-hidden rounded-full ${
                  isSel ? "bg-white/30" : "bg-white/10"
                }`}
              >
                <span
                  className={`block h-full ${
                    isSel ? "bg-white/80" : "bg-(--color-accent)"
                  }`}
                  style={{ width: `${loadPct}%` }}
                />
              </span>
            </button>
          );
        })}
      </div>

      {/* Catch-up banner — only on today, only if there's something to catch up */}
      {isToday && overdueCount > 0 && (
        <button
          type="button"
          onClick={onCatchUpOverdue}
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-(--color-accent)/40 bg-(--color-accent)/10 p-4 text-left transition active:scale-[0.99]"
        >
          <div className="min-w-0">
            <div className="text-[15px] font-medium text-(--color-accent)">
              З минулих днів {overdueCount}{" "}
              {pluralUk(overdueCount, ["задача", "задачі", "задач"])}
            </div>
            <div className="mt-0.5 text-[13px] text-(--color-muted)">
              Перенести все на сьогодні
            </div>
          </div>
          <ArrowIcon />
        </button>
      )}

      {/* KPI plate — only on today's view, only when there are tasks */}
      {isToday && dayTasks.length > 0 && (
        <section
          className={`mt-4 rounded-2xl border p-5 transition ${
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
                {!overloaded && plannedMin > 0 && <> · вільно {fmt(remainingMin)}</>}
              </div>
            </div>
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
      )}

      {/* Task list for the selected day */}
      {dayTasks.length === 0 ? (
        <EmptyDay isToday={isToday} isPast={isPast} />
      ) : (
        <ul className="mt-4 flex-1 space-y-2 overflow-y-auto pb-4">
          {dayTasks.map((task) => {
            const overdue = isOverdue(task, today);
            return (
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
                          overdue
                            ? "font-medium text-(--color-accent)"
                            : "text-(--color-caption)"
                        }`}
                      >
                        {overdue ? "⚠ " : "📅 "}
                        {formatDue(task.due, today)}
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
            );
          })}
        </ul>
      )}

      {/* Bulk "move all undone to tomorrow" — bottom action, only on today's view */}
      {isToday && undoneOnSelectedDay > 0 && (
        <button
          type="button"
          onClick={() => onMoveAllToTomorrow(selectedDay)}
          className="mb-4 mt-2 h-12 shrink-0 rounded-2xl border border-(--color-border) bg-(--color-surface) text-[14px] font-medium text-(--color-muted) transition active:scale-[0.98]"
        >
          Перенести невиконане на завтра →
        </button>
      )}
    </div>
  );
}

function EmptyDay({ isToday, isPast }: { isToday: boolean; isPast: boolean }) {
  const headline = isToday
    ? "На сьогодні нічого."
    : isPast
      ? "Цей день був порожній."
      : "День ще не заплановано.";
  const sub = isToday
    ? "Перенеси задачі з Inbox — і день візьме форму."
    : isPast
      ? "Якщо щось було — воно вже не вплине на план."
      : "Признач задачі з Inbox на цей день.";
  return (
    <div className="flex flex-1 flex-col items-center justify-center pb-10 text-center">
      <div className="text-[42px]" aria-hidden="true">
        {isToday ? "☀️" : isPast ? "🌙" : "📅"}
      </div>
      <p className="mt-4 max-w-[280px] text-[17px] leading-snug text-(--color-text)">
        {headline}
      </p>
      <p className="mt-1 max-w-[280px] text-[15px] text-(--color-muted)">
        {sub}
      </p>
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
function ArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-(--color-accent)">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

function pluralUk(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}
