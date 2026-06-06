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
  // Hours available for tasks today — drives the realism warning.
  const [capacityHours, setCapacityHours] = useLocalStorage<number>(
    "ai-planner.capacityHours",
    8,
  );

  const inboxTasks = useMemo(() => tasks.filter((t) => !t.today), [tasks]);
  const todayTasks = useMemo(() => tasks.filter((t) => t.today), [tasks]);

  /**
   * Sends the brain-dump to the AI parser and turns the result into tasks.
   * Throws on failure so CaptureScreen can surface the error.
   */
  const handleCapture = async (text: string) => {
    const res = await fetch("/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Не вдалося розібрати.");

    const created: Task[] = (data.tasks ?? []).map(
      (t: {
        title: string;
        priority: Task["priority"];
        estimateMin?: number;
        today: boolean;
      }) => ({
        id: newId(),
        title: t.title,
        source: text,
        priority: t.priority,
        estimateMin:
          typeof t.estimateMin === "number" ? t.estimateMin : undefined,
        done: false,
        today: Boolean(t.today),
        createdAt: 0,
      }),
    );
    if (created.length === 0) return;
    setTasks((prev) => [...created, ...prev]);
    // Land on whichever screen got new tasks.
    setTab(created.some((t) => t.today) ? "today" : "inbox");
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
          <TodayScreen
            tasks={todayTasks}
            onToggle={toggleDone}
            capacityHours={capacityHours}
            onCapacityChange={setCapacityHours}
          />
        )}
      </section>

      <TabBar active={tab} onChange={setTab} inboxCount={inboxTasks.length} />
    </main>
  );
}
