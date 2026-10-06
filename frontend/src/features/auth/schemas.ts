import { z } from "zod";

export const PHONE_REGEX = /^[6-9]\d{9}$/;

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(80, "Name must be at most 80 characters");

export const phoneSchema = z
  .string()
  .trim()
  .regex(PHONE_REGEX, "Enter a valid 10-digit Indian mobile number (starts with 6–9)");

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: nameSchema,
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  phone: phoneSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/\d/, "Password must contain at least one digit"),
  role: z.enum(["TENANT", "OWNER"]),
});
export type RegisterValues = z.infer<typeof registerSchema>;

export const profileSchema = z.object({ name: nameSchema, phone: phoneSchema });
export type ProfileValues = z.infer<typeof profileSchema>;
