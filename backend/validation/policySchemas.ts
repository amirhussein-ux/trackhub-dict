import { z } from "zod";
import { objectIdParamSchema, optionalString, optionalStringArray } from "./common";

const divisionSchema = z.enum(["PRAD", "PPDD", "PPMED", "PPMCAD"]);
const policyStatusSchema = z.enum(["Approved", "Under Review", "On Progress", "On Hold", "Published"]);
const policyTypeSchema = z.enum(["Republic Act", "Executive Order", "Issuance", "Administrative Order", "Memorandum Order"]);

export const createPolicyBodySchema = z.object({
  policyNumber: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(500),
  type: policyTypeSchema,
  division: divisionSchema,
  dateSigned: optionalString,
  effectivityClause: optionalString,
  effectivityDate: optionalString,
  publicationSource: optionalString,
  publicationDate: optionalString,
  status: policyStatusSchema.optional(),
  referenceLink: optionalString,
  remarks: optionalString,
  accessEmails: optionalStringArray,
  archived: z.boolean().optional(),
});

export const updatePolicyBodySchema = z
  .object({
    policyNumber: z.string().trim().min(1).max(100).optional(),
    title: z.string().trim().min(1).max(500).optional(),
    type: policyTypeSchema.optional(),
    division: divisionSchema.optional(),
    dateSigned: optionalString,
    effectivityClause: optionalString,
    effectivityDate: optionalString,
    publicationSource: optionalString,
    publicationDate: optionalString,
    referenceLink: optionalString,
    remarks: optionalString,
    archived: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided.",
  });

export const policyParamsSchema = objectIdParamSchema;

export const grantAccessBodySchema = z
  .object({
    collaboratorEmail: z.string().trim().email(),
  })
  .strict();

export const reviewReadyBodySchema = z.object({}).strict();

export const approvePolicyBodySchema = z
  .object({
    approverEmail: z.string().trim().email(),
  })
  .strict();

export const rejectPolicyBodySchema = z
  .object({
    approverEmail: z.string().trim().email(),
    rejectionReason: z.string().trim().min(1).max(1000),
  })
  .strict();

export const documentUploadedBodySchema = z
  .object({
    documentName: z.string().trim().min(1).max(255),
    uploaderDivision: divisionSchema.optional(),
    isFinal: z.boolean().optional(),
  })
  .strict();

export const publishPolicyBodySchema = z.object({}).strict();

export const archivePolicyBodySchema = z
  .object({
    reason: optionalString,
  })
  .strict();
