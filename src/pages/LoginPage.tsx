import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import dictLogo from "@/assets/DICT_logo.png";
import nippsLogo from "@/assets/NIPPSB.png";
import bagongPilipinas from "@/assets/bagong_pilipinas.png";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Error", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    toast({ title: "Welcome back!", description: "You have been logged in successfully." });
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <img src={dictLogo} alt="DICT Logo" className="h-14 w-auto" />
            <img src={nippsLogo} alt="NIPPSB Logo" className="h-14 w-14" />
            <img src={bagongPilipinas} alt="Bagong Pilipinas" className="h-14 w-auto" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">TrackHub</h1>
          <p className="text-sm text-muted-foreground mt-1">DICT Policy Tracker – Sign In</p>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 shadow-card p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@dict.gov.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" variant="hero" className="w-full h-11" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</> : "Sign In"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-6">
            Access restricted to authorized DICT personnel only.
          </p>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Department of Information and Communications Technology
        </p>
      </div>
    </div>
  );
}
