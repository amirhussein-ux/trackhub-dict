import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  getPasswordRuleResult,
  requestPasswordReset,
  updatePasswordFromReset,
  verifyPasswordResetCode,
} from "@/lib/auth-workflows.ts";

type Step = "request" | "verify" | "reset";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordRules = useMemo(() => getPasswordRuleResult(newPassword), [newPassword]);

  const handleRequestReset = async (event: FormEvent) => {
    event.preventDefault();

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    const response = requestPasswordReset(email);
    setLoading(false);

    if (response.ok === false) {
      toast({ title: "Request failed", description: response.message, variant: "destructive" });
      return;
    }

    toast({
      title: "Reset instructions sent",
      description: `A verification code was sent to ${email}. Demo code: ${response.previewCode}`,
    });
    setStep("verify");
  };

  const handleVerifyCode = async (event: FormEvent) => {
    event.preventDefault();

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 450));
    const verification = verifyPasswordResetCode(email, code);
    setLoading(false);

    if (verification.ok === false) {
      toast({ title: "Verification failed", description: verification.message, variant: "destructive" });
      return;
    }

    toast({ title: "Code verified", description: "You can now set your new password." });
    setStep("reset");
  };

  const handleResetPassword = async (event: FormEvent) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({ title: "Password mismatch", description: "New password and confirmation must match.", variant: "destructive" });
      return;
    }

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 650));
    const resetResponse = updatePasswordFromReset(email, code, newPassword);
    setLoading(false);

    if (resetResponse.ok === false) {
      toast({ title: "Reset failed", description: resetResponse.message, variant: "destructive" });
      return;
    }

    toast({ title: "Password updated", description: "Your password has been reset successfully." });
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border/50 shadow-card p-8">
        <h1 className="text-2xl font-bold text-foreground text-center">Forgot Password</h1>
        <p className="text-sm text-muted-foreground text-center mt-2">
          {step === "request" && "Enter your DICT webmail to receive reset instructions."}
          {step === "verify" && "Input the reset code sent to your webmail email."}
          {step === "reset" && "Set a new strong password for your account."}
        </p>

        {step === "request" && (
          <form onSubmit={handleRequestReset} className="space-y-5 mt-6">
            <div className="space-y-2">
              <Label htmlFor="email">Webmail Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@dict.gov.ph"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11"
              />
            </div>
            <Button type="submit" variant="hero" className="w-full h-11" disabled={loading || !email.trim()}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending code...</> : "Send Reset Code"}
            </Button>
          </form>
        )}

        {step === "verify" && (
          <form onSubmit={handleVerifyCode} className="space-y-5 mt-6">
            <div className="space-y-2">
              <Label htmlFor="reset-code">Reset Code</Label>
              <Input
                id="reset-code"
                type="text"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="h-11"
              />
            </div>
            <Button type="submit" variant="hero" className="w-full h-11" disabled={loading || !code.trim()}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : "Verify Code"}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => setStep("request")}>
              Use another email
            </Button>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-5 mt-6">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter a strong password"
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
                  placeholder="Confirm your new password"
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
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating password...</> : "Reset Password"}
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
