import { apiRequest } from "@/lib/api/client";

export type PolicyAdvocacyPayload = {
  dateSigned?: string;
  onarFiledDate?: string;
  officialGazetteDate?: string;
  newspaperDate?: string;
  newspaperName?: string;
  effectivityClause?: string;
  effectivityDate?: string;
  policyLink?: string;
};

export type PolicyAdvocacyRecord = PolicyAdvocacyPayload & {
  _id?: string;
  id?: string;
  policyId?: string;
  lastUpdatedBy?: string;
  updatedAt?: string;
  createdAt?: string;
};

export type PolicyAdvocacyListRecord = PolicyAdvocacyRecord & {
  policyId?: string | {
    _id?: string;
    id?: string;
    policyNumber?: string;
    title?: string;
    division?: string;
    workflowState?: string;
  };
};

export async function getAdvocacy(policyId: string): Promise<PolicyAdvocacyRecord> {
  try {
    return await apiRequest<PolicyAdvocacyRecord>(`/policies/${policyId}/advocacy`);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to load advocacy details.");
  }
}

export async function upsertAdvocacy(policyId: string, payload: PolicyAdvocacyPayload): Promise<PolicyAdvocacyRecord> {
  try {
    return await apiRequest<PolicyAdvocacyRecord>(`/policies/${policyId}/advocacy`, {
      method: "PUT",
      body: payload,
    });
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to save advocacy details.");
  }
}

export async function listAdvocacy(): Promise<PolicyAdvocacyListRecord[]> {
  try {
    return await apiRequest<PolicyAdvocacyListRecord[]>("/advocacy");
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to load advocacy records.");
  }
}
