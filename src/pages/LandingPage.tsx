import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Shield, FileText, BarChart3, Activity, Users, ArrowRight, ChevronRight } from "lucide-react";
import dictLogo from "@/assets/DICT_logo.png";
import nippsLogo from "@/assets/NIPPSB.png";
import bagongPilipinas from "@/assets/bagong_pilipinas.png";

const features = [
  { icon: FileText, title: "Policy Tracking", description: "Track ICT policies from drafting through publication with real-time status updates." },
  { icon: Shield, title: "Secure Document Repository", description: "Store and manage policy documents with version control and secure access." },
  { icon: BarChart3, title: "Policy Status Monitoring", description: "Monitor publication progress across ONAR, Official Gazette, and newspaper channels." },
  { icon: Activity, title: "Activity Logging", description: "Comprehensive audit trail of all policy actions, edits, and status changes." },
  { icon: Users, title: "Division Collaboration", description: "Enable seamless collaboration between DICT divisions on policy development." },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-card">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-3">
            <img src={dictLogo} alt="DICT Logo" className="h-10 w-auto" />
            <div className="hidden sm:block">
              <span className="font-bold text-lg text-foreground">TrackHub</span>
              <span className="text-xs text-muted-foreground block leading-tight">DICT Policy Tracker</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <img src={bagongPilipinas} alt="Bagong Pilipinas" className="h-10 w-auto hidden sm:block" />
            <Button variant="hero" size="sm" onClick={() => navigate("/login")}>
              Sign In <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero-gradient py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDE4YzMuMzE0IDAgNi0yLjY4NiA2LTZzLTIuNjg2LTYtNi02LTYgMi42ODYtNiA2IDIuNjg2IDYgNiA2ek0zNiA0OGMzLjMxNCAwIDYtMi42ODYgNi02cy0yLjY4Ni02LTYtNi02IDIuNjg2LTYgNiAyLjY4NiA2IDYgNnpNNiAxOGMzLjMxNCAwIDYtMi42ODYgNi02UzcuMzE0IDYgNiA2IDAgOC42ODYgMCAxMnMyLjY4NiA2IDYgNnpNNiA0OGMzLjMxNCAwIDYtMi42ODYgNi02cy0yLjY4Ni02LTYtNi02IDIuNjg2LTYgNiAyLjY4NiA2IDYgNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
        <div className="container mx-auto px-6 text-center relative z-10">
          <div className="flex items-center justify-center gap-4 mb-8">
            <img src={nippsLogo} alt="NIPPSB Logo" className="h-20 w-20 rounded-full bg-white/10 p-1 shadow-lg" />
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 px-4 py-1.5 text-sm text-primary-foreground/90 mb-6">
            <Shield className="h-3.5 w-3.5" />
            Department of Information and Communications Technology
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-primary-foreground mb-6 tracking-tight leading-tight">
            TrackHub
            <span className="block text-2xl md:text-3xl font-semibold mt-2 text-primary-foreground/80">
              DICT Policy Tracker
            </span>
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            Centralized ICT Policy Monitoring and Repository System. Track, manage, and publish ICT policies from draft to effectivity.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button variant="hero-outline" size="lg" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={() => navigate("/login")}>
              Get Started <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-foreground mb-3">System Features</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">Everything you need to manage ICT policies efficiently.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <div key={i} className="bg-card rounded-xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 border border-border/50 group hover:-translate-y-1">
                <div className="h-11 w-11 rounded-lg hero-gradient flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-6 max-w-3xl text-center">
          <div className="flex items-center justify-center gap-6 mb-6">
            <img src={dictLogo} alt="DICT" className="h-16 w-auto" />
            <img src={nippsLogo} alt="NIPPSB" className="h-16 w-16" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4">About DICT NIPPSB</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            The National ICT Planning, Policy and Standards Bureau (NIPPSB) of the Department of Information and Communications Technology (DICT) is responsible for formulating, recommending, and implementing national ICT policies, plans, and standards. The Bureau ensures that ICT policies are properly tracked, documented, and published in compliance with government regulations.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
            {["Policy Development Division", "Standards & Compliance Division", "ICT Planning Division", "Research & Analytics Division"].map((d, i) => (
              <div key={i} className="bg-background rounded-lg p-4 border border-border/50">
                <p className="text-sm font-medium text-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-sidebar text-sidebar-foreground py-10">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <img src={dictLogo} alt="DICT" className="h-12 w-auto brightness-0 invert opacity-80" />
              <img src={nippsLogo} alt="NIPPSB" className="h-12 w-12 brightness-0 invert opacity-80" />
              <img src={bagongPilipinas} alt="Bagong Pilipinas" className="h-12 w-auto brightness-0 invert opacity-80" />
            </div>
            <div className="text-center md:text-left">
              <p className="font-semibold">TrackHub – DICT Policy Tracker</p>
              <p className="text-xs text-sidebar-foreground/60">Department of Information and Communications Technology</p>
            </div>
            <div className="text-sm text-sidebar-foreground/50">
              © 2025 DICT. All rights reserved. v1.0.0
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
