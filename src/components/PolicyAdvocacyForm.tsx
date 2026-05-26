import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getAdvocacy, upsertAdvocacy, type PolicyAdvocacyPayload, type PolicyAdvocacyRecord } from "@/lib/api/advocacyService";

type PolicyAdvocacyFormProps = {
  policyId: string;
  editable: boolean;
  onCancel?: () => void;
  disableSave?: boolean;
  disableSaveMessage?: string;
  onSaved?: (record: PolicyAdvocacyRecord) => void;
};

type FormState = {
  dateSigned: string;
  onarFiledDate: string;
  officialGazetteDate: string;
  newspaperDate: string;
  newspaperName: string;
  effectivityClause: string;
  effectivityDate: string;
  policyLink: string;
};

const emptyForm: FormState = {
  dateSigned: "",
  onarFiledDate: "",
  officialGazetteDate: "",
  newspaperDate: "",
  newspaperName: "",
  effectivityClause: "",
  effectivityDate: "",
  policyLink: "",
};

function isoToDateInput(value?: string): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function dateInputToIso(value: string): string {
  if (!value) return "";
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function valueOrDash(value: string): string {
  return value.trim() ? value : "-";
}

function isMongoObjectId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value.trim());
}

export default function PolicyAdvocacyForm({
  policyId,
  editable,
  onCancel,
  disableSave = false,
  disableSaveMessage,
  onSaved,
}: PolicyAdvocacyFormProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [record, setRecord] = useState<PolicyAdvocacyRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const normalizedPolicyId = policyId.trim();

    if (!normalizedPolicyId || !isMongoObjectId(normalizedPolicyId)) {
      setForm(emptyForm);
      setRecord(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const advocacy = await getAdvocacy(normalizedPolicyId);
        if (cancelled) return;

        setRecord(Object.keys(advocacy).length === 0 ? null : advocacy);
        setForm({
          dateSigned: isoToDateInput(advocacy.dateSigned),
          onarFiledDate: isoToDateInput(advocacy.onarFiledDate),
          officialGazetteDate: isoToDateInput(advocacy.officialGazetteDate),
          newspaperDate: isoToDateInput(advocacy.newspaperDate),
          newspaperName: advocacy.newspaperName ?? "",
          effectivityClause: advocacy.effectivityClause ?? "",
          effectivityDate: isoToDateInput(advocacy.effectivityDate),
          policyLink: advocacy.policyLink ?? "",
        });
      } catch (error) {
        if (!cancelled) {
          toast({
            title: "Unable to load advocacy details",
            description: error instanceof Error ? error.message : "Failed to load advocacy details.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [policyId, toast]);

  const isCompletelyEmpty = useMemo(() => {
    return Object.values(form).every((value) => value.trim() === "");
  }, [form]);

  const onChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = async () => {
    if (disableSave) {
      toast({
        title: "Cannot save yet",
        description: disableSaveMessage ?? "Please resolve policy ID first.",
        variant: "destructive",
      });
      return;
    }

    if (!policyId.trim()) {
      toast({
        title: "Policy ID required",
        description: "Select a policy or enter a policy ID before saving advocacy details.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload: PolicyAdvocacyPayload = {
        dateSigned: dateInputToIso(form.dateSigned),
        onarFiledDate: dateInputToIso(form.onarFiledDate),
        officialGazetteDate: dateInputToIso(form.officialGazetteDate),
        newspaperDate: dateInputToIso(form.newspaperDate),
        newspaperName: form.newspaperName,
        effectivityClause: form.effectivityClause,
        effectivityDate: dateInputToIso(form.effectivityDate),
        policyLink: form.policyLink,
      };

      const saved = await upsertAdvocacy(policyId, payload);
      setRecord(saved);
      toast({ title: "Advocacy details saved." });
      onSaved?.(saved);
    } catch (error) {
      toast({
        title: "Unable to save advocacy details",
        description: error instanceof Error ? error.message : "Failed to save advocacy details.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-card border-border/50">
        <CardContent className="pt-6 text-sm text-muted-foreground">Loading advocacy details...</CardContent>
      </Card>
    );
  }

  if (!editable) {
    if (isCompletelyEmpty) {
      return (
        <Card className="shadow-card border-border/50">
          <CardContent className="pt-6 text-sm text-muted-foreground">No advocacy details have been recorded yet.</CardContent>
        </Card>
      );
    }

    return (
      <Card className="shadow-card border-border/50">
        <CardHeader><CardTitle className="text-sm">Advocacy Details</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><p className="text-xs text-muted-foreground">Date Signed</p><p className="text-sm font-medium">{valueOrDash(form.dateSigned)}</p></div>
            <div><p className="text-xs text-muted-foreground">ONAR Filing Date</p><p className="text-sm font-medium">{valueOrDash(form.onarFiledDate)}</p></div>
            <div><p className="text-xs text-muted-foreground">Official Gazette Date</p><p className="text-sm font-medium">{valueOrDash(form.officialGazetteDate)}</p></div>
            <div><p className="text-xs text-muted-foreground">Newspaper Publication Date</p><p className="text-sm font-medium">{valueOrDash(form.newspaperDate)}</p></div>
            <div><p className="text-xs text-muted-foreground">Newspaper Name</p><p className="text-sm font-medium">{valueOrDash(form.newspaperName)}</p></div>
            <div><p className="text-xs text-muted-foreground">Effectivity Date</p><p className="text-sm font-medium">{valueOrDash(form.effectivityDate)}</p></div>
            <div className="md:col-span-2"><p className="text-xs text-muted-foreground">Effectivity Clause</p><p className="text-sm font-medium whitespace-pre-wrap">{valueOrDash(form.effectivityClause)}</p></div>
            <div className="md:col-span-2"><p className="text-xs text-muted-foreground">Policy Link (URL)</p><p className="text-sm font-medium break-all">{valueOrDash(form.policyLink)}</p></div>
          </div>
          {record?.lastUpdatedBy || record?.updatedAt ? (
            <p className="text-xs text-muted-foreground mt-4">
              Last updated by {record?.lastUpdatedBy ?? "-"}
              {record?.updatedAt ? ` on ${new Date(record.updatedAt).toLocaleString()}` : ""}
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card border-border/50">
      <CardHeader><CardTitle className="text-sm">Advocacy Details</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dateSigned">Date Signed</Label>
            <Input id="dateSigned" type="date" value={form.dateSigned} onChange={(e) => onChange("dateSigned", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="onarFiledDate">ONAR Filing Date</Label>
            <Input id="onarFiledDate" type="date" value={form.onarFiledDate} onChange={(e) => onChange("onarFiledDate", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="officialGazetteDate">Official Gazette Date</Label>
            <Input id="officialGazetteDate" type="date" value={form.officialGazetteDate} onChange={(e) => onChange("officialGazetteDate", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newspaperDate">Newspaper Publication Date</Label>
            <Input id="newspaperDate" type="date" value={form.newspaperDate} onChange={(e) => onChange("newspaperDate", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newspaperName">Newspaper Name</Label>
            <Input id="newspaperName" value={form.newspaperName} onChange={(e) => onChange("newspaperName", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="effectivityDate">Effectivity Date</Label>
            <Input id="effectivityDate" type="date" value={form.effectivityDate} onChange={(e) => onChange("effectivityDate", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="effectivityClause">Effectivity Clause</Label>
            <Textarea id="effectivityClause" rows={4} value={form.effectivityClause} onChange={(e) => onChange("effectivityClause", e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="policyLink">Policy Link (URL)</Label>
            <Input id="policyLink" value={form.policyLink} onChange={(e) => onChange("policyLink", e.target.value)} placeholder="https://..." />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            {record?.lastUpdatedBy || record?.updatedAt ? (
              <p className="text-xs text-muted-foreground">
                Last updated by {record?.lastUpdatedBy ?? "-"}
                {record?.updatedAt ? ` on ${new Date(record.updatedAt).toLocaleString()}` : ""}
              </p>
            ) : null}
            {disableSave && disableSaveMessage ? (
              <p className="text-xs text-destructive mt-1">{disableSaveMessage}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {onCancel ? <Button variant="outline" onClick={onCancel}>Cancel</Button> : null}
            <Button onClick={() => void onSave()} disabled={isSaving || disableSave}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
