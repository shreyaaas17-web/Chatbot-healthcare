export const specialties = [
  "Dermatologist", "Neurologist", "Cardiologist", "Orthopedic", "Pediatrician", "Gynecologist",
  "ENT", "Ophthalmologist", "Psychiatrist", "Pulmonologist", "Gastroenterologist", "General Physician",
] as const;

export type Specialty = (typeof specialties)[number];

export type Hospital = {
  id?: number;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  phone: string;
  rating: number;
  emergency: boolean;
  specialties: string[];
  isSample?: boolean;
};

export type Doctor = {
  id?: number;
  userId?: number | null;
  name: string;
  email?: string;
  phone?: string;
  specialization: string;
  qualification: string;
  experience: number;
  hospitalId: number;
  hospitalName?: string;
  hospitalCity?: string;
  hospitalLat?: number;
  hospitalLng?: number;
  fee: number;
  languages: string[];
  bio: string;
  rating: number;
  availability: Record<string, string[]>;
  photo?: string | null;
  isSample?: boolean;
};

export const sampleHospitals: Hospital[] = [
  { name: "Harborlight Medical Centre", address: "Harbour Road · illustrative location", city: "Mumbai", lat: 19.0760, lng: 72.8777, phone: "+91 00000 00000", rating: 4.7, emergency: true, specialties: ["Cardiologist", "Pulmonologist", "General Physician", "Orthopedic"] },
  { name: "Riverbend Specialist Hospital", address: "University Road · illustrative location", city: "Pune", lat: 18.5204, lng: 73.8567, phone: "+91 00000 00000", rating: 4.6, emergency: true, specialties: ["Neurologist", "Dermatologist", "Cardiologist", "General Physician"] },
  { name: "Bluebell Community Hospital", address: "Station Road · illustrative location", city: "Kolhapur", lat: 16.7050, lng: 74.2433, phone: "+91 00000 00000", rating: 4.8, emergency: true, specialties: ["Pediatrician", "Gynecologist", "General Physician", "Orthopedic"] },
  { name: "Maple Grove Health Centre", address: "Connaught Place · illustrative location", city: "Delhi", lat: 28.6139, lng: 77.2090, phone: "+91 00000 00000", rating: 4.5, emergency: true, specialties: ["Cardiologist", "Neurologist", "Psychiatrist", "Ophthalmologist"] },
  { name: "Everwell City Hospital", address: "Indiranagar · illustrative location", city: "Bengaluru", lat: 12.9716, lng: 77.5946, phone: "+91 00000 00000", rating: 4.7, emergency: true, specialties: ["Dermatologist", "Orthopedic", "ENT", "General Physician"] },
  { name: "Northgate Family Hospital", address: "Anna Salai · illustrative location", city: "Chennai", lat: 13.0827, lng: 80.2707, phone: "+91 00000 00000", rating: 4.4, emergency: false, specialties: ["Pediatrician", "Gynecologist", "Ophthalmologist", "General Physician"] },
  { name: "Cedarline Medical Pavilion", address: "Banjara Hills · illustrative location", city: "Hyderabad", lat: 17.3850, lng: 78.4867, phone: "+91 00000 00000", rating: 4.6, emergency: true, specialties: ["Gastroenterologist", "Cardiologist", "Pulmonologist", "Dermatologist"] },
  { name: "Lakeshore Care Hospital", address: "Dharampeth · illustrative location", city: "Nagpur", lat: 21.1458, lng: 79.0882, phone: "+91 00000 00000", rating: 4.3, emergency: true, specialties: ["Neurologist", "Orthopedic", "Psychiatrist", "General Physician"] },
  { name: "Crescent Multispecialty Centre", address: "Navrangpura · illustrative location", city: "Ahmedabad", lat: 23.0225, lng: 72.5714, phone: "+91 00000 00000", rating: 4.5, emergency: true, specialties: ["Cardiologist", "Gynecologist", "ENT", "Gastroenterologist"] },
  { name: "Sunfield Wellness Hospital", address: "Malviya Nagar · illustrative location", city: "Jaipur", lat: 26.9124, lng: 75.7873, phone: "+91 00000 00000", rating: 4.2, emergency: false, specialties: ["Dermatologist", "Pediatrician", "Ophthalmologist", "General Physician"] },
  { name: "Meadowpark Medical Centre", address: "Kakkanad · illustrative location", city: "Kochi", lat: 9.9312, lng: 76.2673, phone: "+91 00000 00000", rating: 4.6, emergency: true, specialties: ["Pulmonologist", "Neurologist", "Psychiatrist", "Orthopedic"] },
  { name: "Summitview General Hospital", address: "Gomti Nagar · illustrative location", city: "Lucknow", lat: 26.8467, lng: 80.9462, phone: "+91 00000 00000", rating: 4.1, emergency: false, specialties: ["Gastroenterologist", "ENT", "Gynecologist", "General Physician"] },
].map((hospital, index) => ({ ...hospital, id: index + 1, isSample: true }));

const firstNames = ["Aarav", "Anaya", "Rehan", "Leela", "Ishaan", "Mira", "Kabir", "Tara", "Dev", "Sana", "Arjun", "Nisha"];
const lastNames = ["Kulkarni", "Mehta", "Nair", "Shah", "Rao", "Patel", "Desai", "Joshi", "Kapoor", "Menon", "Iyer", "Khan"];
const qualifications = ["MBBS, MD", "MBBS, MS", "MBBS, DNB", "MBBS, DM"];

export const sampleDoctors: Doctor[] = sampleHospitals.flatMap((hospital, hospitalIndex) =>
  hospital.specialties.map((specialty, doctorIndex) => {
    const sequence = hospitalIndex * 4 + doctorIndex;
    return {
      id: sequence + 1,
      name: `Dr. ${firstNames[sequence % firstNames.length]} ${lastNames[(sequence + hospitalIndex) % lastNames.length]}`,
      specialization: specialty,
      qualification: qualifications[sequence % qualifications.length],
      experience: 4 + (sequence * 3) % 16,
      hospitalId: hospital.id!,
      hospitalName: hospital.name,
      hospitalCity: hospital.city,
      hospitalLat: hospital.lat,
      hospitalLng: hospital.lng,
      fee: 400 + (sequence % 8) * 100,
      languages: ["English", ["Hindi", "Marathi", "Gujarati", "Kannada", "Tamil", "Telugu", "Malayalam"][hospitalIndex % 7]],
      bio: `Sample ${specialty.toLowerCase()} clinician profile for demonstration purposes.`,
      rating: Number((4.1 + (sequence % 9) * 0.1).toFixed(1)),
      availability: {},
      isSample: true,
    };
  }),
);

export const specialtyMap: Record<string, Specialty> = {
  acne: "Dermatologist", rash: "Dermatologist", itch: "Dermatologist", skin: "Dermatologist", eczema: "Dermatologist",
  headache: "Neurologist", migraine: "Neurologist", seizure: "Neurologist", numbness: "Neurologist",
  "chest pain": "Cardiologist", palpitations: "Cardiologist", heart: "Cardiologist",
  joint: "Orthopedic", "back pain": "Orthopedic", fracture: "Orthopedic", bone: "Orthopedic",
  child: "Pediatrician", baby: "Pediatrician", pregnancy: "Gynecologist", menstrual: "Gynecologist",
  ear: "ENT", throat: "ENT", sinus: "ENT", vision: "Ophthalmologist", eye: "Ophthalmologist",
  anxiety: "Psychiatrist", mood: "Psychiatrist", depression: "Psychiatrist",
  breathing: "Pulmonologist", cough: "Pulmonologist", asthma: "Pulmonologist",
  stomach: "Gastroenterologist", abdominal: "Gastroenterologist", nausea: "Gastroenterologist",
};

export function suggestSpecialty(text: string): Specialty {
  const normalized = text.toLowerCase();
  const matches = Object.entries(specialtyMap).filter(([term]) => normalized.includes(term)).sort((a, b) => b[0].length - a[0].length);
  if (matches[0]) return matches[0][1];
  const direct = specialties.find((specialty) => normalized.includes(specialty.toLowerCase()));
  return direct ?? "General Physician";
}
