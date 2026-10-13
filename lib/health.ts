import { specialtyMap, type Specialty } from "@/lib/demo-data";

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

export function suggestSpecialty(text:string):Specialty{
  const normalized=text.toLowerCase();
  const matches=Object.entries(specialtyMap).filter(([term])=>normalized.includes(term)).sort((a,b)=>b[0].length-a[0].length);
  if(matches[0])return matches[0][1];
  return "General Physician";
}

export function diseaseMatches(text:string){
  const normalized=text.toLowerCase();
  return Object.entries(conditionRules).map(([condition,terms])=>({condition,terms:terms.filter((term)=>normalized.includes(term))})).filter((item)=>item.terms.length).sort((a,b)=>b.terms.length-a.terms.length);
}
