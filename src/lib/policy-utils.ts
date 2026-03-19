import { type Policy } from "@/lib/mock-data";

export function getDisplayedPolicyTitle(policy: Policy): string {
  const typeValue = (policy.type ?? "").trim();
  if (typeValue) {
    return `${typeValue} ${policy.title}`;
  }

  return policy.title;
}