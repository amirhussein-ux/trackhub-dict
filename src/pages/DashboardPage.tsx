import { FileText, Search, Clock, PauseCircle, CheckCircle2, TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { loadPoliciesFromStorage } from "@/lib/policy-storage";
import { loadActivitiesFromStorage, subscribeToDataUpdates } from "@/lib/records-storage";
import { getCurrentUser } from "@/lib/user-session";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [policies, setPolicies] = useState(() => loadPoliciesFromStorage());
  const [activities, setActivities] = useState(() => loadActivitiesFromStorage());

  useEffect(() => {
    return subscribeToDataUpdates(() => {
      setPolicies(loadPoliciesFromStorage());
      setActivities(loadActivitiesFromStorage());
    });
  }, []);

  const totalPolicies = policies.length;
  const underReview = policies.filter((p) => p.status === "Under Review").length;
  const onProgress = policies.filter((p) => p.status === "On Progress").length;
  const onHold = policies.filter((p) => p.status === "On Hold").length;
  const approved = policies.filter((p) => p.status === "Approved").length;

  const metrics = [
    { label: "Total Policies", value: totalPolicies, icon: FileText, trend: "", up: true, color: "bg-primary/10 text-primary" },
    { label: "Under Review", value: underReview, icon: Search, trend: "", up: true, color: "bg-destructive/20 text-foreground" },
    { label: "On Progress", value: onProgress, icon: Clock, trend: "", up: false, color: "bg-secondary/15 text-secondary" },
    { label: "On Hold", value: onHold, icon: PauseCircle, trend: "", up: false, color: "bg-primary/12 text-primary" },
    { label: "Approved", value: approved, icon: CheckCircle2, trend: "", up: true, color: "bg-accent/15 text-accent" },
  ];

  const statusData = [
    { name: "Approved", value: approved, color: "#4CAF50" },
    { name: "Under Review", value: underReview, color: "#FFB400" },
    { name: "On Progress", value: onProgress, color: "#2E5C8A" },
    { name: "On Hold", value: onHold, color: "#1A3A5F" },
  ];

  const divisionData = [
    { name: "PRAD", count: policies.filter((p) => p.division === "PRAD").length },
    { name: "PPDD", count: policies.filter((p) => p.division === "PPDD").length },
    { name: "PPMED", count: policies.filter((p) => p.division === "PPMED").length },
    { name: "PPMCAD", count: policies.filter((p) => p.division === "PPMCAD").length },
  ];

  const yearData = useMemo(() => {
    const counts = new Map<number, number>();
    policies.forEach((policy) => {
      const year = new Date(policy.createdDate).getFullYear();
      if (!Number.isNaN(year)) {
        counts.set(year, (counts.get(year) ?? 0) + 1);
      }
    });

    return Array.from(counts.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, count]) => ({ year: String(year), count }));
  }, [policies]);

  const progressStatuses = [
    { label: "Approved", count: approved, color: "bg-accent", total: totalPolicies },
    { label: "Under Review", count: underReview, color: "bg-destructive", total: totalPolicies },
    { label: "On Progress", count: onProgress, color: "bg-secondary", total: totalPolicies },
    { label: "On Hold", count: onHold, color: "bg-primary", total: totalPolicies },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <Card className="hero-gradient text-primary-foreground shadow-lg border-0">
        <CardContent className="p-6">
          <h1 className="text-xl font-bold">{getGreeting()}, {currentUser.identifier}</h1>
          <p className="text-sm text-primary-foreground/80 mt-1">
            Welcome back to TrackHub — your centralized ICT policy monitoring dashboard.
          </p>
        </CardContent>
      </Card>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {metrics.map((m, i) => (
          <Card key={i} className="shadow-card hover:shadow-card-hover transition-all duration-300 border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${m.color}`}>
                  <m.icon className="h-4 w-4" />
                </div>
                {m.trend ? (
                  <span className={`text-xs font-medium flex items-center gap-0.5 ${m.up ? "text-accent" : "text-muted-foreground"}`}>
                    {m.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {m.trend}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Live</span>
                )}
              </div>
              <p className="text-2xl font-bold text-foreground">{m.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress Tracker */}
      <Card className="shadow-card border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Policy Progress Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {progressStatuses.map((s) => (
              <div key={s.label} className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-semibold text-foreground">{s.count}/{s.total}</span>
                </div>
                <Progress value={s.total > 0 ? (s.count / s.total) * 100 : 0} className={`h-2 [&>div]:${s.color}`} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          className="shadow-card border-border/50 cursor-pointer hover:shadow-card-hover transition-all"
          role="button"
          tabIndex={0}
          onClick={() => navigate("/dashboard/reports")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") navigate("/dashboard/reports");
          }}
        >
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Status Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {statusData.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card
          className="shadow-card border-border/50 cursor-pointer hover:shadow-card-hover transition-all"
          role="button"
          tabIndex={0}
          onClick={() => navigate("/dashboard/reports")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") navigate("/dashboard/reports");
          }}
        >
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Policies per Division</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={divisionData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(217, 91%, 53%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card
          className="shadow-card border-border/50 cursor-pointer hover:shadow-card-hover transition-all"
          role="button"
          tabIndex={0}
          onClick={() => navigate("/dashboard/reports")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") navigate("/dashboard/reports");
          }}
        >
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Policies per Year</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={yearData.length > 0 ? yearData : [{ year: "-", count: 0 }] }>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="hsl(217, 91%, 53%)" strokeWidth={2.5} dot={{ fill: "hsl(217, 91%, 53%)", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="shadow-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activities.slice(0, 6).map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="h-8 w-8 rounded-full hero-gradient flex items-center justify-center flex-shrink-0 text-primary-foreground text-xs font-bold">
                  {a.user.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{a.user}</span>{" "}
                    <span className="text-muted-foreground">{a.action}</span>
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{a.policyTitle}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{a.timestamp.split(" ")[1]}</span>
              </div>
            ))}
            {activities.length === 0 && <p className="text-sm text-muted-foreground">No recent activity yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
