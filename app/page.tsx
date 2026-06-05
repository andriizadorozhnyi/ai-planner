"use client";

import { useMemo, useState } from "react";
import CaptureScreen from "./components/CaptureScreen";
import InboxScreen from "./components/InboxScreen";
import TodayScreen from "./components/TodayScreen";
import TabBar from "./components/TabBar";
import { useLocalStorage } from "./lib/useLocalStorage";
import type { Task, TabKey } from "./lib/types";

let counter = 0;
function newId() {
  // Good enough for client-only ids; avoids SSR Date.now mismatch noise.
  counter += 1;
  return `${counter}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function Home() {
  const [tab, setTab] = useState<TabKey>("capture");
  const [tasks, setTasks] = useLocalStorage<Task[]>("ai-planner.tasks", []);

  const inboxTasks = useMemo(() => tasks.filter((t) => !t.today), [tasks]);
  const todayTasks = useMemo(() => tasks.filter((t) => t.today), [tasks]);

  /**
   * Placeholder for the future AI step: for now we just split the brain-dump
   * into one task per line. Swap this out for an LLM call later.
   */
  const handleCapture = (text: string) => {
    const titles = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const created: Task[] = titles.map((title) => ({
      id: newId(),
      title,
      source: text,
      done: false,
      today: false,
      createdAt: 0,
    }));
    if (created.length === 0) return;
    setTasks((prev) => [...created, ...prev]);
    setTab("inbox");
  };

  const moveToToday = (id: string) =>
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, today: true } : t))
    );

  const deleteTask = (id: string) =>
    setTasks((prev) => prev.filter((t) => t.id !== id));

  const toggleDone = (id: string) =>
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );

  return (
    <main className="mx-auto flex h-dvh max-w-md flex-col">
      <section className="min-h-0 flex-1">
        {tab === "capture" && <CaptureScreen onCapture={handleCapture} />}
        {tab === "inbox" && (
          <InboxScreen
            tasks={inboxTasks}
            onMoveToToday={moveToToday}
            onDelete={deleteTask}
          />
        )}
        {tab === "today" && (
          <TodayScreen tasks={todayTasks} onToggle={toggleDone} />
        )}
      </section>

      <TabBar active={tab} onChange={setTab} inboxCount={inboxTasks.length} />
    </main>
  );
}
