import { z } from "zod";

export const supportCategories = [
  "Technical Issue",
  "Policy Concern",
  "Account Problem",
  "Feature Request",
  "Other",
] as const;

const sanitizeInput = (value: string): string =>
  value
    .replace(/[<>]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .trim();

export const createSupportTicketBodySchema = z.object({
  fullName: z.string().min(1).max(120).transform(sanitizeInput),
  email: z.string().email().max(160).transform((value) => sanitizeInput(value).toLowerCase()),
  department: z.string().max(120).optional().transform((value) => sanitizeInput(value ?? "")),
  subject: z.string().min(3).max(160).transform(sanitizeInput),
  category: z.enum(supportCategories),
  message: z.string().min(10).max(5000).transform(sanitizeInput),
});

export type CreateSupportTicketBody = z.infer<typeof createSupportTicketBodySchema>;
