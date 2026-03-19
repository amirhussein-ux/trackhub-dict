import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Circle, Clock, ArrowRight, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStatusBadgeVariant, divisions, type PolicyStatus, type PolicyType } from "@/lib/mock-data";
import { getDisplayedPolicyTitle } from "@/lib/policy-utils";
import { loadPoliciesFromStorage } from "@/lib/policy-storage";
import { subscribeToDataUpdates } from "@/lib/records-storage";

const statusOrder: PolicyStatus[] = ["On Hold", "On Progress", "Under Review", "Approved"];
const TYPES: PolicyType[] = ["Republic Act", "Executive Order", "Issuance", "Administrative Order", "Memorandum Order"];

const statusIcons: Record<PolicyStatus, typeof CheckCircle> = {
  "Approved": CheckCircle,
  "Under Review": Clock,
  "On Progress": Clock,
  "On Hold": Circle,
};

export default function PolicyTimelinePage() {
  const [filterDivision, setFilterDivision] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const [policies, setPolicies] = useState(() => loadPoliciesFromStorage());

  useEffect(() => {
    return subscribeToDataUpdates(() => {
      setPolicies(loadPoliciesFromStorage());
    });
  }, []);

  const filtered = policies.filter((p) => {
    if ((p as { archived?: boolean }).archived) return false;
    if (filterDivision !== "all" && p.division !== filterDivision) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (filterType !== "all" && p.type !== filterType) return false;
    if (search && !getDisplayedPolicyTitle(p).toLowerCase().includes(search.toLowerCase()) && !p.policyNumber.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by type
  const grouped = TYPES.reduce((acc, type) => {
    const items = filtered.filter((p) => p.type === type);
    if (items.length > 0) acc[type] = items;
    return acc;
  }, {} as Record<string, typeof filtered>);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Policy Timeline</h1>
        <p className="text-muted-foreground text-sm mt-1">Visualize policy progress across divisions and categories.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search policies..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={filterDivision} onValueChange={setFilterDivision}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Divisions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>
            {divisions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statusOrder.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-52"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Timeline grouped by type */}
      {Object.entries(grouped).map(([type, policies]) => (
        <div key={type} className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{type}s</h2>
          {policies.map((policy) => (
            <Card
              key={policy.id}
              className="shadow-card border-border/50 hover:shadow-card-hover transition-all cursor-pointer group"
              onClick={() => navigate(`/dashboard/policies/${policy.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">{policy.policyNumber}</span>
                      <Badge variant={getStatusBadgeVariant(policy.status)}>{policy.status}</Badge>
                      <span className="text-xs text-muted-foreground">· {policy.division}</span>
                    </div>
                    <CardTitle className="text-sm font-semibold group-hover:text-primary transition-colors">
                      {getDisplayedPolicyTitle(policy)}
                    </CardTitle>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                </div>
              </CardHeader>
              <CardContent>
                {/* Vertical timeline */}
                <div className="flex items-center gap-0">
                  {statusOrder.map((status, i) => {
                    const currentIdx = statusOrder.indexOf(policy.status);
                    const completed = i <= currentIdx && policy.status !== "On Hold";
                    const isCurrent = status === policy.status;
                    const isLast = i === statusOrder.length - 1;
                    const StatusIcon = isCurrent ? statusIcons[status] : completed ? CheckCircle : Circle;

                    return (
                      <div key={status} className="flex items-center flex-shrink-0">
                        <div className="flex flex-col items-center">
                          <StatusIcon className={`h-5 w-5 ${isCurrent ? "text-primary" : completed ? "text-primary/60" : "text-muted-foreground/30"}`} />
                          <span className={`text-[10px] mt-1 text-center max-w-[80px] leading-tight ${isCurrent ? "text-primary font-semibold" : completed ? "text-foreground/70" : "text-muted-foreground/40"}`}>
                            {status}
                          </span>
                        </div>
                        {!isLast && (
                          <div className={`h-0.5 w-8 mx-1 mt-[-14px] ${i < currentIdx && policy.status !== "On Hold" ? "bg-primary/60" : "bg-muted-foreground/15"}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No policies match the selected filters.</p>
        </div>
      )}
    </div>
  );
}
