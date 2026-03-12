import { apiRequest } from "@/lib/api/client";
import { emitDataUpdate, subscribeToDataUpdates } from "@/lib/api/events";
import { type MongoEntity } from "@/lib/api/types";
import { type ActivityLog, type Division, type Notification, type PolicyType } from "@/lib/mock-data";

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

type DocumentDto = MongoEntity<Omit<RepositoryDocument, "id">>;
type ActivityDto = MongoEntity<Omit<ActivityLog, "id">>;
type NotificationDto = MongoEntity<Omit<Notification, "id"> & { recipientEmail?: string }>;

let documentCache: RepositoryDocument[] = [];
let activityCache: ActivityLog[] = [];
let notificationCache: Notification[] = [];
let isHydratingData = false;
let isDataHydrated = false;

const toDocument = (input: DocumentDto): RepositoryDocument => ({
  id: input._id ?? input.id ?? "",
  policyId: input.policyId,
  name: input.name,
  policyNumber: input.policyNumber,
  policyTitle: input.policyTitle,
  type: input.type,
  size: input.size,
  version: input.version,
  uploadedBy: input.uploadedBy,
  uploadedDate: input.uploadedDate,
  division: input.division,
  category: input.category,
  status: input.status,
  owner: input.owner,
  lastEdited: input.lastEdited,
  fileDataUrl: input.fileDataUrl,
  fileMimeType: input.fileMimeType,
  remarks: input.remarks,
  accessEmails: input.accessEmails,
});

const toActivity = (input: ActivityDto): ActivityLog => ({
  id: input._id ?? input.id ?? "",
  user: input.user,
  action: input.action,
  policyTitle: input.policyTitle,
  timestamp: input.timestamp,
  type: input.type,
});

const toNotification = (input: NotificationDto): Notification => ({
  id: input._id ?? input.id ?? "",
  policyId: input.policyId,
  policyTitle: input.policyTitle,
  changeType: input.changeType,
  timestamp: input.timestamp,
  read: input.read,
});

const toDocumentPayload = (document: RepositoryDocument): Omit<RepositoryDocument, "id"> => {
  const { id: _id, ...payload } = document;
  return payload;
};

const toActivityPayload = (activity: ActivityLog): Omit<ActivityLog, "id"> => {
  const { id: _id, ...payload } = activity;
  return payload;
};

const toNotificationPayload = (notification: Notification): Omit<Notification, "id"> => {
  const { id: _id, ...payload } = notification;
  return payload;
};

async function hydrateAllData(): Promise<void> {
  if (isHydratingData) {
    return;
  }

  isHydratingData = true;
  try {
    const [documents, activities, notifications] = await Promise.all([
      apiRequest<DocumentDto[]>("/documents"),
      apiRequest<ActivityDto[]>("/activities"),
      apiRequest<NotificationDto[]>("/notifications"),
    ]);

    documentCache = documents.map(toDocument);
    activityCache = activities.map(toActivity);
    notificationCache = notifications.map(toNotification);
    isDataHydrated = true;
    emitDataUpdate();
  } catch {
    // Keep existing cache on fetch errors.
  } finally {
    isHydratingData = false;
  }
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

export function loadDocumentsFromStorage(): RepositoryDocument[] {
  if (!isDataHydrated && !isHydratingData) {
    void hydrateAllData();
  }

  return documentCache;
}

export function saveDocumentsToStorage(documents: RepositoryDocument[]): void {
  void (async () => {
    try {
      const current = isDataHydrated ? documentCache : (await apiRequest<DocumentDto[]>("/documents")).map(toDocument);
      const currentById = new Map(current.map((doc) => [doc.id, doc]));
      const nextById = new Map(documents.filter((doc) => doc.id).map((doc) => [doc.id, doc]));

      for (const doc of documents) {
        if (doc.id && currentById.has(doc.id)) {
          await apiRequest(`/documents/${doc.id}`, {
            method: "PUT",
            body: toDocumentPayload(doc),
          });
          continue;
        }

        await apiRequest("/documents", {
          method: "POST",
          body: toDocumentPayload(doc),
        });
      }

      for (const doc of current) {
        if (!nextById.has(doc.id)) {
          await apiRequest(`/documents/${doc.id}`, { method: "DELETE" });
        }
      }

      documentCache = (await apiRequest<DocumentDto[]>("/documents")).map(toDocument);
      isDataHydrated = true;
      emitDataUpdate();
    } catch {
      // Keep UI stable on sync failures.
    }
  })();
}

export function loadActivitiesFromStorage(): ActivityLog[] {
  if (!isDataHydrated && !isHydratingData) {
    void hydrateAllData();
  }

  return activityCache;
}

export function saveActivitiesToStorage(activities: ActivityLog[]): void {
  void (async () => {
    try {
      const current = isDataHydrated ? activityCache : (await apiRequest<ActivityDto[]>("/activities")).map(toActivity);
      const currentIds = new Set(current.map((activity) => activity.id));

      for (const activity of activities) {
        if (activity.id && currentIds.has(activity.id)) {
          continue;
        }

        await apiRequest("/activities", {
          method: "POST",
          body: toActivityPayload(activity),
        });
      }

      activityCache = (await apiRequest<ActivityDto[]>("/activities")).map(toActivity);
      isDataHydrated = true;
      emitDataUpdate();
    } catch {
      // Keep UI stable on sync failures.
    }
  })();
}

export function appendActivity(entry: Omit<ActivityLog, "id" | "timestamp"> & { timestamp?: string }): void {
  void (async () => {
    try {
      const timestamp = entry.timestamp ?? new Date().toISOString().replace("T", " ").slice(0, 16);
      await apiRequest("/activities", {
        method: "POST",
        body: {
          user: entry.user,
          action: entry.action,
          policyTitle: entry.policyTitle,
          type: entry.type,
          timestamp,
        },
      });

      activityCache = (await apiRequest<ActivityDto[]>("/activities")).map(toActivity);
      isDataHydrated = true;
      emitDataUpdate();
    } catch {
      // Ignore append failures to keep UX responsive.
    }
  })();
}

export function loadNotificationsFromStorage(): Notification[] {
  if (!isDataHydrated && !isHydratingData) {
    void hydrateAllData();
  }

  return notificationCache;
}

export function saveNotificationsToStorage(notifications: Notification[]): void {
  void (async () => {
    try {
      const current = isDataHydrated ? notificationCache : (await apiRequest<NotificationDto[]>("/notifications")).map(toNotification);
      const currentById = new Map(current.map((notification) => [notification.id, notification]));

      for (const notification of notifications) {
        const existing = notification.id ? currentById.get(notification.id) : undefined;

        if (!existing) {
          await apiRequest("/notifications", {
            method: "POST",
            body: toNotificationPayload(notification),
          });
          continue;
        }

        if (!existing.read && notification.read) {
          await apiRequest(`/notifications/${notification.id}/read`, {
            method: "PATCH",
            body: {},
          });
        }
      }

      notificationCache = (await apiRequest<NotificationDto[]>("/notifications")).map(toNotification);
      isDataHydrated = true;
      emitDataUpdate();
    } catch {
      // Keep UI stable on sync failures.
    }
  })();
}

export function appendPolicyNotifications(payload: {
  policyId: string;
  policyTitle: string;
  changeType: string;
  recipients: string[];
}): void {
  void (async () => {
    try {
      const timestamp = new Date().toISOString().replace("T", " ").slice(0, 16);

      await Promise.all(
        payload.recipients.map((recipient) => apiRequest("/notifications", {
          method: "POST",
          body: {
            policyId: payload.policyId,
            policyTitle: payload.policyTitle,
            changeType: `${payload.changeType} • To ${recipient}`,
            timestamp,
            read: false,
            recipientEmail: recipient,
          },
        }))
      );

      notificationCache = (await apiRequest<NotificationDto[]>("/notifications")).map(toNotification);
      isDataHydrated = true;
      emitDataUpdate();
    } catch {
      // Ignore append failures to keep UX responsive.
    }
  })();
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

export { subscribeToDataUpdates };