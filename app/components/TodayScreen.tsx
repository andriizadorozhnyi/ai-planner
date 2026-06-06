"use client";

import type { Task } from "../lib/types";

interface Props {
  tasks: Task[];
  onToggle: (id: string) => void;
  capacityHours: number;
  onCapacityChange: (hours: number) => void;
}

/** Minutes → compact "Хг Yхв". */
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
}: Props) {
  const doneCount = tasks.filter((t) => t.done).length;

  // Planned load = sum of estimates across today's tasks (missing → 0).
  const plannedMin = tasks.reduce((sum, t) => sum + (t.estimateMin ?? 0), 0);
  const capacityMin = capacityHours * 60;
  const overloaded = plannedMin > capacityMin;
  const remainingMin = capacityMin - plannedMin;

  const setHours = (h: number) =>
    onCapacityChange(Math.min(16, Math.max(1, h)));

  return (
    <div className="flex h-full flex-col px-5 pt-6">
      <h1 className="text-2xl font-semibold tracking-tight">Сьогодні</h1>
      <p className="mt-1 text-[15px] text-(--color-muted)">
        {tasks.length === 0
          ? "Чекліст на день."
          : `${doneCount} з ${tasks.length} виконано${
              plannedMin > 0 ? ` · заплановано ≈ ${fmt(plannedMin)}` : ""
            }`}
      </p>

      {tasks.length > 0 && (
        <>
          {/* Capacity stepper */}
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-(--color-surface) px-4 py-3">
            <span className="text-[15px] text-(--color-muted)">Ємність дня</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Менше годин"
                onClick={() => setHours(capacityHours - 1)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-(--color-surface-2) text-xl leading-none text-(--color-text) transition active:scale-90"
              >
                −
              </button>
              <span className="min-w-16 text-center text-[15px] font-semibold tabular-nums">
                {capacityHours} год
              </span>
              <button
                type="button"
                aria-label="Більше годин"
                onClick={() => setHours(capacityHours + 1)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-(--color-surface-2) text-xl leading-none text-(--color-text) transition active:scale-90"
              >
                +
              </button>
            </div>
          </div>

          {/* Realism banner */}
          {overloaded ? (
            <p className="mt-3 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300">
              ⚠️ Задач на ≈ {fmt(plannedMin)}, а в дні {capacityHours} год.
              Перенеси частину або прибери дрібниці.
            </p>
          ) : (
            plannedMin > 0 && (
              <p className="mt-3 rounded-xl bg-(--color-surface) px-4 py-3 text-sm text-(--color-muted)">
                👍 Влізає. Вільно ще ≈ {fmt(remainingMin)}.
              </p>
            )
          )}
        </>
      )}

      {tasks.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="mt-4 flex-1 space-y-3 overflow-y-auto pb-4">
          {tasks.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => onToggle(task.id)}
                className="flex w-full items-center gap-4 rounded-2xl bg-(--color-surface) p-4 text-left transition active:scale-[0.99]"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${
                    task.done
                      ? "border-(--color-accent) bg-(--color-accent) text-white"
                      : "border-(--color-border)"
                  }`}
                >
                  {task.done ? "✓" : ""}
                </span>
                <span
                  className={`flex-1 text-[17px] leading-snug ${
                    task.done
                      ? "text-(--color-muted) line-through"
                      : "text-(--color-text)"
                  }`}
                >
                  {task.title}
                </span>
                {task.estimateMin != null && (
                  <span className="shrink-0 text-sm tabular-nums text-(--color-muted)">
                    {fmt(task.estimateMin)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center text-(--color-muted)">
      <div className="text-5xl">☀️</div>
      <p className="mt-3 text-[15px]">
        На сьогодні нічого.
        <br />
        Перенеси задачі з Inbox.
      </p>
    </div>
  );
}
