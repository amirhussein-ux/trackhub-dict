import { apiRequest } from "@/lib/api/client";
import { emitDataUpdate } from "@/lib/api/events";
import { type MongoEntity } from "@/lib/api/types";
import { type Policy } from "@/lib/mock-data.ts";

type PolicyDto = MongoEntity<Omit<Policy, "id">>;

let policyCache: Policy[] = [];
let isHydrated = false;
let isHydrating = false;

const toPolicy = (input: PolicyDto): Policy => {
  const policy: Policy = {
    id: input._id ?? input.id ?? "",
    policyNumber: input.policyNumber,
    title: input.title,
    type: input.type,
    division: input.division,
    dateSigned: input.dateSigned,
    effectivityClause: input.effectivityClause,
    effectivityDate: input.effectivityDate,
    publicationSource: input.publicationSource,
    publicationDate: input.publicationDate,
    status: input.status,
    referenceLink: input.referenceLink,
    remarks: input.remarks,
    createdBy: input.createdBy,
    createdDate: input.createdDate,
    lastUpdated: input.lastUpdated,
    uploadedBy: input.uploadedBy,
    lastEditedBy: input.lastEditedBy,
    accessEmails: input.accessEmails,
    workflowState: (input as Policy & { workflowState?: string }).workflowState,
    reviewReady: (input as Policy & { reviewReady?: boolean }).reviewReady,
    approvalChain: (input as Policy & { approvalChain?: Policy["approvalChain"] }).approvalChain,
    reviewers: (input as Policy & { reviewers?: string[] }).reviewers,
    lastActivityAt: (input as Policy & { lastActivityAt?: string }).lastActivityAt,
    deadline: (input as Policy & { deadline?: string }).deadline,
    escalated: (input as Policy & { escalated?: boolean }).escalated,
    publishedAt: (input as Policy & { publishedAt?: string }).publishedAt,
    archivedAt: (input as Policy & { archivedAt?: string }).archivedAt,
    timeline: (input as Policy & { timeline?: Policy["timeline"] }).timeline,
  };

  return {
    ...policy,
    archived: (input as Policy & { archived?: boolean }).archived,
  } as Policy;
};

const toPolicyPayload = (policy: Policy): Omit<Policy, "id"> & { archived?: boolean } => {
  const { id: _id, ...payload } = policy;
  return payload;
};

async function fetchPoliciesFromApi(): Promise<Policy[]> {
  const response = await apiRequest<PolicyDto[]>("/policies?includeArchived=true");
  return response.map(toPolicy);
}

export async function refreshPoliciesFromApi(): Promise<Policy[]> {
  const nextPolicies = await fetchPoliciesFromApi();
  policyCache = nextPolicies;
  isHydrated = true;
  emitDataUpdate();
  return nextPolicies;
}

async function hydratePolicies(): Promise<void> {
  if (isHydrating) {
    return;
  }

  isHydrating = true;
  try {
    policyCache = await fetchPoliciesFromApi();
    isHydrated = true;
    emitDataUpdate();
  } catch {
    // Keep last cache value on transient fetch failure.
  } finally {
    isHydrating = false;
  }
}

export function loadPoliciesFromStorage(): Policy[] {
  if (!isHydrated && !isHydrating) {
    void hydratePolicies();
  }

  return policyCache;
}

// Create a single policy via POST. Returns the saved Policy with the real server-assigned id.
export async function createPolicyInApi(
  payload: Omit<Policy, "id"> & { archived?: boolean }
): Promise<Policy> {
  const created = await apiRequest<PolicyDto>("/policies", { method: "POST", body: payload });
  const policy = toPolicy(created);
  policyCache = [policy, ...policyCache.filter((p) => p.id !== policy.id)];
  emitDataUpdate();
  return policy;
}

// Update a single existing policy via PUT. Optimistically updates cache.
export async function updatePolicyInApi(
  id: string,
  payload: Partial<Omit<Policy, "id"> & { archived?: boolean }>
): Promise<void> {
  await apiRequest<PolicyDto>(`/policies/${id}`, { method: "PUT", body: payload });
  policyCache = policyCache.map((p) => (p.id !== id ? p : { ...p, ...(payload as Partial<Policy>) }));
  emitDataUpdate();
}

export function savePoliciesToStorage(nextPolicies: Policy[]): void {
  void (async () => {
    try {
      const currentPolicies = isHydrated ? policyCache : await fetchPoliciesFromApi();
      const currentById = new Map(currentPolicies.map((policy) => [policy.id, policy]));
      const nextById = new Map(nextPolicies.filter((policy) => policy.id).map((policy) => [policy.id, policy]));

      for (const policy of nextPolicies) {
        if (policy.id && currentById.has(policy.id)) {
          await apiRequest(`/policies/${policy.id}`, {
            method: "PUT",
            body: toPolicyPayload(policy),
          });
          continue;
        }

        await apiRequest("/policies", {
          method: "POST",
          body: toPolicyPayload(policy),
        });
      }

      for (const policy of currentPolicies) {
        if (!nextById.has(policy.id)) {
          await apiRequest(`/policies/${policy.id}`, { method: "DELETE" });
        }
      }

      policyCache = await fetchPoliciesFromApi();
      isHydrated = true;
      emitDataUpdate();
    } catch {
      // Keep UI stable even if an API sync attempt fails.
    }
  })();
}
