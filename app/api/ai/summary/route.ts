import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getSession();
  if (!user || user.role !== "doctor") return NextResponse.json({ error: "Clinician sign-in required." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const symptoms = typeof body?.symptoms === "string" ? body.symptoms.slice(0,2000) : "";
  const notes = typeof body?.notes === "string" ? body.notes.slice(0,2000) : "";
  if (!symptoms.trim() && !notes.trim()) return NextResponse.json({ error: "No patient-reported details were provided." }, { status: 400 });
  const text = `Patient-reported reason: ${symptoms.trim() || "Not provided"}\nAdditional patient notes: ${notes.trim() || "Not provided"}`;
  const key = process.env.LLM_API_KEY;
  if (!key) return NextResponse.json({ summary: text, disclaimer: "Draft summary only. Verify every detail with the patient. This is not a diagnosis." });
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},cache:"no-store",signal:AbortSignal.timeout(12000),
      body:JSON.stringify({model:process.env.LLM_MODEL??"gpt-4o-mini",max_tokens:250,messages:[
        {role:"system",content:"Summarize only stated facts for a clinician. Do not diagnose, infer missing details, or suggest treatment."},
        {role:"user",content:text},
      ]}),
    });
    if (!response.ok) throw new Error("Model request failed");
    const data=await response.json();
    return NextResponse.json({summary:String(data.choices?.[0]?.message?.content??text),disclaimer:"Draft summary only. Verify every detail with the patient. This is not a diagnosis."});
  } catch {
    return NextResponse.json({summary:text,disclaimer:"Draft summary only. Verify every detail with the patient. This is not a diagnosis."});
  }
}
