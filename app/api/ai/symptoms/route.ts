import { NextResponse } from "next/server";
import { suggestSpecialty } from "@/lib/demo-data";

export const runtime = "nodejs";
const emergencyTerms = ["chest pain", "difficulty breathing", "can't breathe", "cannot breathe", "severe bleeding", "unconscious", "face drooping", "stroke", "suicidal", "seizure"];
const conditionRules: Record<string,string[]> = {
  "Allergic rhinitis": ["sneezing","runny nose","itchy eyes","congestion"],
  "Migraine-like headache": ["headache","migraine","light sensitivity","nausea"],
  "Viral respiratory illness": ["cough","fever","sore throat","fatigue"],
  "Asthma or airway irritation": ["wheezing","breathing","shortness of breath","chest tightness"],
  "Acid reflux or indigestion": ["heartburn","acid","indigestion","stomach"],
  "Skin irritation": ["rash","itch","redness","acne"],
  "Muscle or joint strain": ["back pain","joint","muscle","sprain"],
  "Anxiety-related symptoms": ["anxiety","panic","worry","racing thoughts"],
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const prompt = typeof body?.text === "string" ? body.text.trim().slice(0,2000) : "";
  if (!prompt) return NextResponse.json({ error: "Describe one or more symptoms." }, { status: 400 });
  const lower = prompt.toLowerCase();
  const emergency = emergencyTerms.some((term)=>lower.includes(term));
  const specialty = suggestSpecialty(prompt);
  const matches = Object.entries(conditionRules).map(([condition,terms])=>({condition,terms:terms.filter((term)=>lower.includes(term))})).filter((item)=>item.terms.length).sort((a,b)=>b.terms.length-a.terms.length).slice(0,3);
  let assistantText = `Care direction: consider speaking with a ${specialty}.\n\nPossible topics to discuss: ${matches.map((item)=>item.condition).join(", ") || "A general health concern"}.\n\nUrgency guide: ${emergency ? "high" : /severe|worsening|persistent|fever/i.test(prompt) ? "medium" : "low"}.`;
  const key = process.env.LLM_API_KEY;
  if (key) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method:"POST", headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"}, cache:"no-store", signal:AbortSignal.timeout(12000),
        body:JSON.stringify({model:process.env.LLM_MODEL??"gpt-4o-mini",max_tokens:350,messages:[
          {role:"system",content:"You are a cautious health information assistant. Never diagnose, prescribe, or recommend medication. Screen for emergency symptoms and recommend professional care. Keep uncertainty clear."},
          {role:"user",content:`Symptoms (fictional demo data): ${prompt}. Suggested specialty: ${specialty}. Emergency terms detected: ${emergency}. Provide short, safe next-step information.`},
        ]}),
      });
      if (response.ok) {
        const data=await response.json();
        const text=data.choices?.[0]?.message?.content;
        if (typeof text === "string" && text.trim()) assistantText=text.trim();
      }
    } catch { /* Keep the local rules response when the optional model is unavailable. */ }
  }
  return NextResponse.json({ specialty, urgency: emergency ? "high" : /severe|worsening|persistent|fever/i.test(prompt) ? "medium" : "low", emergency, matches, assistantText, disclaimer: "General information only. Not a diagnosis or substitute for professional care." });
}
