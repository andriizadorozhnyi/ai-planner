"use client";

import { useEffect, useRef, useState } from "react";
import { useSpeechRecognition } from "../lib/useSpeechRecognition";

interface Props {
  /** Hands the raw brain-dump off to be turned into tasks by the AI. */
  onCapture: (text: string) => Promise<void>;
}

function join(a: string, b: string): string {
  if (!a) return b;
  if (!b) return a;
  return `${a.replace(/\s+$/, "")} ${b}`.trim();
}

// Tappable starters — kill the blank-page anxiety. Insert as a comma-joined seed.
const IDEAS = [
  "Подзвонити в банк",
  "Купити продукти",
  "Зустріч о 15:00",
  "Дедлайн у пʼятницю",
];

export default function CaptureScreen({ onCapture }: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const speech = useSpeechRecognition({ lang: "uk-UA" });
  const baselineRef = useRef("");

  useEffect(() => {
    if (!speech.listening) return;
    setText(join(baselineRef.current, speech.transcript));
  }, [speech.listening, speech.transcript]);

  const save = async () => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    speech.stop();
    speech.reset();
    setBusy(true);
    setError(null);
    try {
      await onCapture(trimmed);
      setText("");
      baselineRef.current = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Щось пішло не так.");
    } finally {
      setBusy(false);
    }
  };

  const onMic = () => {
    if (busy) return;
    if (!speech.supported) {
      setError("Цей браузер не підтримує голосовий ввід. Спробуй Chrome або Safari.");
      return;
    }
    setError(null);
    baselineRef.current = text;
    speech.toggle();
  };

  const insertIdea = (idea: string) => {
    setText((prev) => {
      const next = prev.trim() ? `${prev.replace(/\s*,?\s*$/, "")}, ${idea}` : idea;
      baselineRef.current = next;
      return next;
    });
    taRef.current?.focus();
  };

  const shownError = error ?? speech.error;
  const hasText = text.trim().length > 0;

  return (
    <div className="flex h-full flex-col px-5 pt-8">
      <h1 className="text-[34px] leading-none font-semibold tracking-tight">
        Що в голові?
      </h1>
      <p className="mt-2 text-[15px] leading-snug text-(--color-muted)">
        {speech.listening
          ? "Слухаю… говори, я записую."
          : "Вивантаж усе одним потоком — голосом або текстом."}
      </p>

      {/* Writing surface — not a form input. No loud focus ring; calm elevation. */}
      <div className="mt-5 flex min-h-0 flex-1 flex-col rounded-3xl bg-(--color-surface) shadow-soft transition-shadow focus-within:shadow-[0_2px_4px_rgba(26,22,20,0.05),0_14px_38px_rgba(26,22,20,0.10)]">
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (!speech.listening) baselineRef.current = e.target.value;
          }}
          disabled={busy}
          placeholder="Напиши або продиктуй усе, що крутиться в голові — справи, дедлайни, зустрічі. Розкладу по днях."
          autoFocus
          className="min-h-0 flex-1 resize-none rounded-3xl bg-transparent p-5 text-[18px] leading-[1.6] text-(--color-text) placeholder:text-(--color-caption) outline-none focus-visible:outline-none disabled:opacity-60"
        />
        {speech.listening && speech.interim && (
          <p className="px-5 pb-4 text-[18px] italic leading-[1.6] text-(--color-muted)">
            {speech.interim}
          </p>
        )}
      </div>

      {/* Idea chips — only on a blank, non-listening field */}
      {!hasText && !speech.listening && !busy && (
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Приклади">
          {IDEAS.map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => insertIdea(idea)}
              className="rounded-full border border-(--color-border) bg-(--color-surface) px-3.5 py-2 text-[13px] font-medium text-(--color-muted) shadow-soft transition active:scale-95"
            >
              + {idea}
            </button>
          ))}
        </div>
      )}

      {shownError && (
        <p
          role="alert"
          className="mt-3 rounded-2xl border border-(--color-accent)/25 bg-(--color-accent)/10 px-4 py-3 text-sm font-medium text-(--color-text)"
        >
          {shownError}
        </p>
      )}

      <div className="flex items-center gap-3 py-5">
        <button
          type="button"
          aria-label={speech.listening ? "Зупинити запис" : "Диктувати голосом"}
          aria-pressed={speech.listening}
          onClick={onMic}
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition active:scale-95 ${
            speech.listening
              ? "bg-(--color-accent) text-white shadow-cta"
              : "border border-(--color-border) bg-(--color-surface) text-(--color-text) shadow-soft active:bg-(--color-surface-2)"
          }`}
        >
          <MicIcon />
        </button>

        <button
          type="button"
          onClick={save}
          disabled={!hasText || busy}
          className="h-14 flex-1 rounded-2xl bg-(--color-accent) text-[17px] font-semibold tracking-tight text-white shadow-cta transition active:scale-[0.98] active:bg-(--color-accent-press) disabled:opacity-30 disabled:shadow-none"
        >
          {busy ? "Розбираю…" : "Розібрати"}
        </button>
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}
