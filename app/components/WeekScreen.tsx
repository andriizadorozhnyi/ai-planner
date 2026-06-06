"use client";

import { useMemo } from "react";
import {
  addDaysISO,
  dayOfMonth,
  formatDue,
  formatSlot,
  isOverdue,
  prettyDate,
  slotDurationMin,
  todayISO,
  weekdayLong,
  weekdayShort,
} from "../lib/due";
import type { BusySlot, Task } from "../lib/types";

interface Props {
  tasks: Task[];
  busySlots: BusySlot[];
  selectedDay: string;
  onSelectDay: (day: string) => void;
  onToggle: (id: string) => void;
  onDeleteBusySlot: (id: string) => void;
  onMoveAllToTomorrow: (fromDay: string) => void;
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
  busySlots,
  selectedDay,
  onSelectDay,
  onToggle,
  onDeleteBusySlot,
  onMoveAllToTomorrow,
  onCatchUpOverdue,
  capacityHours,
  onCapacityChange,
}: Props) {
  const today = todayISO();
  const isToday = selectedDay === today;
  const isPast = selectedDay < today;

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysISO(today, i)),
    [today],
  );

  const dayTasks = useMemo(
    () => tasks.filter((t) => t.day === selectedDay),
    [tasks, selectedDay],
  );
  const daySlots = useMemo(
    () =>
      busySlots
        .filter((s) => s.day === selectedDay)
        .sort((a, b) => a.start.localeCompare(b.start)),
    [busySlots, selectedDay],
  );

  // Load per day — busy time + task estimates. Drives the strip mini-bars.
  const loadByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tasks) {
      if (!t.day || t.done) continue;
      map.set(t.day, (map.get(t.day) ?? 0) + (t.estimateMin ?? 0));
    }
    for (const s of busySlots) {
      map.set(s.day, (map.get(s.day) ?? 0) + slotDurationMin(s));
    }
    return map;
  }, [tasks, busySlots]);

  const overdueCount = useMemo(
    () => tasks.filter((t) => t.day && t.day < today && !t.done).length,
    [tasks, today],
  );

  const doneCount = dayTasks.filter((t) => t.done).length;
  const taskMin = dayTasks.reduce((s, t) => s + (t.estimateMin ?? 0), 0);
  const busyMin = daySlots.reduce((s, b) => s + slotDurationMin(b), 0);
  const plannedMin = taskMin + busyMin;
  const capacityMin = capacityHours * 60;
  const fillPct = Math.min(120, Math.round((plannedMin / capacityMin) * 100));
  const overloaded = plannedMin > capacityMin;
  const remainingMin = Math.max(0, capacityMin - plannedMin);

  const setHours = (h: number) =>
    onCapacityChange(Math.min(16, Math.max(1, h)));

  const undoneOnSelectedDay = dayTasks.filter((t) => !t.done).length;

  return (
    <div className="h-full overflow-y-auto px-5 pt-8 pb-6">
      <h1 className="text-[34px] leading-none font-medium tracking-tight">
        {isToday ? "Сьогодні" : weekdayLong(selectedDay)}
      </h1>
      <p className="mt-2 text-[15px] text-(--color-muted)">
        {prettyDate(selectedDay)} ·{" "}
        {dayTasks.length === 0 && daySlots.length === 0
          ? "пусто"
          : `${doneCount} з ${dayTasks.length} виконано`}
      </p>

      {/* Day strip */}
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
              <span
                aria-hidden="true"
                className={`mt-0.5 h-0.5 w-7 overflow-hidden rounded-full ${
                  isSel ? "bg-white/30" : "bg-(--color-track)"
                }`}
              >
                <span
                  className={`block h-full ${
                    isSel ? "bg-white/90" : "bg-(--color-accent)"
                  }`}
                  style={{ width: `${loadPct}%` }}
                />
              </span>
            </button>
          );
        })}
      </div>

      {/* Catch-up banner — today only */}
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

      {/* KPI plate — only on today's view, only when there's anything */}
      {isToday && (dayTasks.length > 0 || daySlots.length > 0) && (
        <section
          className={`mt-4 rounded-2xl border p-5 shadow-soft transition ${
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
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-(--color-track)">
            <div
              className={`h-full rounded-full transition-[width] ${
                overloaded ? "bg-(--color-accent)" : "bg-(--color-fill)"
              }`}
              style={{ width: `${Math.min(100, fillPct)}%` }}
            />
          </div>
          {/* Breakdown — busy vs task time */}
          {busyMin > 0 && (
            <p className="mt-3 text-[13px] text-(--color-muted) tabular-nums">
              {fmt(busyMin)} зустрічі · {fmt(taskMin)} задачі
            </p>
          )}
          {overloaded && (
            <p className="mt-2 text-[13px] font-medium text-(--color-accent)">
              Перенеси частину на інший день або прибери дрібниці.
            </p>
          )}
        </section>
      )}

      {/* Busy slots (meetings) — calm grey cards above the task list */}
      {daySlots.length > 0 && (
        <section className="mt-4" aria-label="Зайняті слоти">
          <ul className="space-y-2">
            {daySlots.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-2xl border border-(--color-border) bg-(--color-bg-alt) px-4 py-3"
              >
                <span aria-hidden="true" className="text-[15px]">📅</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] leading-snug text-(--color-text)">
                    {s.title}
                  </div>
                  <div className="text-[12px] tabular-nums text-(--color-muted)">
                    {formatSlot(s)} · {fmt(slotDurationMin(s))}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Видалити слот"
                  onClick={() => onDeleteBusySlot(s.id)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-(--color-border) text-(--color-muted) transition active:scale-95"
                >
                  <CloseIcon />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Task list */}
      {dayTasks.length === 0 ? (
        daySlots.length === 0 && (
          <EmptyDay isToday={isToday} isPast={isPast} />
        )
      ) : (
        <ul className="mt-4 space-y-2">
          {dayTasks.map((task) => {
            const overdue = isOverdue(task, today);
            return (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => onToggle(task.id)}
                  className="flex min-h-14 w-full items-center gap-4 rounded-2xl border border-(--color-border) bg-(--color-surface) p-4 text-left shadow-soft transition active:scale-[0.99]"
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
                    {/* Slot is a primary signal — render in muted-but-tabular row */}
                    {(task.scheduledSlot || (task.due && !task.done)) && (
                      <div className="mt-0.5 flex items-center gap-3 text-[12px] tabular-nums">
                        {task.scheduledSlot && !task.done && (
                          <span className="text-(--color-muted)">
                            🕒 {formatSlot(task.scheduledSlot)}
                          </span>
                        )}
                        {task.due && !task.done && (
                          <span
                            className={
                              overdue
                                ? "font-medium text-(--color-accent)"
                                : "text-(--color-caption)"
                            }
                          >
                            {overdue ? "⚠ " : "📅 "}
                            {formatDue(task.due, today)}
                          </span>
                        )}
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

      {isToday && undoneOnSelectedDay > 0 && (
        <button
          type="button"
          onClick={() => onMoveAllToTomorrow(selectedDay)}
          className="mt-4 h-12 w-full rounded-2xl border border-(--color-border) bg-(--color-surface) text-[14px] font-medium text-(--color-muted) transition active:scale-[0.98]"
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
    ? "Перенеси задачі з Inbox або скажи AI про мітинги і задачі дня."
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
function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
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
