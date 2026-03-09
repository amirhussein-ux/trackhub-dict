import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Circle, Clock, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { mockPolicies, getStatusBadgeVariant, divisions, type PolicyStatus } from "@/lib/mock-data";

const statusOrder: PolicyStatus[] = [
  "Draft",
  "For ONAR Filing",
  "Submitted to ONAR",
  "For Official Gazette Publication",
  "For Newspaper Publication",
  "Published",
  "Effective",
];

const timelineLabels: Record<string, string> = {
  "Draft": "Draft",
  "For ONAR Filing": "ONAR Filing",
  "Submitted to ONAR": "Submitted to ONAR",
  "For Official Gazette Publication": "Official Gazette",
  "For Newspaper Publication": "Newspaper",
  "Published": "Published",
  "Effective": "Effective",
};

export default function PolicyTimelinePage() {
  const [filterDivision, setFilterDivision] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const navigate = useNavigate();

  const filtered = mockPolicies.filter((p) => {
    if (filterDivision !== "all" && p.division !== filterDivision) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Policy Timeline</h1>
        <p className="text-muted-foreground text-sm mt-1">Visualize policy progress from draft to effectivity.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterDivision} onValueChange={setFilterDivision}>
          <SelectTrigger className="w-56"><SelectValue placeholder="All Divisions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>
            {divisions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-56"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statusOrder.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Timeline Cards */}
      <div className="space-y-4">
        {filtered.map((policy) => {
          const currentIdx = statusOrder.indexOf(policy.status);
          return (
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
                    </div>
                    <CardTitle className="text-sm font-semibold group-hover:text-primary transition-colors">
                      {policy.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{policy.division}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                </div>
              </CardHeader>
              <CardContent>
                {/* Horizontal timeline */}
                <div className="flex items-center gap-0 overflow-x-auto pb-1">
                  {statusOrder.map((status, i) => {
                    const stepIdx = i;
                    const completed = stepIdx <= currentIdx;
                    const isCurrent = status === policy.status;
                    const isLast = i === statusOrder.length - 1;

                    return (
                      <div key={status} className="flex items-center flex-shrink-0">
                        <div className="flex flex-col items-center">
                          {completed ? (
                            <CheckCircle className={`h-5 w-5 ${isCurrent ? 'text-primary' : 'text-primary/60'}`} />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground/30" />
                          )}
                          <span className={`text-[10px] mt-1 text-center max-w-[70px] leading-tight ${
                            isCurrent ? 'text-primary font-semibold' : completed ? 'text-foreground/70' : 'text-muted-foreground/40'
                          }`}>
                            {timelineLabels[status]}
                          </span>
                        </div>
                        {!isLast && (
                          <div className={`h-0.5 w-6 mx-0.5 mt-[-14px] ${stepIdx < currentIdx ? 'bg-primary/60' : 'bg-muted-foreground/15'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No policies match the selected filters.</p>
        </div>
      )}
    </div>
  );
}
