import { apiRequest } from "@/lib/api/client";

export const supportCategories = [
  "Technical Issue",
  "Policy Concern",
  "Account Problem",
  "Feature Request",
  "Other",
] as const;

export type SupportCategory = typeof supportCategories[number];

export type SupportFormPayload = {
  fullName: string;
  email: string;
  department?: string;
  subject: string;
  category: SupportCategory;
  message: string;
  attachment?: File | null;
};

export type SupportSubmissionResponse = {
  message: string;
  ticketId: string;
  status: string;
};

export async function submitSupportForm(payload: SupportFormPayload): Promise<SupportSubmissionResponse> {
  const formData = new FormData();
  formData.set("fullName", payload.fullName);
  formData.set("email", payload.email);
  formData.set("department", payload.department ?? "");
  formData.set("subject", payload.subject);
  formData.set("category", payload.category);
  formData.set("message", payload.message);

  if (payload.attachment) {
    formData.set("attachment", payload.attachment);
  }

  return apiRequest<SupportSubmissionResponse>("/support/contact", {
    method: "POST",
    body: formData,
  });
}
