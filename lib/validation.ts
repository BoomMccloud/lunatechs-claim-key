import { z } from "zod";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const requestOtpSchema = z.object({
  email: z.string().email().transform(normalizeEmail),
  accessCode: z.string().min(1),
});

export const verifyOtpSchema = z.object({
  email: z.string().email().transform(normalizeEmail),
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});
