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

// What the AI returns per task. Kept small and gradeable so the model has a
// clear target; the client maps this onto the full Task shape.
const ResultSchema = z.object({
  tasks: z.array(
    z.object({
      title: z.string(),
      priority: z.enum(["low", "medium", "high"]),
      // Realistic time-to-complete estimate, in minutes.
      estimateMin: z.number().int(),
      // ISO yyyy-mm-dd deadline if the text mentions one ("завтра", "в пʼятницю",
      // "до 15-го", "25 червня"); null otherwise.
      due: z.string().nullable(),
      // Whether this belongs on today's checklist vs. sitting in the inbox.
      today: z.boolean(),
    }),
  ),
});

/** Build the system prompt with the user's "today" so the model can resolve
 *  natural-language dates ("завтра", "в пʼятницю") into concrete ISO dates. */
function buildSystem(todayISO: string): string {
  return `Ти — асистент-планувальник дня. Користувач диктує або пише потік думок (українською або іншою мовою). Розбий його на окремі конкретні, дієві задачі.

Сьогоднішня дата: ${todayISO} (ISO yyyy-mm-dd). Використовуй її для розшифрування дат.

Правила:
- Кожна задача — короткий формат «дія + об'єкт» (напр. «Подзвонити в банк», «Купити воду»). Прибирай зайві слова.
- Не вигадуй задач, яких немає в тексті. Не дублюй.
- priority: "high" — дедлайни, термінове, важливе; "medium" — звичайне; "low" — дрібниці «колись».
- estimateMin: ціле число хвилин — реалістична оцінка часу (зазвичай 5–240). Дрібна дія ~10–15, дзвінок ~15–30, серйозна робота/звіт ~60–180.
- due: ISO yyyy-mm-dd, якщо у тексті явно згадано дату/дедлайн ("сьогодні", "завтра", "післязавтра", "у пʼятницю", "до 15-го", "25 червня", "до кінця тижня"). Розшифровуй відносно сьогоднішньої дати. Якщо точної дати немає — null.
- today: true, якщо due ≤ сьогодні, або задача явно термінова ("зараз", "терміново"), або це дрібна швидка дія. Інакше false.
- Зберігай мову оригіналу в title.
- Якщо тексту немає сенсовних задач — поверни порожній масив.`;
}

export async function POST(req: Request) {
  let text = "";
  try {
    ({ text } = await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!text || !text.trim()) {
    return NextResponse.json({ tasks: [] });
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
        effort: "low", // швидкий парс — інтелекту тут достатньо
        format: zodOutputFormat(ResultSchema),
      },
      system: buildSystem(todayISO()),
      messages: [{ role: "user", content: text }],
    });

    return NextResponse.json(response.parsed_output ?? { tasks: [] });
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
