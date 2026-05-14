import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import dictLogo from "@/assets/Artboard 4.png";
import nippsLogo from "@/assets/NIPPSB(1).png";
import { motion } from "framer-motion";
import trackhubBg from "@/assets/trackhubbg.png";
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

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    show: (i = 0) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.08, duration: 0.6 },
    }),
  };

  const floatingParticles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 2,
  }));

  const handleRequestReset = async (event: FormEvent) => {
    event.preventDefault();

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    const response = await requestPasswordReset(email);
    setLoading(false);

    if (response.ok === false) {
      toast({ title: "Request failed", description: response.message, variant: "destructive" });
      return;
    }

    toast({
      title: "Reset instructions sent",
      description: response.message,
    });
    setStep("verify");
  };

  const handleVerifyCode = async (event: FormEvent) => {
    event.preventDefault();

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 450));
    const verification = await verifyPasswordResetCode(email, code);
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
    const resetResponse = await updatePasswordFromReset(email, code, newPassword);
    setLoading(false);

    if (resetResponse.ok === false) {
      toast({ title: "Reset failed", description: resetResponse.message, variant: "destructive" });
      return;
    }

    toast({ title: "Password updated", description: "Your password has been reset successfully." });
    navigate("/login");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-4 overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
        style={{ backgroundImage: `url(${trackhubBg})`}}
      />
      {floatingParticles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-2 h-2 bg-blue-400/30 rounded-full"
          style={{
          left: `${particle.x}%`,
          top: `${particle.y}%`,
          }}
          animate={{
          y: [0, -20, 0],
          opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
          duration: 3,
          repeat: Infinity,
          delay: particle.delay,
          ease: "easeInOut",
          }}
        />
      ))}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img src={dictLogo} alt="DICT Logo" className="h-14 w-auto" />
            <img src={nippsLogo} alt="NIPPSB Logo" className="h-14 w-14" />
          </div>
          <h1
            className="text-6xl font-extralight text-white tracking-[0.4em]"
            style={{ fontFamily: "Orbitron, monospace" }}
          >
            TRACKHUB
          </h1>
          <motion.div
            variants={fadeUp}
            className="flex items-center justify-center gap-6 my-6 w-full"
          >
            <div className="flex-1 h-px bg-white/30" />
              <p className="text-lg text-white/80 tracking-widest whitespace-nowrap">
                NIPPSB Policy Tracker
              </p>
              <div className="flex-1 h-px bg-white/30" />
          </motion.div>
        </div>

      <div className="
        relative
        backdrop-blur-xl
        bg-white/5
        border border-white/20
        shadow-[0_10px_40px_rgba(0,0,0,0.6)]
        rounded-2xl
        p-8
        w-full
      ">
        <h1 className="text-2xl font-bold text-white text-center">Forgot Password</h1>
        <p className="text-sm text-white/70 text-center mt-2">
          {step === "request" && "Enter your DICT webmail to receive reset instructions."}
          {step === "verify" && "Input the reset code sent to your webmail email."}
          {step === "reset" && "Set a new strong password for your account."}
        </p>

        {step === "request" && (
          <form onSubmit={handleRequestReset} className="space-y-5 mt-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">
                Webmail Email
              </Label>
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
              <Label htmlFor="reset-code" className="text-white">
                Reset Code
              </Label>
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
            <p className="text-center text-sm text-white/70">
              or {" "}
              <br />
              <button
                type="button"
                onClick={() => setStep("request")}
                className="text-white hover:underline text-sm"
              >
                Use another email
              </button>
            </p>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-5 mt-6">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-white">
                New Password</Label>
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
              <Label htmlFor="confirm-password" className="text-white">
                Confirm Password</Label>
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

            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-white/70 space-y-1">
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

        <p className="text-sm text-center mt-6 text-white/70">
          Back to <Link to="/login" className="text-white/70 text-primary hover:underline">Sign In</Link>
        </p>
      </div>
      <p className="text-xs text-white text-center mt-6">
          Access restricted to authorized DICT personnel only.
        </p>
    </div>
    <div className="absolute bottom-5 w-full flex justify-between px-6 text-xs text-white/60">
      <span>DICT | NIPPSB</span>
      <span>© 2025 DICT | NIPPSB. All rights reserved. v1.0.0</span>
    </div>
    </div>
  );
}
