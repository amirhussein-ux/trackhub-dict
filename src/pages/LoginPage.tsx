import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authenticateUser } from "@/lib/auth-workflows.ts";
import { setCurrentUser } from "@/lib/user-session";
import dictLogo from "@/assets/Artboard 4.png";
import nippsLogo from "@/assets/NIPPSB(1).png";
import trackhubBg from "@/assets/trackhubbg.png";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedAuthError = window.sessionStorage.getItem("authError");
      if (storedAuthError) {
        setAuthError(storedAuthError);
        window.sessionStorage.removeItem("authError");
      }
    } catch {
      // Ignore session storage read issues.
    }
  }, []);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast({ title: "Error", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }

    const authResult = await authenticateUser(identifier, password);
    if (authResult.ok === false) {
      toast({ title: "Authentication failed", description: authResult.message, variant: "destructive" });
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);

    if (authResult.firstLogin) {
      toast({
        title: "First login detected",
        description: "Please verify your webmail and set a new password before continuing.",
      });
      navigate("/first-login-password-change", {
        state: { identifier: authResult.user.identifier },
      });
      return;
    }

    setCurrentUser({
      identifier: authResult.user.identifier,
      email: authResult.user.email,
      name: authResult.user.name,
      role: authResult.user.role,
      division: authResult.user.division,
    }, authResult.sessionExpiresAt);

    toast({ title: "Welcome back!", description: "You have been logged in successfully." });
    navigate("/dashboard");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-4">
      <motion.div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
        style={{ backgroundImage: `url(${trackhubBg})` }}
      />

      {floatingParticles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute h-2 w-2 rounded-full bg-blue-400/30"
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

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-4">
            <img src={dictLogo} alt="DICT Logo" className="h-14 w-auto" />
            <img src={nippsLogo} alt="NIPPSB Logo" className="h-14 w-14" />
          </div>
          <h1
            className="text-6xl font-extralight tracking-[0.4em] text-white"
            style={{ fontFamily: "Orbitron, monospace" }}
          >
            TRACKHUB
          </h1>
          <motion.div variants={fadeUp} className="my-6 flex w-full items-center justify-center gap-6">
            <div className="h-px flex-1 bg-white/30" />
            <p className="whitespace-nowrap text-lg tracking-widest text-white/80">
              NIPPSB Policy Tracker
            </p>
            <div className="h-px flex-1 bg-white/30" />
          </motion.div>
        </div>

        <div
          className="
            relative w-full rounded-2xl border border-white/20 bg-white/5 p-8
            shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl
            before:pointer-events-none before:absolute before:inset-0
            before:rounded-2xl before:bg-gradient-to-br
            before:from-white/20 before:to-transparent before:opacity-30
          "
        >
          <form onSubmit={handleLogin} className="space-y-6">
            {authError ? (
              <Alert variant="destructive" className="border-destructive/60 bg-destructive/10 text-white [&>svg]:text-white">
                <AlertTitle>Access blocked</AlertTitle>
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-1 text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Sign in to your account
              </h2>
            </div>

            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-sm text-white">
                DICT Webmail
              </Label>
              <Input
                id="identifier"
                type="text"
                placeholder="user@dict.gov.ph"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="h-12 rounded-lg border border-white/20 bg-white/10 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-white">
                Password
              </Label>

              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-lg border border-white/20 bg-white/10 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 transition-all"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white transition hover:text-muted-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 font-medium text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between pt-2 text-sm">
              <Link to="/forgot-password" className="text-white hover:underline">
                Forgot Password?
              </Link>

              <p className="mt-2 text-center text-xs text-white/50">
                First time logging in?{" "}
                <Link to="/first-login-password-change" className="underline hover:text-white">
                  Click here
                </Link>
              </p>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white">
          Access restricted to authorized DICT personnel only.
        </p>
      </div>

      <div className="absolute bottom-5 flex w-full justify-between px-6 text-xs text-white/60">
        <span>DICT | NIPPSB</span>
        <span>{"\u00A9"} 2025 DICT | NIPPSB. All rights reserved. v1.0.0</span>
      </div>
    </div>
  );
}
