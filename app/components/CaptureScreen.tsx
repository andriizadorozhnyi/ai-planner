"use client";

import { useEffect, useRef, useState } from "react";
import { useSpeechRecognition } from "../lib/useSpeechRecognition";

interface Props {
  /** Hands the raw brain-dump off to be turned into tasks by the AI. */
  onCapture: (text: string) => Promise<void>;
}

/** Append two pieces of text with a single space, trimmed. */
function join(a: string, b: string): string {
  if (!a) return b;
  if (!b) return a;
  return `${a.replace(/\s+$/, "")} ${b}`.trim();
}

export default function CaptureScreen({ onCapture }: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const speech = useSpeechRecognition({ lang: "uk-UA" });

  // Snapshot of what was already in the field when the user started talking.
  // The full text shown while listening = baseline + speech.transcript.
  // This avoids any "append per result" logic in the parent — single source of truth.
  const baselineRef = useRef("");

  // Live-merge dictation into the textarea while listening.
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
      setError(
        "Цей браузер не підтримує голосовий ввід. Спробуй Chrome або Safari.",
      );
      return;
    }
    setError(null);
    if (speech.listening) {
      speech.stop();
      // What's in the textarea is the merged committed text — keep it as the
      // new baseline so any further typing/dictating starts from here.
      baselineRef.current = text;
    } else {
      // Lock in the current text as the baseline; new dictation appends to it.
      baselineRef.current = text;
      speech.start();
    }
  };

  const shownError = error ?? speech.error;

  return (
    <div className="flex h-full flex-col px-5 pt-6">
      <h1 className="text-2xl font-semibold tracking-tight">Що в голові?</h1>
      <p className="mt-1 text-[15px] text-(--color-muted)">
        {speech.listening
          ? "Слухаю… говори, я записую."
          : "Вивантаж усе одним потоком — голосом або текстом."}
      </p>

      {/* Full-bleed capture field. While listening, show live interim text below. */}
      <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-2xl bg-(--color-surface) focus-within:ring-2 focus-within:ring-(--color-accent)">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            // If user manually edits, reset baseline so dictation appends to the edited version.
            if (!speech.listening) baselineRef.current = e.target.value;
          }}
          disabled={busy}
          placeholder="Подзвонити в банк, купити воду, дедлайн по звіту в пʼятницю…"
          autoFocus
          className="min-h-0 flex-1 resize-none rounded-2xl bg-transparent p-4 text-lg leading-relaxed text-(--color-text) placeholder:text-(--color-muted)/60 outline-none disabled:opacity-60"
        />
        {speech.listening && speech.interim && (
          <p className="px-4 pb-3 text-lg italic leading-relaxed text-(--color-muted)">
            {speech.interim}
          </p>
        )}
      </div>

      {shownError && (
        <p className="mt-3 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300">
          {shownError}
        </p>
      )}

      <div className="flex items-center gap-3 py-5">
        <button
          type="button"
          aria-label={speech.listening ? "Зупинити запис" : "Диктувати голосом"}
          aria-pressed={speech.listening}
          onClick={onMic}
          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-white shadow-lg transition active:scale-95 ${
            speech.listening
              ? "animate-pulse bg-red-500 shadow-red-500/40"
              : "bg-(--color-accent) shadow-(--color-accent)/30 active:bg-(--color-accent-press)"
          }`}
        >
          <MicIcon />
        </button>

        <button
          type="button"
          onClick={save}
          disabled={!text.trim() || busy}
          className="h-16 flex-1 rounded-full bg-(--color-accent) text-lg font-semibold text-white transition active:scale-[0.98] disabled:opacity-40"
        >
          {busy ? "Розбираю…" : "Розібрати →"}
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
