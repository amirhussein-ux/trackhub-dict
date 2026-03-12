import { type Policy } from "@/lib/mock-data";

const POLICY_STORAGE_KEY = "trackhub.policies";

export function loadPoliciesFromStorage(): Policy[] {
  try {
    const raw = window.localStorage.getItem(POLICY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as Policy[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePoliciesToStorage(policies: Policy[]): void {
  try {
    window.localStorage.setItem(POLICY_STORAGE_KEY, JSON.stringify(policies));
    window.dispatchEvent(new CustomEvent("trackhub:data-updated"));
  } catch {
    // Ignore storage failures (private mode, quota, etc.) and keep in-memory behavior.
  }
}
