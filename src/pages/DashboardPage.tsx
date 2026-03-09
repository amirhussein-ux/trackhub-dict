import { FileText, FilePlus, Clock, CheckCircle, Zap, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockPolicies, mockActivities, getStatusBadgeVariant } from "@/lib/mock-data";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

const metrics = [
  { label: "Total Policies", value: 10, icon: FileText, trend: "+12%", up: true, color: "bg-primary/10 text-primary" },
  { label: "Draft", value: 2, icon: FilePlus, trend: "+2", up: true, color: "bg-muted text-muted-foreground" },
  { label: "Awaiting Publication", value: 3, icon: Clock, trend: "-1", up: false, color: "status-pending" },
  { label: "Published", value: 2, icon: CheckCircle, trend: "+1", up: true, color: "status-published" },
  { label: "Effective", value: 3, icon: Zap, trend: "+2", up: true, color: "status-effective" },
];

const statusData = [
  { name: "Draft", value: 2, color: "#9CA3AF" },
  { name: "Filing", value: 2, color: "#EAB308" },
  { name: "Pending", value: 2, color: "#F97316" },
  { name: "Published", value: 1, color: "#22C55E" },
  { name: "Effective", value: 3, color: "#2563EB" },
];

const divisionData = [
  { name: "NIPPSB", count: 3 },
  { name: "ICT Industry", count: 3 },
  { name: "ICT Governance", count: 2 },
  { name: "Cybersecurity", count: 2 },
];

const yearData = [
  { year: "2022", count: 5 },
  { year: "2023", count: 8 },
  { year: "2024", count: 12 },
  { year: "2025", count: 10 },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of ICT policy tracking activity.</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {metrics.map((m, i) => (
          <Card key={i} className="shadow-card hover:shadow-card-hover transition-all duration-300 border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${m.color}`}>
                  <m.icon className="h-4 w-4" />
                </div>
                <span className={`text-xs font-medium flex items-center gap-0.5 ${m.up ? 'text-green-600' : 'text-orange-500'}`}>
                  {m.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {m.trend}
                </span>
              </div>
              <p className="text-2xl font-bold text-foreground">{m.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-card border-border/50">
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

        <Card className="shadow-card border-border/50">
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

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Policies per Year</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={yearData}>
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
            {mockActivities.slice(0, 6).map((a) => (
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
