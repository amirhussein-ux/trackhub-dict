import { z } from "zod";

export const upsertAdvocacySchema = z.object({
  dateSigned: z.string().datetime().optional().or(z.literal("")),
  onarFiledDate: z.string().datetime().optional().or(z.literal("")),
  officialGazetteDate: z.string().datetime().optional().or(z.literal("")),
  newspaperDate: z.string().datetime().optional().or(z.literal("")),
  newspaperName: z.string().max(200).optional(),
  effectivityClause: z.string().max(1000).optional(),
  effectivityDate: z.string().datetime().optional().or(z.literal("")),
  policyLink: z.string().url().optional().or(z.literal("")),
});
