import { FormEvent, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  completeFirstLoginPasswordChange,
  getPasswordRuleResult,
  requestFirstLoginCode,
  verifyFirstLoginCode,
} from "@/lib/auth-workflows.ts";

type Step = "email" | "code" | "password";

type LocationState = {
  identifier?: string;
};

export default function FirstLoginPasswordChangePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const initialIdentifier = (location.state as LocationState | null)?.identifier ?? "";

  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);

  const passwordRules = useMemo(() => getPasswordRuleResult(newPassword), [newPassword]);

  const handleSendCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!identifier.trim() || !email.trim()) {
      toast({ title: "Missing fields", description: "Enter both account identifier and webmail email.", variant: "destructive" });
      return;
    }

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 650));
    const result = await requestFirstLoginCode(identifier, email);
    setLoading(false);

    if (result.ok === false) {
      toast({ title: "Verification email failed", description: result.message, variant: "destructive" });
      return;
    }

    toast({
      title: "Verification code sent",
      description: `Check ${email}. Demo code: ${result.previewCode}`,
    });
    setStep("code");
  };

  const handleVerifyCode = async (event: FormEvent) => {
    event.preventDefault();

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 450));
    const result = await verifyFirstLoginCode(identifier, code);
    setLoading(false);

    if (result.ok === false) {
      toast({ title: "Invalid code", description: `${result.message} Returning to login.`, variant: "destructive" });
      navigate("/login");
      return;
    }

    toast({ title: "Code validated", description: "Set your new password to finish first-time setup." });
    setStep("password");
  };

  const handleChangePassword = async (event: FormEvent) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({ title: "Password mismatch", description: "New password and confirmation must match.", variant: "destructive" });
      return;
    }

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    const result = await completeFirstLoginPasswordChange(identifier, code, newPassword);
    setLoading(false);

    if (result.ok === false) {
      toast({ title: "Password change failed", description: result.message, variant: "destructive" });
      navigate("/login");
      return;
    }

    toast({
      title: "First login complete",
      description: "Password updated successfully. You can now access the dashboard.",
    });
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border/50 shadow-card p-8">
        <h1 className="text-2xl font-bold text-foreground text-center">First Login Password Change</h1>
        <p className="text-sm text-muted-foreground text-center mt-2">
          {step === "email" && "Verify your DICT webmail before setting a permanent password."}
          {step === "code" && "Enter the email verification code to continue."}
          {step === "password" && "Create a secure password for future logins."}
        </p>

        {step === "email" && (
          <form onSubmit={handleSendCode} className="space-y-5 mt-6">
            <div className="space-y-2">
              <Label htmlFor="identifier">Username or Email</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="new.user or new.user@dict.gov.ph"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="first-login-email">Webmail Email</Label>
              <Input
                id="first-login-email"
                type="email"
                placeholder="new.user@dict.gov.ph"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11"
              />
            </div>
            <Button type="submit" variant="hero" className="w-full h-11" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending code...</> : "Send Verification Code"}
            </Button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={handleVerifyCode} className="space-y-5 mt-6">
            <div className="space-y-2">
              <Label htmlFor="verification-code">Email Verification Code</Label>
              <Input
                id="verification-code"
                type="text"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="h-11"
              />
            </div>
            <Button type="submit" variant="hero" className="w-full h-11" disabled={loading || !code.trim()}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Validating...</> : "Validate Code"}
            </Button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={handleChangePassword} className="space-y-5 mt-6">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Create your new password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
              <p className={passwordRules.minLength ? "text-foreground" : ""}>At least 10 characters</p>
              <p className={passwordRules.hasUpper ? "text-foreground" : ""}>Contains an uppercase letter</p>
              <p className={passwordRules.hasLower ? "text-foreground" : ""}>Contains a lowercase letter</p>
              <p className={passwordRules.hasNumber ? "text-foreground" : ""}>Contains a number</p>
              <p className={passwordRules.hasSpecial ? "text-foreground" : ""}>Contains a special character</p>
            </div>

            <Button type="submit" variant="hero" className="w-full h-11" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating password...</> : "Save New Password"}
            </Button>
          </form>
        )}

        <p className="text-sm text-center mt-6 text-muted-foreground">
          Back to <Link to="/login" className="text-primary hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
