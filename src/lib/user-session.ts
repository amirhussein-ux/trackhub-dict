export type UserRole = "Admin" | "Policy Owner" | "Policy Access" | "Viewer";

export type SessionUser = {
  identifier: string;
  email: string;
  name: string;
  role: UserRole;
};

const SESSION_USER_KEY = "trackhub.session-user";

const defaultUser: SessionUser = {
  identifier: "admin",
  email: "oicdirector@dict.gov.ph",
  name: "OIC Director Sanchez",
  role: "Policy Owner",
};

export function setCurrentUser(user: SessionUser): void {
  try {
    window.localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  } catch {
    // Ignore storage write errors.
  }
}

export function getCurrentUser(): SessionUser {
  try {
    const raw = window.localStorage.getItem(SESSION_USER_KEY);
    if (!raw) {
      return defaultUser;
    }

    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed || !parsed.email || !parsed.role) {
      return defaultUser;
    }

    return parsed;
  } catch {
    return defaultUser;
  }
}

export function canManagePolicies(user: SessionUser): boolean {
  return user.role === "Admin" || user.role === "Policy Owner" || user.role === "Policy Access";
}

export function clearCurrentUser(): void {
  try {
    window.localStorage.removeItem(SESSION_USER_KEY);
  } catch {
    // Ignore storage write errors.
  }
}