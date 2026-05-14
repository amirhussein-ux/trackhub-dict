import bcrypt from "bcryptjs";

// Password complexity rules aligned with frontend auth workflows.
export const getPasswordRuleResult = (password: string): {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
} => ({
  minLength: password.length >= 10,
  hasUpper: /[A-Z]/.test(password),
  hasLower: /[a-z]/.test(password),
  hasNumber: /\d/.test(password),
  hasSpecial: /[^A-Za-z0-9]/.test(password),
});

export const isPasswordStrong = (password: string): boolean => {
  const result = getPasswordRuleResult(password);
  return Object.values(result).every(Boolean);
};

const BCRYPT_ROUNDS = 12;

export const hashPassword = async (password: string): Promise<string> => bcrypt.hash(password, BCRYPT_ROUNDS);

export const verifyPassword = async (password: string, passwordHash: string): Promise<boolean> =>
  bcrypt.compare(password, passwordHash);

export const isBcryptHash = (value: string): boolean => value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$");
