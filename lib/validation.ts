import { z } from "zod";

export const emailSchema = z.string().trim().email().max(254);
export const phoneSchema = z.string().trim().regex(/^\+?[0-9][0-9 ()-]{7,18}$/);
export const passwordSchema = z.string().min(8).max(72).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/);

export const patientRegistrationSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  dob: z.string().date(),
  gender: z.string().max(40),
  bloodGroup: z.string().max(10),
  allergies: z.array(z.string().max(80)).max(20),
  conditions: z.array(z.string().max(100)).max(30),
  emergencyContactName: z.string().trim().max(120),
  emergencyContactPhone: z.string().trim().max(24),
});

export const doctorRegistrationSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  specialization: z.string().min(1).max(80),
  qualification: z.string().trim().min(2).max(160),
  licenseNumber: z.string().trim().min(2).max(120),
  experience: z.number().int().min(0).max(50),
  hospitalId: z.number().int().positive(),
  fee: z.number().int().min(0).max(100000),
  languages: z.array(z.string().max(40)).max(12),
  bio: z.string().trim().max(1200),
});

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(72), role: z.enum(["patient", "doctor", "admin"]) });
