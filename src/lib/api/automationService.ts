import { apiRequest } from "@/lib/api/client";
import { refreshPoliciesFromApi } from "@/lib/policy-storage";

export class PolicyAutomationService {
  static async markReviewReady(policyId: string): Promise<void> {
    try {
      await apiRequest(`/policies/${policyId}/actions/review-ready`, { method: "POST", body: {} });
      await refreshPoliciesFromApi();
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to mark policy as review ready"
      );
    }
  }

  static async grantApproval(policyId: string, approverEmail: string): Promise<void> {
    try {
      await apiRequest(`/policies/${policyId}/actions/approve`, {
        method: "POST",
        body: { approverEmail },
      });
      await refreshPoliciesFromApi();
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to grant approval"
      );
    }
  }

  static async rejectApproval(
    policyId: string,
    approverEmail: string,
    rejectionReason: string,
    type: "return" | "reject" = "return"
  ): Promise<void> {
    try {
      await apiRequest(`/policies/${policyId}/actions/reject`, {
        method: "POST",
        body: { approverEmail, rejectionReason, type },
      });
      await refreshPoliciesFromApi();
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to reject approval"
      );
    }
  }

  static async grantAccess(policyId: string, collaboratorEmail: string): Promise<void> {
    try {
      await apiRequest(`/policies/${policyId}/actions/grant-access`, {
        method: "POST",
        body: { collaboratorEmail },
      });
      await refreshPoliciesFromApi();
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to grant access"
      );
    }
  }

  static async uploadDocument(
    policyId: string,
    documentName: string,
    uploaderDivision?: string,
    isFinal?: boolean,
    options?: { suppressNotifications?: boolean }
  ): Promise<void> {
    try {
      await apiRequest(`/policies/${policyId}/actions/document-uploaded`, {
        method: "POST",
        body: {
          documentName,
          uploaderDivision,
          isFinal,
          suppressNotifications: options?.suppressNotifications ?? false,
        },
      });
      await refreshPoliciesFromApi();
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to record document upload"
      );
    }
  }

  static async publishPolicy(policyId: string): Promise<void> {
    try {
      await apiRequest(`/policies/${policyId}/actions/publish`, { method: "POST", body: {} });
      await refreshPoliciesFromApi();
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to publish policy"
      );
    }
  }

  static async archivePolicy(policyId: string): Promise<void> {
    try {
      await apiRequest(`/policies/${policyId}/actions/archive`, { method: "POST", body: {} });
      await refreshPoliciesFromApi();
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to archive policy"
      );
    }
  }

  static async updatePolicyDetails(
    policyId: string,
    updates: Record<string, any>
  ): Promise<void> {
    try {
      await apiRequest(`/policies/${policyId}`, {
        method: "PUT",
        body: updates,
      });
      await refreshPoliciesFromApi();
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to update policy"
      );
    }
  }
}
