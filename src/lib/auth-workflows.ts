type UserRecord = {
  identifier: string;
  email: string;
  name: string;
  role: "Admin" | "Policy Owner" | "Policy Access" | "Viewer";
  password: string;
  firstLogin: boolean;
};

export type AuthenticatedUser = Pick<UserRecord, "identifier" | "email" | "name" | "role">;

type CodeRecord = {
  code: string;
  expiresAt: number;
  used: boolean;
};

type PasswordRuleResult = {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
};

const users: UserRecord[] = [
  {
    identifier: "admin",
    email: "admin@dict.gov.ph",
    name: "OIC Director Sanchez",
    role: "Admin",
    password: "Admin@1234",
    firstLogin: false,
  },
  {
    identifier: "jane.dela.cruz",
    email: "jane.dela.cruz@dict.gov.ph",
    name: "Jane Dela Cruz",
    role: "Policy Owner",
    password: "Secure@2025",
    firstLogin: false,
  },
  {
    identifier: "new.user",
    email: "new.user@dict.gov.ph",
    name: "New User",
    role: "Policy Access",
    password: "Temp@1234",
    firstLogin: true,
  },
];

const resetCodes = new Map<string, CodeRecord>();
const firstLoginCodes = new Map<string, CodeRecord>();

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function getUserByIdentifier(identifier: string): UserRecord | undefined {
  const normalized = normalize(identifier);
  return users.find((user) => normalize(user.identifier) === normalized || normalize(user.email) === normalized);
}

function generateNumericCode(length = 6): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");
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

export function authenticateUser(identifier: string, password: string):
  | { ok: true; firstLogin: boolean; user: AuthenticatedUser }
  | { ok: false; message: string } {
  const user = getUserByIdentifier(identifier);
  if (!user || user.password !== password) {
    return { ok: false, message: "Invalid username/email or password." };
  }

  const { identifier: userIdentifier, email, name, role } = user;
  return { ok: true, firstLogin: user.firstLogin, user: { identifier: userIdentifier, email, name, role } };
}

export function requestPasswordReset(email: string):
  | { ok: true; expiresInMinutes: number; previewCode: string }
  | { ok: false; message: string } {
  const user = users.find((candidate) => normalize(candidate.email) === normalize(email));
  if (!user) {
    return { ok: false, message: "No account found for that webmail email." };
  }

  const code = generateNumericCode();
  const expiresInMinutes = 20;

  resetCodes.set(normalize(user.email), {
    code,
    used: false,
    expiresAt: Date.now() + expiresInMinutes * 60 * 1000,
  });

  return { ok: true, expiresInMinutes, previewCode: code };
}

export function verifyPasswordResetCode(email: string, code: string): { ok: true } | { ok: false; message: string } {
  const record = resetCodes.get(normalize(email));
  if (!record) {
    return { ok: false, message: "No reset request found. Please request a new code." };
  }

  if (record.used || record.expiresAt < Date.now()) {
    resetCodes.delete(normalize(email));
    return { ok: false, message: "Reset code is invalid or expired." };
  }

  if (record.code !== code.trim()) {
    return { ok: false, message: "Incorrect reset code." };
  }

  return { ok: true };
}

export function updatePasswordFromReset(email: string, code: string, newPassword: string): { ok: true } | { ok: false; message: string } {
  if (!isPasswordStrong(newPassword)) {
    return { ok: false, message: "New password does not meet security requirements." };
  }

  const verification = verifyPasswordResetCode(email, code);
  if ("message" in verification) {
    return { ok: false, message: verification.message };
  }

  const user = users.find((candidate) => normalize(candidate.email) === normalize(email));
  if (!user) {
    return { ok: false, message: "Account no longer exists." };
  }

  user.password = newPassword;
  user.firstLogin = false;

  const record = resetCodes.get(normalize(email));
  if (record) {
    record.used = true;
  }
  resetCodes.delete(normalize(email));

  return { ok: true };
}

export function requestFirstLoginCode(identifier: string, email: string):
  | { ok: true; expiresInMinutes: number; previewCode: string }
  | { ok: false; message: string } {
  const user = getUserByIdentifier(identifier);
  if (!user || !user.firstLogin) {
    return { ok: false, message: "First-login session is no longer valid. Please sign in again." };
  }

  if (normalize(user.email) !== normalize(email)) {
    return { ok: false, message: "Entered email does not match the account record." };
  }

  const code = generateNumericCode();
  const expiresInMinutes = 15;
  firstLoginCodes.set(normalize(user.identifier), {
    code,
    used: false,
    expiresAt: Date.now() + expiresInMinutes * 60 * 1000,
  });

  return { ok: true, expiresInMinutes, previewCode: code };
}

export function verifyFirstLoginCode(identifier: string, code: string): { ok: true } | { ok: false; message: string } {
  const user = getUserByIdentifier(identifier);
  if (!user || !user.firstLogin) {
    return { ok: false, message: "First-login session is no longer valid. Please sign in again." };
  }

  const record = firstLoginCodes.get(normalize(user.identifier));
  if (!record) {
    return { ok: false, message: "No verification code found. Please request a new one." };
  }

  if (record.used || record.expiresAt < Date.now()) {
    firstLoginCodes.delete(normalize(user.identifier));
    return { ok: false, message: "Verification code is invalid or expired." };
  }

  if (record.code !== code.trim()) {
    return { ok: false, message: "Incorrect verification code." };
  }

  return { ok: true };
}

export function completeFirstLoginPasswordChange(identifier: string, code: string, newPassword: string):
  | { ok: true; email: string }
  | { ok: false; message: string } {
  if (!isPasswordStrong(newPassword)) {
    return { ok: false, message: "New password does not meet security requirements." };
  }

  const verification = verifyFirstLoginCode(identifier, code);
  if ("message" in verification) {
    return { ok: false, message: verification.message };
  }

  const user = getUserByIdentifier(identifier);
  if (!user) {
    return { ok: false, message: "Account not found." };
  }

  user.password = newPassword;
  user.firstLogin = false;

  const record = firstLoginCodes.get(normalize(user.identifier));
  if (record) {
    record.used = true;
  }
  firstLoginCodes.delete(normalize(user.identifier));

  return { ok: true, email: user.email };
}
