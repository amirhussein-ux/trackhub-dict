import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  CartesianGrid,
  LabelList,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { canArchiveFromReports, canViewReports } from "@/lib/access-control";
import { getDisplayedPolicyTitle } from "@/lib/policy-utils";
import { type Division, type Policy, type PolicyStatus } from "../lib/mock-data";
import { loadPoliciesFromStorage } from "../lib/policy-storage";
import { subscribeToDataUpdates } from "../lib/records-storage";
import { PolicyAutomationService } from "@/lib/api/automationService";
import { getCurrentUser } from "@/lib/user-session";

const statusColors: Record<PolicyStatus, string> = {
  Approved: "hsl(142, 71%, 45%)",
  "Under Review": "hsl(25, 95%, 53%)",
  "On Progress": "hsl(45, 93%, 47%)",
  "On Hold": "hsl(0, 84%, 60%)",
  Published: "hsl(221, 83%, 53%)",
};

const allStatuses: PolicyStatus[] = ["Approved", "Under Review", "On Progress", "On Hold", "Published"];
const allDivisions: Division[] = ["PRAD", "PPDD", "PPMED", "PPMCAD"];

function formatDate(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function toCsv(rows: string[][]): string {
  return rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function normalizePercentages(counts: number[]): number[] {
  const total = counts.reduce((sum, value) => sum + value, 0);
  if (total === 0) {
    return counts.map(() => 0);
  }

  const raw = counts.map((count) => (count / total) * 100);
  const floorValues = raw.map((value) => Math.floor(value));
  let remainder = 100 - floorValues.reduce((sum, value) => sum + value, 0);

  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  for (let i = 0; i < order.length && remainder > 0; i += 1) {
    floorValues[order[i].index] += 1;
    remainder -= 1;
  }

  return floorValues;
}

function renderPieLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  payload,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  payload?: { displayPercent?: number };
}) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos((-midAngle * Math.PI) / 180);
  const y = cy + radius * Math.sin((-midAngle * Math.PI) / 180);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {payload?.displayPercent ?? 0}%
    </text>
  );
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [policies, setPolicies] = useState<Policy[]>(() => loadPoliciesFromStorage());

  useEffect(() => {
    return subscribeToDataUpdates(() => {
      setPolicies(loadPoliciesFromStorage());
    });
  }, []);

  const [divisionFilter, setDivisionFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [yearFilter, setYearFilter] = useState<string>("All");
  const [search, setSearch] = useState("");

  const [sortBy, setSortBy] = useState<keyof Policy>("createdDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const years = useMemo(() => {
    const values = Array.from(new Set(policies.map((policy) => new Date(policy.createdDate).getFullYear()).filter((year) => !Number.isNaN(year))));
    return values.sort((a, b) => a - b);
  }, [policies]);

  const [rangeStartYear, setRangeStartYear] = useState<string>("All");
  const [rangeEndYear, setRangeEndYear] = useState<string>("All");

  const filteredPolicies = useMemo(() => {
    return policies.filter((policy) => {
      const policyYear = String(new Date(policy.createdDate).getFullYear());
      const matchesDivision = divisionFilter === "All" || policy.division === divisionFilter;
      const matchesStatus = statusFilter === "All" || policy.status === statusFilter;
      const matchesYear = yearFilter === "All" || policyYear === yearFilter;
      const needle = search.trim().toLowerCase();
      const matchesSearch =
        needle.length === 0 ||
        policy.id.toLowerCase().includes(needle) ||
        getDisplayedPolicyTitle(policy).toLowerCase().includes(needle) ||
        policy.division.toLowerCase().includes(needle) ||
        policy.status.toLowerCase().includes(needle);
      return matchesDivision && matchesStatus && matchesYear && matchesSearch;
    });
  }, [policies, divisionFilter, statusFilter, yearFilter, search]);

  const statusData = useMemo(() => {
    const counts = allStatuses.map((status) => filteredPolicies.filter((policy) => policy.status === status).length);
    const displayPercents = normalizePercentages(counts);

    return allStatuses.map((status, index) => {
      const count = counts[index];
      return {
        name: status,
        value: count,
        displayPercent: displayPercents[index],
        color: statusColors[status],
      };
    });
  }, [filteredPolicies]);

  const divisionChartData = useMemo(() => {
    return allDivisions.map((division) => {
      const inDivision = filteredPolicies.filter((policy) => policy.division === division);
      const archived = inDivision.filter((policy) => policy.status === "On Hold").length;
      const active = inDivision.length - archived;
      return {
        name: division,
        active,
        archived,
        total: inDivision.length,
      };
    });
  }, [filteredPolicies]);

  const yearlyTrendData = useMemo(() => {
    const byYear = new Map<number, { year: number; created: number; archived: number }>();

    filteredPolicies.forEach((policy) => {
      const createdYear = new Date(policy.createdDate).getFullYear();
      if (!Number.isNaN(createdYear)) {
        const existing = byYear.get(createdYear) ?? { year: createdYear, created: 0, archived: 0 };
        existing.created += 1;
        byYear.set(createdYear, existing);
      }
      if (policy.status === "On Hold") {
        const archivedYear = new Date(policy.lastUpdated).getFullYear();
        if (!Number.isNaN(archivedYear)) {
          const existing = byYear.get(archivedYear) ?? { year: archivedYear, created: 0, archived: 0 };
          existing.archived += 1;
          byYear.set(archivedYear, existing);
        }
      }
    });

    const sorted = Array.from(byYear.values()).sort((a, b) => a.year - b.year);
    const start = rangeStartYear === "All" ? -Infinity : Number(rangeStartYear);
    const end = rangeEndYear === "All" ? Infinity : Number(rangeEndYear);

    return sorted
      .filter((item) => item.year >= start && item.year <= end)
      .map((item, index, arr) => {
        const lookBack = arr.slice(Math.max(0, index - 1), index + 1);
        const movingAverage = lookBack.reduce((sum, val) => sum + val.created, 0) / lookBack.length;
        return {
          year: String(item.year),
          created: item.created,
          archived: item.archived,
          netGrowth: item.created - item.archived,
          movingAverage: Number(movingAverage.toFixed(2)),
        };
      });
  }, [filteredPolicies, rangeStartYear, rangeEndYear]);

  const sortedPolicies = useMemo(() => {
    const sorted = [...filteredPolicies].sort((a, b) => {
      const aValue = String(a[sortBy] ?? "").toLowerCase();
      const bValue = String(b[sortBy] ?? "").toLowerCase();
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredPolicies, sortBy, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedPolicies.length / pageSize));
  const pagedPolicies = sortedPolicies.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const divisionBreakdown = useMemo(() => {
    return allDivisions.map((division) => {
      const rows = filteredPolicies.filter((policy) => policy.division === division);
      const archived = rows.filter((policy) => policy.status === "On Hold").length;
      const pending = rows.filter((policy) => policy.status === "Under Review").length;
      const active = rows.length - archived;
      return {
        division,
        total: rows.length,
        active,
        archived,
        pending,
      };
    });
  }, [filteredPolicies]);

  const statusReportRows = useMemo(() => {
    const total = filteredPolicies.length || 1;
    return allStatuses.map((status) => {
      const count = filteredPolicies.filter((policy) => policy.status === status).length;
      return { status, count, percentage: Number(((count / total) * 100).toFixed(2)) };
    });
  }, [filteredPolicies]);

  const toggleSort = (field: keyof Policy) => {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(field);
    setSortDirection("asc");
  };

  const handleArchive = async (id: string) => {
    if (!canArchiveFromReports(currentUser)) {
      return;
    }

    const target = policies.find((policy) => policy.id === id);
    if (!target) {
      return;
    }

    try {
      await PolicyAutomationService.archivePolicy(target.id);
    } catch {
      // Ignore archive failures to keep the report view responsive.
    }
  };

  const exportStatusReportCsv = () => {
    const rows = [["Status Category", "Count", "Percentage"], ...statusReportRows.map((row) => [row.status, String(row.count), `${row.percentage}%`])];
    downloadFile("detailed-status-report.csv", toCsv(rows), "text/csv;charset=utf-8;");
  };

  const exportStatusReportExcel = () => {
    const rows = [["Status Category", "Count", "Percentage"], ...statusReportRows.map((row) => [row.status, String(row.count), `${row.percentage}%`])];
    downloadFile("detailed-status-report.xls", toCsv(rows), "application/vnd.ms-excel;charset=utf-8;");
  };

  const exportStatusReportPdf = () => {
    window.print();
  };

  if (!canViewReports(currentUser)) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card className="shadow-card border-border/50">
          <CardHeader><CardTitle>Access Restricted</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Reports are available only to OIC Director and Division Chief roles.
            </p>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground">Dashboard-style analytics with synchronized filters, interactive charts, and detailed report tables.</p>
      </div>

      <Card className="shadow-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Global Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Input placeholder="Search policies..." value={search} onChange={(event) => setSearch(event.target.value)} />
            <select className="h-10 rounded-md border border-input bg-background px-3" value={divisionFilter} onChange={(event) => setDivisionFilter(event.target.value)}>
              <option value="All">All Divisions</option>
              {allDivisions.map((division) => <option key={division} value={division}>{division}</option>)}
            </select>
            <select className="h-10 rounded-md border border-input bg-background px-3" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="All">All Statuses</option>
              {allStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <select className="h-10 rounded-md border border-input bg-background px-3" value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
              <option value="All">All Years</option>
              {years.map((year) => <option key={year} value={String(year)}>{year}</option>)}
            </select>
            <Button variant="outline" onClick={() => { setDivisionFilter("All"); setStatusFilter("All"); setYearFilter("All"); setSearch(""); }}>
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Policy Status Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={88}
                  onClick={(slice) => {
                    const value = slice?.name as string | undefined;
                    if (!value) return;
                    setStatusFilter((prev) => (prev === value ? "All" : value));
                  }}
                  label={renderPieLabel}
                  labelLine={false}
                >
                  {statusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {statusData.map((row) => (
                <button
                  key={row.name}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setStatusFilter((prev) => (prev === row.name ? "All" : row.name))}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: row.color }} />
                  {row.name}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Policies per Division (Active vs Archived)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <select className="h-10 rounded-md border border-input bg-background px-3 w-full" value={divisionFilter} onChange={(event) => setDivisionFilter(event.target.value)}>
              <option value="All">All Divisions</option>
              {allDivisions.map((division) => <option key={division} value={division}>{division}</option>)}
            </select>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={divisionChartData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="active" stackId="a" fill="hsl(217, 91%, 53%)" radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="active" position="insideTop" formatter={(val: number) => (val > 0 ? val : "")} />
                </Bar>
                <Bar dataKey="archived" stackId="a" fill="hsl(0, 84%, 60%)">
                  <LabelList dataKey="total" position="top" formatter={(val: number) => (val > 0 ? val : "")} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Policies per Year</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select className="h-10 rounded-md border border-input bg-background px-3" value={rangeStartYear} onChange={(event) => setRangeStartYear(event.target.value)}>
                <option value="All">Start Year</option>
                {years.map((year) => <option key={`start-${year}`} value={String(year)}>{year}</option>)}
              </select>
              <select className="h-10 rounded-md border border-input bg-background px-3" value={rangeEndYear} onChange={(event) => setRangeEndYear(event.target.value)}>
                <option value="All">End Year</option>
                {years.map((year) => <option key={`end-${year}`} value={String(year)}>{year}</option>)}
              </select>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={yearlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="created" stroke="hsl(217, 91%, 53%)" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="movingAverage" stroke="hsl(258, 90%, 57%)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card border-border/50">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Policy Summary Table</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  {["id", "title", "division", "status", "createdDate", "lastUpdated"].map((field) => (
                    <th key={field} className="py-2 pr-3">
                      <button className="hover:text-foreground" onClick={() => toggleSort(field as keyof Policy)}>
                        {field === "id" ? "Policy ID" : field === "createdDate" ? "Date Created" : field === "lastUpdated" ? "Last Updated" : field.charAt(0).toUpperCase() + field.slice(1)}
                      </button>
                    </th>
                  ))}
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedPolicies.map((policy) => (
                  <tr key={policy.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-medium">{policy.id}</td>
                    <td className="py-2 pr-3">{getDisplayedPolicyTitle(policy)}</td>
                    <td className="py-2 pr-3">{policy.division}</td>
                    <td className="py-2 pr-3"><Badge variant="outline">{policy.status}</Badge></td>
                    <td className="py-2 pr-3">{formatDate(policy.createdDate)}</td>
                    <td className="py-2 pr-3">{formatDate(policy.lastUpdated)}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/dashboard/policies/${policy.id}`)}>View</Button>
                        {canArchiveFromReports(currentUser) && (
                          <Button size="sm" variant="outline" onClick={() => handleArchive(policy.id)}>Archive</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {pagedPolicies.map((policy) => (
              <div key={policy.id} className="rounded-lg border border-border p-3 space-y-2">
                <p className="font-semibold text-sm">{policy.id}</p>
                <p className="text-sm">{getDisplayedPolicyTitle(policy)}</p>
                <p className="text-xs text-muted-foreground">{policy.division} • {policy.status}</p>
                <p className="text-xs text-muted-foreground">Created: {formatDate(policy.createdDate)} • Updated: {formatDate(policy.lastUpdated)}</p>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/dashboard/policies/${policy.id}`)}>View</Button>
                  {canArchiveFromReports(currentUser) && (
                    <Button size="sm" variant="outline" onClick={() => handleArchive(policy.id)}>Archive</Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}>Previous</Button>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Division Breakdown Table</CardTitle></CardHeader>
          <CardContent>
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2">Division</th>
                    <th className="py-2">Total</th>
                    <th className="py-2">Active</th>
                    <th className="py-2">Archived</th>
                    <th className="py-2">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {divisionBreakdown.map((row) => (
                    <tr key={row.division} className="border-b border-border/60">
                      <td className="py-2">{row.division}</td>
                      <td className="py-2">{row.total}</td>
                      <td className="py-2">{row.active}</td>
                      <td className="py-2">{row.archived}</td>
                      <td className="py-2">{row.pending}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden space-y-2">
              {divisionBreakdown.map((row) => (
                <div key={row.division} className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-semibold">{row.division}</p>
                  <p className="text-muted-foreground">Total: {row.total} • Active: {row.active} • Archived: {row.archived} • Pending: {row.pending}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Yearly Trends Table</CardTitle></CardHeader>
          <CardContent>
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2">Year</th>
                    <th className="py-2">Policies Created</th>
                    <th className="py-2">Policies Archived</th>
                    <th className="py-2">Net Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlyTrendData.map((row) => (
                    <tr key={row.year} className="border-b border-border/60">
                      <td className="py-2">{row.year}</td>
                      <td className="py-2">{row.created}</td>
                      <td className="py-2">{row.archived}</td>
                      <td className="py-2">{row.netGrowth}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden space-y-2">
              {yearlyTrendData.map((row) => (
                <div key={row.year} className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-semibold">Year {row.year}</p>
                  <p className="text-muted-foreground">Created: {row.created} • Archived: {row.archived} • Net: {row.netGrowth}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border/50">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-sm font-semibold">Detailed Status Report Table</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={exportStatusReportCsv}>CSV</Button>
                <Button size="sm" variant="outline" onClick={exportStatusReportExcel}>Excel</Button>
                <Button size="sm" variant="outline" onClick={exportStatusReportPdf}>PDF</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2">Status Category</th>
                    <th className="py-2">Count</th>
                    <th className="py-2">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {statusReportRows.map((row) => (
                    <tr key={row.status} className="border-b border-border/60">
                      <td className="py-2">{row.status}</td>
                      <td className="py-2">{row.count}</td>
                      <td className="py-2">{row.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden space-y-2">
              {statusReportRows.map((row) => (
                <div key={row.status} className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-semibold">{row.status}</p>
                  <p className="text-muted-foreground">Count: {row.count} • Percentage: {row.percentage}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
