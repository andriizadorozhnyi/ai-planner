"use client";

import type { Task } from "../lib/types";

interface Props {
  tasks: Task[];
  onToggle: (id: string) => void;
}

export default function TodayScreen({ tasks, onToggle }: Props) {
  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <div className="flex h-full flex-col px-5 pt-6">
      <h1 className="text-2xl font-semibold tracking-tight">Сьогодні</h1>
      <p className="mt-1 text-[15px] text-(--color-muted)">
        {tasks.length === 0
          ? "Чекліст на день."
          : `${doneCount} з ${tasks.length} виконано.`}
      </p>

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
