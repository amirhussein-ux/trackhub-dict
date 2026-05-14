export type UserRole =
  | "OIC Director"
  | "Division Chief"
  | "Division Member";

export type Division = "PRAD" | "PPDD" | "PPMED" | "PPMCAD";

export type SessionUser = {
  identifier: string;
  email: string;
  name: string;
  role: UserRole;
  division?: Division;
};

const SESSION_STORAGE_KEY = "trackhub.sessionUser";

const defaultUser: SessionUser = {
  identifier: "guest",
  email: "guest@dict.gov.ph",
  name: "Guest User",
  role: "Division Member",
  division: undefined,
};

let sessionUser: SessionUser | null = null;
let sessionExpiresAt: string | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function isSessionExpired(expiresAt: string | null): boolean {
  if (!expiresAt) {
    return false;
  }

  return Date.parse(expiresAt) <= Date.now();
}

function readStoredUser(): SessionUser | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<{ user: SessionUser; expiresAt: string }>;
    if (!parsed.user || !parsed.user.identifier || !parsed.user.email || !parsed.user.name || !parsed.user.role) {
      return null;
    }

    if (isSessionExpired(parsed.expiresAt ?? null)) {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    sessionExpiresAt = parsed.expiresAt ?? null;
    return {
      identifier: parsed.user.identifier,
      email: parsed.user.email,
      name: parsed.user.name,
      role: parsed.user.role,
      division: parsed.user.division,
    };
  } catch {
    return null;
  }
}

export function setCurrentUser(user: SessionUser, expiresAt?: string): void {
  sessionUser = user;
  sessionExpiresAt = expiresAt ?? sessionExpiresAt;

  if (!isBrowser()) {
    return;
  }

  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ user, expiresAt: sessionExpiresAt }));
}

export function getCurrentUser(): SessionUser {
  if (sessionUser) {
    if (isSessionExpired(sessionExpiresAt)) {
      clearCurrentUser();
      return defaultUser;
    }

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
  if (user.identifier === "guest") {
    return false;
  }

  return user.role === "OIC Director"
    || user.role === "Division Chief"
    || user.role === "Division Member";
}

export function clearCurrentUser(): void {
  sessionUser = null;
  sessionExpiresAt = null;

  if (!isBrowser()) {
    return;
  }

  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
}
