import { z } from "zod";
import { objectIdParamSchema } from "./common";

export const createItemBodySchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(2000),
  status: z.string().trim().min(1).max(100),
});

export const updateItemBodySchema = createItemBodySchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one field must be provided." }
);

export const itemParamsSchema = objectIdParamSchema;
