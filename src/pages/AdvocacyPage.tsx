import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/user-session";
import { canViewAdvocacy } from "@/lib/access-control";
import PolicyAdvocacyForm from "@/components/PolicyAdvocacyForm";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api/client";
import { listAdvocacy, type PolicyAdvocacyListRecord } from "@/lib/api/advocacyService";

type PolicyOption = {
  id: string;
  _id?: string;
  policyNumber?: string;
  title: string;
  workflowState?: string;
  archived?: boolean;
};

type PoliciesResponse = PolicyOption[] | { data?: PolicyOption[] };

function normalizeLoose(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "");
}

function isMongoObjectId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value.trim());
}

function formatDisplayDate(value?: string): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

export default function AdvocacyPage() {
  const currentUser = getCurrentUser();
  const { toast } = useToast();
  const canAccess = canViewAdvocacy(currentUser);
  const canEdit = currentUser.division === "PPMCAD";

  const [policies, setPolicies] = useState<PolicyOption[]>([]);
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(false);
  const [selectedPolicyId, setSelectedPolicyId] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [advocacyRecords, setAdvocacyRecords] = useState<PolicyAdvocacyListRecord[]>([]);
  const [isLoadingAdvocacy, setIsLoadingAdvocacy] = useState(false);

  useEffect(() => {
    if (!canAccess) return;

    void (async () => {
      setIsLoadingPolicies(true);
      try {
        const response = await apiRequest<PoliciesResponse>("/policies?includeArchived=true");
        const list = Array.isArray(response) ? response : response.data ?? [];
        const activePolicies = list.filter((policy) => !policy.archived);
        setPolicies(activePolicies);
        if (activePolicies.length > 0) {
          setSelectedPolicyId(activePolicies[0].id ?? activePolicies[0]._id ?? "");
        }
      } catch (error) {
        toast({
          title: "Could not load policies",
          description: error instanceof Error ? error.message : "Failed to load policies.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingPolicies(false);
      }
    })();
  }, [canAccess, toast]);

  useEffect(() => {
    if (!canAccess) return;

    void (async () => {
      setIsLoadingAdvocacy(true);
      try {
        setAdvocacyRecords(await listAdvocacy());
      } catch (error) {
        toast({
          title: "Could not load advocacy records",
          description: error instanceof Error ? error.message : "Failed to load advocacy records.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingAdvocacy(false);
      }
    })();
  }, [canAccess, toast]);

  const resolvedManualPolicyId = useMemo(() => {
    const raw = manualInput.trim();
    if (!raw) return "";

    if (isMongoObjectId(raw)) {
      return raw;
    }

    const normalized = normalizeLoose(raw);
    const match = policies.find(
      (policy) =>
        normalizeLoose(policy.policyNumber ?? "") === normalized ||
        normalizeLoose(policy.title ?? "") === normalized
    );

    return match?.id ?? match?._id ?? "";
  }, [manualInput, policies]);

  const activePolicyId = (resolvedManualPolicyId || selectedPolicyId).trim();

  const handleSaved = async () => {
    setDialogOpen(false);
    setManualInput("");
    try {
      setAdvocacyRecords(await listAdvocacy());
    } catch (error) {
      toast({
        title: "Could not refresh advocacy records",
        description: error instanceof Error ? error.message : "Failed to refresh advocacy records.",
        variant: "destructive",
      });
    }
  };

  if (!canAccess) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">You do not have permission to view Advocacy details.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Advocacy</h1>
          <p className="text-sm text-muted-foreground">Track post-publication advocacy details in one place.</p>
        </div>
        <Badge variant="outline" className="text-xs">
          {canEdit ? "Editable (PPMCAD)" : "Read-only"}
        </Badge>
      </div>

      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="text-sm">Policy Selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Button onClick={() => setDialogOpen(true)} className="bg-primary text-primary-foreground">
              + Policy
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Policy (Optional quick select)</Label>
              <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId} disabled={isLoadingPolicies || policies.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingPolicies ? "Loading policies..." : policies.length > 0 ? "Select policy" : "No policies available"} />
                </SelectTrigger>
                <SelectContent>
                  {policies.map((policy) => {
                    const id = policy.id ?? policy._id ?? "";
                    return (
                      <SelectItem key={id} value={id}>
                        {policy.policyNumber ? `${policy.policyNumber} - ` : ""}
                        {policy.title}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            PPMCAD can encode manually by entering policy number/title or Mongo policy ID in the popup.
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="text-sm">Advocacy Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="text-sm">
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="min-w-[280px] align-top text-foreground">Policy</TableHead>
                <TableHead className="min-w-[140px] align-top text-foreground">Date Signed</TableHead>
                <TableHead className="min-w-[140px] align-top text-foreground">ONAR</TableHead>
                <TableHead className="min-w-[160px] align-top text-foreground">Official Gazette</TableHead>
                <TableHead className="min-w-[180px] align-top text-foreground">Newspaper</TableHead>
                <TableHead className="min-w-[320px] align-top text-foreground">Effectivity Clause</TableHead>
                <TableHead className="min-w-[160px] align-top text-foreground">Effectivity Date</TableHead>
                <TableHead className="min-w-[180px] align-top text-foreground">Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingAdvocacy ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    Loading advocacy records...
                  </TableCell>
                </TableRow>
              ) : advocacyRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No advocacy records yet.
                  </TableCell>
                </TableRow>
              ) : (
                advocacyRecords.map((record, index) => {
                  const policy = typeof record.policyId === "object" ? record.policyId : undefined;
                  const policyLabel = [policy?.policyNumber, policy?.title].filter(Boolean).join(": ");
                  const newspaperParts = [formatDisplayDate(record.newspaperDate), record.newspaperName].filter((part) => part && part !== "-");
                  return (
                    <TableRow
                      key={record.id ?? record._id ?? `${policy?._id ?? "policy"}-${record.updatedAt ?? ""}`}
                      className="hover:bg-transparent"
                    >
                      <TableCell className="align-top whitespace-pre-wrap leading-7">
                        {policyLabel ? `${index + 1}. ${policyLabel}` : "-"}
                      </TableCell>
                      <TableCell className="align-top whitespace-pre-wrap">{formatDisplayDate(record.dateSigned)}</TableCell>
                      <TableCell className="align-top whitespace-pre-wrap">{formatDisplayDate(record.onarFiledDate)}</TableCell>
                      <TableCell className="align-top whitespace-pre-wrap">{formatDisplayDate(record.officialGazetteDate)}</TableCell>
                      <TableCell className="align-top whitespace-pre-wrap">
                        {newspaperParts.length > 0 ? newspaperParts.join("\n") : "-"}
                      </TableCell>
                      <TableCell className="align-top whitespace-pre-wrap leading-7">
                        {record.effectivityClause?.trim() || "-"}
                      </TableCell>
                      <TableCell className="align-top whitespace-pre-wrap">{formatDisplayDate(record.effectivityDate)}</TableCell>
                      <TableCell className="align-top break-all">
                        {record.policyLink ? (
                          <a href={record.policyLink} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                            {record.policyLink}
                          </a>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Advocacy Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="manual-policy-ref">Policy Number, Title, or Policy ID</Label>
            <Input
              id="manual-policy-ref"
              placeholder="e.g. HRA DC 003 S2025 or 6650a1f2e3b4c5d6e7f80001"
              value={manualInput}
              onChange={(event) => setManualInput(event.target.value)}
            />
            {manualInput.trim() && !resolvedManualPolicyId ? (
              <p className="text-xs text-muted-foreground">No local match yet. You can still paste a Mongo policy ID.</p>
            ) : null}
          </div>
          <PolicyAdvocacyForm
            policyId={activePolicyId}
            editable={canEdit}
            onCancel={() => setDialogOpen(false)}
            onSaved={handleSaved}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
