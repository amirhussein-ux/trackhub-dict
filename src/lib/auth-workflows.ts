import { apiRequest } from "@/lib/api/client";

type UserRecord = {
  identifier: string;
  email: string;
  name: string;
  role: "OIC Director" | "Division Chief" | "Division Member";
  division?: "PRAD" | "PPDD" | "PPMED" | "PPMCAD";
};

export type AuthenticatedUser = UserRecord;

type PasswordRuleResult = {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
};

type ApiMessage = {
  message: string;
};

function asMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export function getPasswordRuleResult(password: string): PasswordRuleResult {
  return {
    minLength: password.length >= 10,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };
}

export function isPasswordStrong(password: string): boolean {
  const result = getPasswordRuleResult(password);
  return Object.values(result).every(Boolean);
}

export async function authenticateUser(identifier: string, password: string): Promise<
  | { ok: true; firstLogin: boolean; sessionExpiresAt: string; user: AuthenticatedUser }
  | { ok: false; message: string }
> {
  try {
    const response = await apiRequest<{ firstLogin: boolean; sessionExpiresAt: string; user: AuthenticatedUser }>("/auth/login", {
      method: "POST",
      body: { identifier, password },
    });

    return { ok: true, firstLogin: response.firstLogin, sessionExpiresAt: response.sessionExpiresAt, user: response.user };
  } catch (error) {
    return { ok: false, message: asMessage(error) };
  }
}

export async function requestPasswordReset(email: string): Promise<
  | { ok: true; expiresInMinutes: number; message: string }
  | { ok: false; message: string }
> {
  try {
    const response = await apiRequest<{ expiresInMinutes: number; message: string }>("/auth/forgot-password/request-code", {
      method: "POST",
      body: { email },
    });

    return { ok: true, expiresInMinutes: response.expiresInMinutes, message: response.message };
  } catch (error) {
    return { ok: false, message: asMessage(error) };
  }
}

export async function verifyPasswordResetCode(email: string, code: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await apiRequest<{ ok: true } | ApiMessage>("/auth/forgot-password/verify-code", {
      method: "POST",
      body: { email, code },
    });

    return { ok: true };
  } catch (error) {
    return { ok: false, message: asMessage(error) };
  }
}

export async function updatePasswordFromReset(email: string, code: string, newPassword: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await apiRequest<{ ok: true } | ApiMessage>("/auth/forgot-password/reset", {
      method: "POST",
      body: { email, code, newPassword },
    });

    return { ok: true };
  } catch (error) {
    return { ok: false, message: asMessage(error) };
  }
}

//FIRST LOGIN WORKFLOW
export async function requestFirstLoginCode(email: string): Promise<
  | { ok: true; expiresInMinutes: number; message: string }
  | { ok: false; message: string }
> {
  try {
    const response = await apiRequest<{ expiresInMinutes: number; message: string }>("/auth/first-login/request-code", {
      method: "POST",
      body: { email },
    });

    return { ok: true, expiresInMinutes: response.expiresInMinutes, message: response.message };
  } catch (error) {
    return { ok: false, message: asMessage(error) };
  }
}

export async function verifyFirstLoginCode(email: string,code: string): Promise<
{ ok: true } | 
{ ok: false; message: string }
> {
  try {
    await apiRequest<{ ok: true } | ApiMessage>("/auth/first-login/verify-code", {
      method: "POST",
      body: { email, code },
    });

    return { ok: true };
  } catch (error) {
    return { ok: false, message: asMessage(error) };
  }
}

export async function completeFirstLoginPasswordChange(email: string, code: string, newPassword: string): Promise<
  | { ok: true; email: string }
  | { ok: false; message: string }
> {
  try {
    const response = await apiRequest<{ ok: true; email: string }>("/auth/first-login/complete", {
      method: "POST",
      body: { email, code, newPassword },
    });

    return { ok: true, email: response.email };
  } catch (error) {
    return { ok: false, message: asMessage(error) };
  }
}

export async function logoutUser(): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await apiRequest<{ ok: true }>("/auth/logout", {
      method: "POST",
    });

    return { ok: true };
  } catch (error) {
    return { ok: false, message: asMessage(error) };
  }
}
