import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authenticateUser } from "@/lib/auth-workflows.ts";
import { setCurrentUser } from "@/lib/user-session";
import dictLogo from "@/assets/Artboard 4.png";
import nippsLogo from "@/assets/NIPPSB(1).png";
import { motion } from "framer-motion";
import trackhubBg from "@/assets/trackhubbg.png";


export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

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
    });

    toast({ title: "Welcome back!", description: "You have been logged in successfully." });
    navigate("/dashboard");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-4 overflow-hidden">
      {/* Background */}
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
          before:absolute before:inset-0
          before:rounded-2xl
          before:bg-gradient-to-br before:from-white/20 before:to-transparent
          before:opacity-30
          before:pointer-events-none
        ">
        <form onSubmit={handleLogin} className="space-y-6">

        {/* Title */}
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground text-white">
            Sign in to your account
          </h2>
        </div>

        {/* Email / Username */}
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
            className="h-12 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 transition-all"
          />
        </div>

        {/* Password */}
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
              className="h-12 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 transition-all"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white hover:text-muted-foreground transition"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Button */}
        <div className="flex gap-3">
        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
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
        

    {/* Footer Links */}
    <div className="flex items-center justify-between text-sm pt-2">
          <Link
            to="/forgot-password"
            className="text-primary hover:underline text-white"
          >
            Forgot Password?
          </Link>

          <p className="text-xs text-white/50 mt-2 text-center">
            First time logging in? {" "}
            <Link to="/first-login-password-change" className="underline hover:text-white">
              Click here
            </Link>
          </p>
        </div>
      </form>
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
