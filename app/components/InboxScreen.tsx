"use client";

import type { Priority, Task } from "../lib/types";

const PRIORITY_COLOR: Record<Priority, string> = {
  high: "bg-(--color-accent)",
  medium: "bg-white/60",
  low: "bg-white/25",
};

interface Props {
  tasks: Task[];
  onMoveToToday: (id: string) => void;
  onDelete: (id: string) => void;
  onGoToCapture: () => void;
}

export default function InboxScreen({
  tasks,
  onMoveToToday,
  onDelete,
  onGoToCapture,
}: Props) {
  return (
    <div className="flex h-full flex-col px-5 pt-8">
      <h1 className="text-[34px] leading-none font-medium tracking-tight">Inbox</h1>
      <p className="mt-2 text-[15px] text-(--color-muted)">
        {tasks.length === 0
          ? "Сюди потраплять розпарсені задачі."
          : `${tasks.length} ${pluralUk(tasks.length, ["задача", "задачі", "задач"])} чекає`}
      </p>

      {tasks.length === 0 ? (
        <EmptyState onGoToCapture={onGoToCapture} />
      ) : (
        <ul className="mt-5 flex-1 space-y-2 overflow-y-auto pb-4">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-3 rounded-2xl border border-(--color-border) bg-(--color-surface) p-3 pl-4"
            >
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${PRIORITY_COLOR[task.priority ?? "low"]}`}
                aria-label={`Пріоритет: ${task.priority ?? "low"}`}
              />
              <span className="flex-1 text-[17px] leading-snug">{task.title}</span>
              {task.estimateMin != null && (
                <span className="shrink-0 text-[13px] tabular-nums text-(--color-muted)">
                  {fmt(task.estimateMin)}
                </span>
              )}
              <button
                type="button"
                onClick={() => onMoveToToday(task.id)}
                className="h-11 shrink-0 rounded-xl bg-(--color-accent) px-4 text-[14px] font-medium text-white transition active:scale-95 active:bg-(--color-accent-press)"
              >
                Сьогодні
              </button>
              <button
                type="button"
                aria-label="Видалити"
                onClick={() => onDelete(task.id)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-(--color-border) text-(--color-muted) transition active:scale-95"
              >
                <CloseIcon />
              </button>
            </li>
          ))}
        </ul>
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

/** Ukrainian plural — one / few / many. */
function pluralUk(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}
