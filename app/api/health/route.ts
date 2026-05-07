import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const hasKey = !!process.env.MIMO_API_KEY;
  return NextResponse.json({
    ok: true,
    configured: hasKey,
    model: process.env.MIMO_MODEL ?? "mimo-reasoning-v2.5",
    baseUrl: process.env.MIMO_BASE_URL ?? "https://api.xiaomimimo.com/v1",
  });
}
