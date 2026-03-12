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
