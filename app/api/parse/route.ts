import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

/** Today in ISO yyyy-mm-dd, server local time. */
function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// "HH:MM" 24-hour. Accepted as-is from the model.
const TIME_RE = /^([0-1]\d|2[0-3]):[0-5]\d$/;
const SlotSchema = z.object({
  start: z.string().regex(TIME_RE),
  end: z.string().regex(TIME_RE),
});

const ResultSchema = z.object({
  tasks: z.array(
    z.object({
      title: z.string(),
      priority: z.enum(["low", "medium", "high"]),
      estimateMin: z.number().int(),
      due: z.string().nullable(),
      day: z.string().nullable(),
      // Suggested time slot when the day has known busy time and there's
      // enough info to place the task. null when the model isn't confident.
      scheduledSlot: SlotSchema.nullable(),
    }),
  ),
  // Pre-existing busy time pulled from the brain-dump: meetings, calls,
  // lunch, focus blocks — anything the user said they're already committed to.
  busySlots: z.array(
    z.object({
      day: z.string(),
      start: z.string().regex(TIME_RE),
      end: z.string().regex(TIME_RE),
      title: z.string(),
    }),
  ),
});

/** Existing context that the client knows about — informs the model so it
 *  doesn't re-create the same busy slot or double-book a planned task. */
interface DayContext {
  busySlots: Array<{ start: string; end: string; title: string }>;
  scheduledTasks: Array<{ title: string; slot: { start: string; end: string } }>;
}

function buildSystem(today: string, ctx: DayContext | null): string {
  const base = `Ти — асистент-планувальник дня. Користувач диктує або пише потік думок (українською або іншою мовою). Розбий його на окремі конкретні, дієві задачі, і виокрем зайняті часові слоти.

Сьогоднішня дата: ${today} (ISO yyyy-mm-dd). Робочий день — типово 09:00–18:00.

ЗАДАЧІ (tasks[]):
- title: короткий формат «дія + об'єкт».
- priority: "high" — дедлайни, термінове; "medium" — звичайне; "low" — «колись».
- estimateMin: ціле число хвилин (зазвичай 5–240).
- due: ISO yyyy-mm-dd якщо явно дедлайн ("до пʼятниці", "до 15-го"). Інакше null.
- day: ISO yyyy-mm-dd день виконання («сьогодні»→${today}, «завтра», «у пʼятницю»). Якщо нічого — null (Inbox).
- scheduledSlot: {start, end} у форматі "HH:MM" — рекомендований час сьогодні, ВРАХОВУЮЧИ зайняті слоти і вже заплановане. Якщо задача не на сьогодні, або немає достатньо контексту — null.

ЗАЙНЯТІ СЛОТИ (busySlots[]):
- Якщо у тексті згадано мітинги, дзвінки, обід, тренування, фокус-час, інше зайнятість на конкретний час — додавай у busySlots.
- start/end: "HH:MM", day: ISO yyyy-mm-dd, title: короткий опис ("Мітинг з командою", "Обід").
- Не плутай із задачами: «о 10:00 мітинг з командою» — це busySlot, а не task. «о 10:00 подзвонити в банк» — це task (юзер сам має зробити) з scheduledSlot.

ЗАГАЛЬНІ ПРАВИЛА:
- Не вигадуй того, чого немає в тексті. Не дублюй.
- Зберігай мову оригіналу в title.`;

  if (!ctx || (ctx.busySlots.length === 0 && ctx.scheduledTasks.length === 0)) {
    return base;
  }

  let context = `\n\nКОНТЕКСТ СЬОГОДНІ (вже відомо клієнту, НЕ ДУБЛЮЙ):`;
  if (ctx.busySlots.length) {
    context += `\nЗайняті слоти: ${ctx.busySlots
      .map((b) => `${b.start}–${b.end} ${b.title}`)
      .join("; ")}`;
  }
  if (ctx.scheduledTasks.length) {
    context += `\nУже заплановано: ${ctx.scheduledTasks
      .map((t) => `${t.slot.start}–${t.slot.end} ${t.title}`)
      .join("; ")}`;
  }
  context += `\nНові задачі на сьогодні ПЛАНУЙ У ВІЛЬНІ ВІКНА між цими блоками.`;
  return base + context;
}

export async function POST(req: Request) {
  let text = "";
  let ctx: DayContext | null = null;
  try {
    const body = await req.json();
    text = body.text;
    if (body.todayContext) ctx = body.todayContext as DayContext;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!text || !text.trim()) {
    return NextResponse.json({ tasks: [], busySlots: [] });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY не налаштований на сервері." },
      { status: 500 },
    );
  }

  try {
    const response = await client.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      output_config: {
        effort: "low",
        format: zodOutputFormat(ResultSchema),
      },
      system: buildSystem(todayISO(), ctx),
      messages: [{ role: "user", content: text }],
    });

    return NextResponse.json(
      response.parsed_output ?? { tasks: [], busySlots: [] },
    );
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Claude API: ${error.status} ${error.message}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "Не вдалося розібрати." }, { status: 500 });
  }
}
