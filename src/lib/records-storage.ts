import { type ActivityLog, type Division, type Notification, type PolicyType } from "@/lib/mock-data";

const DOCUMENT_STORAGE_KEY = "trackhub.documents";
const ACTIVITY_STORAGE_KEY = "trackhub.activities";
const NOTIFICATION_STORAGE_KEY = "trackhub.notifications";
const STORAGE_UPDATE_EVENT = "trackhub:data-updated";

export type RepositoryDocumentStatus = "Active" | "Archived";

export interface RepositoryDocument {
  id: string;
  policyId: string;
  name: string;
  policyNumber: string;
  policyTitle: string;
  type: "pdf" | "docx" | "xlsx" | "jpg" | "png";
  size: string;
  version: number;
  uploadedBy: string;
  uploadedDate: string;
  division: Division;
  category: PolicyType;
  status: RepositoryDocumentStatus;
  owner: string;
  lastEdited: string;
  fileDataUrl?: string;
  fileMimeType?: string;
  remarks?: string;
  accessEmails?: string[];
}

export function fileToDataUrl(file: File): Promise<{ dataUrl: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Unable to read file data."));
        return;
      }

      resolve({
        dataUrl: reader.result,
        mimeType: file.type || "application/octet-stream",
      });
    };

    reader.onerror = () => reject(new Error("File read failed."));
    reader.readAsDataURL(file);
  });
}

function emitStorageUpdate(): void {
  window.dispatchEvent(new CustomEvent(STORAGE_UPDATE_EVENT));
}

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as T;
    return parsed;
  } catch {
    return fallback;
  }
}

export function subscribeToDataUpdates(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(STORAGE_UPDATE_EVENT, handler);
  return () => window.removeEventListener(STORAGE_UPDATE_EVENT, handler);
}

export function loadDocumentsFromStorage(): RepositoryDocument[] {
  const parsed = safeRead<RepositoryDocument[]>(DOCUMENT_STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function saveDocumentsToStorage(documents: RepositoryDocument[]): void {
  try {
    window.localStorage.setItem(DOCUMENT_STORAGE_KEY, JSON.stringify(documents));
    emitStorageUpdate();
  } catch {
    // Ignore storage write errors.
  }
}

export function loadActivitiesFromStorage(): ActivityLog[] {
  const parsed = safeRead<ActivityLog[]>(ACTIVITY_STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function saveActivitiesToStorage(activities: ActivityLog[]): void {
  try {
    window.localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(activities));
    emitStorageUpdate();
  } catch {
    // Ignore storage write errors.
  }
}

export function appendActivity(entry: Omit<ActivityLog, "id" | "timestamp"> & { timestamp?: string }): void {
  const current = loadActivitiesFromStorage();
  const timestamp = entry.timestamp ?? new Date().toISOString().replace("T", " ").slice(0, 16);
  const next: ActivityLog = {
    id: `ACT-${Date.now()}`,
    user: entry.user,
    action: entry.action,
    policyTitle: entry.policyTitle,
    type: entry.type,
    timestamp,
  };

  saveActivitiesToStorage([next, ...current]);
}

export function loadNotificationsFromStorage(): Notification[] {
  const parsed = safeRead<Notification[]>(NOTIFICATION_STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function saveNotificationsToStorage(notifications: Notification[]): void {
  try {
    window.localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
    emitStorageUpdate();
  } catch {
    // Ignore storage write errors.
  }
}

export function appendPolicyNotifications(payload: {
  policyId: string;
  policyTitle: string;
  changeType: string;
  recipients: string[];
}): void {
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 16);
  const current = loadNotificationsFromStorage();
  const notifications = payload.recipients.map((recipient, index) => ({
    id: `N-${Date.now()}-${index}`,
    policyId: payload.policyId,
    policyTitle: payload.policyTitle,
    changeType: `${payload.changeType} • To ${recipient}`,
    timestamp,
    read: false,
  }));

  saveNotificationsToStorage([...notifications, ...current]);
}

export function formatBytesToReadableSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export const allowedDocumentExtensions = new Set(["pdf", "docx", "xlsx", "jpg", "png"]);

export function getDocumentTypeFromFilename(filename: string): RepositoryDocument["type"] | null {
  const extension = filename.split(".").pop()?.toLowerCase();
  if (!extension || !allowedDocumentExtensions.has(extension)) {
    return null;
  }

  return extension as RepositoryDocument["type"];
}