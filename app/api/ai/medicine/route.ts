import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DISCLAIMER = "General information only. Not medical advice. Confirm with a pharmacist or clinician before taking or changing any medicine.";
const LOCAL_ANSWER = (name: string) => `${name}: general questions to ask a pharmacist or clinician\n\n• What is it used for, and is it right for my situation?\n• Does it interact with other medicines, supplements, alcohol, or food I use?\n• Are there conditions (pregnancy, kidney or liver problems, allergies) that make it unsuitable?\n• What side effects need urgent attention?\n• What should I do if I miss a dose?\n\nAlways read the official leaflet. Dose and duration must come from a qualified professional or the product label.`;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 80) : "";
  const question = typeof body?.question === "string" ? body.question.trim().slice(0, 500) : "";
  if (!name) return NextResponse.json({ error: "Enter a medicine name." }, { status: 400 });

  const key = process.env.LLM_API_KEY;
  if (!key) return NextResponse.json({ answer: LOCAL_ANSWER(name), source: "local", disclaimer: DISCLAIMER });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify({
        model: process.env.LLM_MODEL ?? "gpt-4o-mini",
        max_tokens: 350,
        messages: [
          { role: "system", content: "You give brief, plain-language general information about medicines: what they are commonly used for, common side effects, and general cautions. Never state doses, schedules, or durations. Never tell someone to start, stop, or change a medicine. Always advise checking with a pharmacist or clinician. If the question suggests an overdose, poisoning, or allergic reaction, tell them to contact emergency services immediately." },
          { role: "user", content: `Medicine: ${name}\nQuestion: ${question || "General overview and safety cautions."}` },
        ],
      }),
    });
    if (!response.ok) throw new Error("Model request failed");
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) throw new Error("Empty response");
    return NextResponse.json({ answer: text.trim(), source: "ai", disclaimer: DISCLAIMER });
  } catch {
    return NextResponse.json({ answer: LOCAL_ANSWER(name), source: "local", disclaimer: DISCLAIMER });
  }
}
