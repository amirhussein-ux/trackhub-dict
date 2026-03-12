export type UserRole = "Admin" | "Policy Owner" | "Policy Access" | "Viewer";

export type SessionUser = {
  identifier: string;
  email: string;
  name: string;
  role: UserRole;
};

const defaultUser: SessionUser = {
  identifier: "admin",
  email: "oicdirector@dict.gov.ph",
  name: "OIC Director Sanchez",
  role: "Policy Owner",
};

let sessionUser: SessionUser | null = null;

export function setCurrentUser(user: SessionUser): void {
  sessionUser = user;
}

export function getCurrentUser(): SessionUser {
  return sessionUser ?? defaultUser;
}

export function canManagePolicies(user: SessionUser): boolean {
  return user.role === "Admin" || user.role === "Policy Owner" || user.role === "Policy Access";
}

export function clearCurrentUser(): void {
  sessionUser = null;
}