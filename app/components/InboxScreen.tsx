"use client";

import type { Task } from "../lib/types";

interface Props {
  tasks: Task[];
  onMoveToToday: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function InboxScreen({ tasks, onMoveToToday, onDelete }: Props) {
  return (
    <div className="flex h-full flex-col px-5 pt-6">
      <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
      <p className="mt-1 text-[15px] text-(--color-muted)">
        Розпарсені задачі. Признач їх на сьогодні.
      </p>

      {tasks.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="mt-4 flex-1 space-y-3 overflow-y-auto pb-4">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-3 rounded-2xl bg-(--color-surface) p-4"
            >
              <span className="flex-1 text-[17px] leading-snug">
                {task.title}
              </span>
              <button
                type="button"
                aria-label="На сьогодні"
                onClick={() => onMoveToToday(task.id)}
                className="h-11 shrink-0 rounded-full bg-(--color-accent) px-4 text-sm font-semibold text-white transition active:scale-95"
              >
                Сьогодні
              </button>
              <button
                type="button"
                aria-label="Видалити"
                onClick={() => onDelete(task.id)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--color-surface-2) text-(--color-muted) transition active:scale-95"
              >
                ✕
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
      <div className="text-5xl">📥</div>
      <p className="mt-3 text-[15px]">
        Поки порожньо.
        <br />
        Запиши думки на екрані «Capture».
      </p>
    </div>
  );
}
