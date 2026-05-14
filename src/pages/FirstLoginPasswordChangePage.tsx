import { FormEvent, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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

  const handleSendCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      toast({
        title: "Missing email",
        description: "Enter your DICT webmail.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 650));
    const result = await requestFirstLoginCode(email);
    setLoading(false);

    if (result.ok === false) {
      toast({ title: "Verification email failed", description: result.message, variant: "destructive" });
      return;
    }

    toast({
      title: "Verification code sent",
      description: result.message,
    });
    setStep("code"); 
  };

  const handleVerifyCode = async (event: FormEvent) => {
    event.preventDefault();

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 450));
    const result = await verifyFirstLoginCode(email,code);
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
    const result = await completeFirstLoginPasswordChange(email,code, newPassword);
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
        <h1 className="text-2xl font-bold text-white text-center">First Login Password Change</h1>
        <p className="text-sm text-white/70 text-center mt-2">
          {step === "email" && "Verify your DICT webmail before setting a permanent password."}
          {step === "code" && "Enter the email verification code to continue."}
          {step === "password" && "Create a secure password for future logins."}
        </p>

        {step === "email" && (
          <form onSubmit={handleSendCode} className="space-y-5 mt-6">
            <div className="space-y-2">
              <Label htmlFor="first-login-email" className="text-white">
                DICT Webmail
              </Label>
              <Input
                id="first-login-email"
                type="email"
                placeholder="new.user@dict.gov.ph"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 transition-all"
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
              <Label htmlFor="verification-code" className="text-white">
                Email Verification Code
              </Label>
              <Input
                id="verification-code"
                type="text"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="h-12 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 transition-all"
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
              <Label htmlFor="new-password" className="text-white">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Create your new password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="h-12 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4 text-white/70" /> : <Eye className="h-4 w-4 text-white" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-white">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="h-12 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4 text-white/70" /> : <Eye className="h-4 w-4 text-white" />}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-white space-y-1">
              <p className={passwordRules.minLength ? "text-white/50" : ""}>At least 10 characters</p>
              <p className={passwordRules.hasUpper ? "text-white/50" : ""}>Contains an uppercase letter</p>
              <p className={passwordRules.hasLower ? "text-white/50" : ""}>Contains a lowercase letter</p>
              <p className={passwordRules.hasNumber ? "text-white/50" : ""}>Contains a number</p>
              <p className={passwordRules.hasSpecial ? "text-white/50" : ""}>Contains a special character</p>
            </div>

            <Button type="submit" variant="hero" className="w-full h-11" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating password...</> : "Save New Password"}
            </Button>
          </form>
        )}

        <p className="text-sm text-center mt-6 text-white/70">
          Back to <Link to="/login" className="text-white/70 hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
      <div className="absolute bottom-5 w-full flex justify-between px-6 text-xs text-white/60">
        <span>DICT | NIPPSB</span>
        <span>© 2025 DICT | NIPPSB. All rights reserved. v1.0.0</span>
      </div>
    </div>
  );
}
