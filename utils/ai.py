import math
import os
import re
from typing import Any

import streamlit as st

SPECIALTY_MAP = {
    "acne": "Dermatologist", "rash": "Dermatologist", "itch": "Dermatologist", "skin": "Dermatologist",
    "dermatologist": "Dermatologist", "dermatology": "Dermatologist",
    "headache": "Neurologist", "migraine": "Neurologist", "seizure": "Neurologist", "numbness": "Neurologist",
    "neurologist": "Neurologist", "neurology": "Neurologist",
    "chest pain": "Cardiologist", "palpitations": "Cardiologist", "heart": "Cardiologist",
    "cardiologist": "Cardiologist", "cardiology": "Cardiologist",
    "joint": "Orthopedic", "back pain": "Orthopedic", "fracture": "Orthopedic", "bone": "Orthopedic",
    "orthopedic": "Orthopedic", "orthopedics": "Orthopedic",
    "child": "Pediatrician", "baby": "Pediatrician", "pediatrician": "Pediatrician", "pediatrics": "Pediatrician",
    "pregnancy": "Gynecologist", "menstrual": "Gynecologist", "gynecologist": "Gynecologist", "gynecology": "Gynecologist",
    "ear": "ENT", "throat": "ENT", "sinus": "ENT", "ent": "ENT",
    "vision": "Ophthalmologist", "eye": "Ophthalmologist", "ophthalmologist": "Ophthalmologist", "ophthalmology": "Ophthalmologist",
    "anxiety": "Psychiatrist", "mood": "Psychiatrist", "depression": "Psychiatrist", "psychiatrist": "Psychiatrist", "psychiatry": "Psychiatrist",
    "breathing": "Pulmonologist", "cough": "Pulmonologist", "asthma": "Pulmonologist", "pulmonologist": "Pulmonologist", "pulmonology": "Pulmonologist",
    "stomach": "Gastroenterologist", "abdominal": "Gastroenterologist", "nausea": "Gastroenterologist", "gastroenterologist": "Gastroenterologist", "gastroenterology": "Gastroenterologist",
    "general physician": "General Physician", "primary care": "General Physician",
}
EMERGENCY_TERMS = (
    "chest pain", "difficulty breathing", "can't breathe", "cannot breathe", "severe bleeding",
    "unconscious", "face drooping", "suicidal", "seizure", "stroke",
)
CONDITION_HINTS = {
    "Dermatologist": ["acne", "eczema", "contact dermatitis", "skin irritation"],
    "Neurologist": ["migraine", "tension headache", "nerve irritation"],
    "Cardiologist": ["heart rhythm concern", "circulation concern"],
    "Orthopedic": ["muscle strain", "joint irritation", "back strain"],
    "Pediatrician": ["common childhood illness", "child health concern"],
    "Gynecologist": ["menstrual health concern", "reproductive health concern"],
    "ENT": ["sinus irritation", "ear or throat concern"],
    "Ophthalmologist": ["eye strain", "eye irritation"],
    "Psychiatrist": ["anxiety symptoms", "mood concern"],
    "Pulmonologist": ["airway irritation", "respiratory concern"],
    "Gastroenterologist": ["indigestion", "digestive irritation"],
    "General Physician": ["common infection", "general health concern"],
}
CONDITION_RULES = {
    "Allergic rhinitis": ("sneezing", "runny nose", "itchy eyes", "congestion"),
    "Migraine-like headache": ("headache", "migraine", "light sensitivity", "nausea"),
    "Viral respiratory illness": ("cough", "fever", "sore throat", "fatigue"),
    "Asthma or airway irritation": ("wheezing", "breathing", "shortness of breath", "chest tightness"),
    "Acid reflux or indigestion": ("heartburn", "acid", "indigestion", "stomach"),
    "Skin irritation": ("rash", "itch", "redness", "acne"),
    "Muscle or joint strain": ("back pain", "joint", "muscle", "sprain"),
    "Anxiety-related symptoms": ("anxiety", "panic", "worry", "racing thoughts"),
}


def recommend_specialty(text: str) -> str:
    normalized = text.lower()
    matches = [(len(term), specialty) for term, specialty in SPECIALTY_MAP.items() if re.search(rf"\b{re.escape(term)}\b", normalized)]
    return max(matches)[1] if matches else "General Physician"


def emergency_detected(text: str) -> bool:
    normalized = text.lower()
    return any(term in normalized for term in EMERGENCY_TERMS)


def symptom_assessment(text: str) -> dict[str, Any]:
    specialty = recommend_specialty(text)
    emergency = emergency_detected(text)
    conditions = CONDITION_HINTS.get(specialty, CONDITION_HINTS["General Physician"])
    urgency = "high" if emergency else "medium" if any(word in text.lower() for word in ("worsening", "severe", "persistent", "fever")) else "low"
    return {
        "specialty": specialty,
        "urgency": urgency,
        "conditions": conditions,
        "emergency": emergency,
        "message": "Possible explanations are broad and cannot be confirmed here. A clinician must assess symptoms.",
    }


def disease_matches(text: str) -> list[dict[str, Any]]:
    normalized = text.lower()
    matches = []
    for condition, terms in CONDITION_RULES.items():
        matched_terms = [term for term in terms if term in normalized]
        if matched_terms:
            matches.append({"condition": condition, "matched_terms": matched_terms, "match_count": len(matched_terms)})
    return sorted(matches, key=lambda item: (-item["match_count"], item["condition"]))


def llm_response(prompt: str) -> str | None:
    try:
        api_key = st.secrets.get("LLM_API_KEY")
    except Exception:
        api_key = None
    api_key = api_key or os.getenv("LLM_API_KEY")
    if not api_key:
        return None
    try:
        from openai import OpenAI
        response = OpenAI(api_key=api_key).chat.completions.create(
            model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": "You are a cautious health information assistant, not a diagnostic service. Never diagnose, prescribe, or give dosing. Screen for emergency symptoms. Recommend professional care. Clearly state uncertainty."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=500,
        )
        return response.choices[0].message.content
    except Exception:
        return None


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_km = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    value = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    return radius_km * 2 * math.atan2(math.sqrt(value), math.sqrt(1 - value))
