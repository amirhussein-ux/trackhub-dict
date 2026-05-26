import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCurrentUser } from "@/lib/user-session";
import { canViewAdvocacy } from "@/lib/access-control";
import PolicyAdvocacyForm from "@/components/PolicyAdvocacyForm";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api/client";

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
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
