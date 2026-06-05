"use client";

import { useState } from "react";

interface Props {
  /** Hands the raw brain-dump off to be turned into tasks. */
  onCapture: (text: string) => void;
}

export default function CaptureScreen({ onCapture }: Props) {
  const [text, setText] = useState("");

  const save = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onCapture(trimmed);
    setText("");
  };

  return (
    <div className="flex h-full flex-col px-5 pt-6">
      <h1 className="text-2xl font-semibold tracking-tight">Що в голові?</h1>
      <p className="mt-1 text-[15px] text-(--color-muted)">
        Вивантаж усе одним потоком — упорядкуємо пізніше.
      </p>

      {/* Full-bleed capture field */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Подзвонити в банк, купити воду, дедлайн по звіту в пʼятницю…"
        autoFocus
        className="mt-4 min-h-0 flex-1 resize-none rounded-2xl bg-(--color-surface) p-4 text-lg leading-relaxed text-(--color-text) placeholder:text-(--color-muted)/60 outline-none focus:ring-2 focus:ring-(--color-accent)"
      />

      <div className="flex items-center gap-3 py-5">
        {/* Big mic button — thumb-sized, primary action */}
        <button
          type="button"
          aria-label="Диктувати голосом"
          onClick={() =>
            alert("Голосовий ввід зʼявиться згодом 🎙️")
          }
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-(--color-accent) text-white shadow-lg shadow-(--color-accent)/30 transition active:scale-95 active:bg-(--color-accent-press)"
        >
          <MicIcon />
        </button>

        <button
          type="button"
          onClick={save}
          disabled={!text.trim()}
          className="h-16 flex-1 rounded-full bg-(--color-surface-2) text-lg font-semibold text-(--color-text) transition active:scale-[0.98] disabled:opacity-40"
        >
          Розібрати →
        </button>
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}
