export type UserRole =
  | "OIC Director"
  | "Division Chief"
  | "Division Member"
  | "Admin"
  | "Policy Owner"
  | "Policy Access"
  | "Viewer";

export type SessionUser = {
  identifier: string;
  email: string;
  name: string;
  role: UserRole;
};

const SESSION_STORAGE_KEY = "trackhub.sessionUser";

const defaultUser: SessionUser = {
  identifier: "guest",
  email: "guest@dict.gov.ph",
  name: "Guest User",
  role: "Viewer",
};

let sessionUser: SessionUser | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStoredUser(): SessionUser | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<SessionUser>;
    if (!parsed.identifier || !parsed.email || !parsed.name || !parsed.role) {
      return null;
    }

    return {
      identifier: parsed.identifier,
      email: parsed.email,
      name: parsed.name,
      role: parsed.role,
    };
  } catch {
    return null;
  }
}

export function setCurrentUser(user: SessionUser): void {
  sessionUser = user;

  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
}

export function getCurrentUser(): SessionUser {
  if (sessionUser) {
    return sessionUser;
  }

  const stored = readStoredUser();
  if (stored) {
    sessionUser = stored;
    return stored;
  }

  return defaultUser;
}

export function canManagePolicies(user: SessionUser): boolean {
  return user.role === "OIC Director"
    || user.role === "Division Chief"
    || user.role === "Division Member"
    || user.role === "Admin"
    || user.role === "Policy Owner"
    || user.role === "Policy Access";
}

export function clearCurrentUser(): void {
  sessionUser = null;

  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}