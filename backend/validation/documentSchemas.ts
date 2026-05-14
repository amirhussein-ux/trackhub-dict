import { z } from "zod";
import { objectIdParamSchema, optionalString, optionalStringArray } from "./common";

const divisionSchema = z.enum(["PRAD", "PPDD", "PPMED", "PPMCAD"]);
const categorySchema = z.enum(["Republic Act", "Executive Order", "Issuance", "Administrative Order", "Memorandum Order"]);
const documentTypeSchema = z.enum(["pdf", "docx", "xlsx", "jpg", "png"]);
const documentStatusSchema = z.enum(["Active", "Archived"]);

export const createDocumentBodySchema = z.object({
  policyId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(255),
  policyNumber: z.string().trim().min(1).max(100),
  policyTitle: z.string().trim().min(1).max(500),
  type: documentTypeSchema,
  size: optionalString,
  version: z.number().int().positive().optional(),
  uploadedDate: z.string().trim().min(1),
  division: divisionSchema,
  category: categorySchema,
  status: documentStatusSchema.optional(),
  fileDataUrl: optionalString,
  fileMimeType: optionalString,
  remarks: optionalString,
  accessEmails: optionalStringArray,
});

export const updateDocumentBodySchema = createDocumentBodySchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one field must be provided." }
);

export const documentParamsSchema = objectIdParamSchema;
