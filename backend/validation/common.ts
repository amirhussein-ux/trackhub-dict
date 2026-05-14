import { z } from "zod";

export const objectIdParamSchema = z.object({
  id: z.string().trim().min(1),
});

export const optionalString = z.string().trim().optional();
export const optionalStringArray = z.array(z.string().trim().min(1)).optional();
