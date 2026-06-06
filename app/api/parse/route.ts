import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

// What the AI returns per task. Kept small and gradeable so the model has a
// clear target; the client maps this onto the full Task shape.
const ResultSchema = z.object({
  tasks: z.array(
    z.object({
      title: z.string(),
      priority: z.enum(["low", "medium", "high"]),
      // Realistic time-to-complete estimate, in minutes.
      estimateMin: z.number().int(),
      // Whether this belongs on today's checklist vs. sitting in the inbox.
      today: z.boolean(),
    }),
  ),
});

const SYSTEM = `Ти — асистент-планувальник дня. Користувач диктує або пише потік думок (українською або іншою мовою). Розбий його на окремі конкретні, дієві задачі.

Правила:
- Кожна задача — короткий формат «дія + об'єкт» (напр. «Подзвонити в банк», «Купити воду»). Прибирай зайві слова.
- Не вигадуй задач, яких немає в тексті. Не дублюй.
- priority: "high" — дедлайни, термінове, важливе; "medium" — звичайне; "low" — дрібниці «колись».
- estimateMin: ціле число хвилин — реалістична оцінка часу на задачу (зазвичай 5–240). Дрібна дія ~10–15, дзвінок ~15–30, серйозна робота/звіт ~60–180.
- today: true, якщо задача явно на сьогодні / термінова / згадано «сьогодні», «зараз», «терміново», або це дрібна швидка дія. Інакше false.
- Зберігай мову оригіналу в title.
- Якщо тексту немає сенсовних задач — поверни порожній масив.`;

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
      system: SYSTEM,
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
