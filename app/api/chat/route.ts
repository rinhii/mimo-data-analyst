import { NextRequest, NextResponse } from "next/server";
import { getMimoClient, getMimoModel, SYSTEM_PROMPT } from "@/lib/mimo";
import { TOOL_SCHEMAS } from "@/lib/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatRequestBody {
  messages: {
    role: "user" | "assistant" | "system" | "tool";
    content: string | null;
    tool_calls?: {
      id: string;
      type: "function";
      function: { name: string; arguments: string };
    }[];
    tool_call_id?: string;
    name?: string;
  }[];
  datasetSummary?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const client = getMimoClient();
    const model = getMimoModel();

    const systemContent = body.datasetSummary
      ? `${SYSTEM_PROMPT}\n\n---\nDATASET PROFILE (read-only context):\n${body.datasetSummary}`
      : SYSTEM_PROMPT;

    const messages = [
      { role: "system" as const, content: systemContent },
      ...body.messages,
    ];

    const completion = await client.chat.completions.create({
      model,
      messages: messages as unknown as Parameters<
        typeof client.chat.completions.create
      >[0]["messages"],
      tools: TOOL_SCHEMAS as unknown as Parameters<
        typeof client.chat.completions.create
      >[0]["tools"],
      tool_choice: "auto",
      temperature: 0.2,
      max_tokens: 2048,
    });

    const msg = completion.choices[0]?.message;
    return NextResponse.json({
      message: {
        role: "assistant",
        content: msg?.content ?? "",
        tool_calls: msg?.tool_calls ?? [],
      },
      usage: completion.usage ?? null,
      model: completion.model,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[/api/chat] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
