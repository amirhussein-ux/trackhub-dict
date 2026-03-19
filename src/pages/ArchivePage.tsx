import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Archive, FileText, FolderOpen } from "lucide-react";
import { loadPoliciesFromStorage, savePoliciesToStorage } from "@/lib/policy-storage";
import { loadDocumentsFromStorage, saveDocumentsToStorage, subscribeToDataUpdates } from "@/lib/records-storage";
import { getCurrentUser } from "@/lib/user-session";

export default function ArchivePage() {
  const currentUser = getCurrentUser();
  const [policies, setPolicies] = useState(() => loadPoliciesFromStorage());
  const [documents, setDocuments] = useState(() => loadDocumentsFromStorage());

  useEffect(() => {
    return subscribeToDataUpdates(() => {
      setPolicies(loadPoliciesFromStorage());
      setDocuments(loadDocumentsFromStorage());
    });
  }, []);

  const archivedPolicies = useMemo(() => policies.filter((policy) => (policy as { archived?: boolean }).archived), [policies]);
  const archivedDocuments = useMemo(() => documents.filter((doc) => doc.status === "Archived"), [documents]);

  const handleRestorePolicy = (policyId: string, policyNumber: string) => {
    const today = new Date().toISOString().slice(0, 10);

    const nextPolicies = policies.map((policy) => {
      if (policy.id !== policyId && policy.policyNumber !== policyNumber) {
        return policy;
      }

      const note = `${today} | Restored from archive`;
      return {
        ...policy,
        archived: false,
        lastUpdated: today,
        lastEditedBy: currentUser.identifier,
        remarks: `${policy.remarks?.trim() ? `${policy.remarks}\n` : ""}${note}`,
      };
    });

    const nextDocuments = documents.map((doc) => {
      if (doc.policyId !== policyId && doc.policyNumber !== policyNumber) {
        return doc;
      }

      return {
        ...doc,
        status: "Active" as const,
        lastEdited: today,
        owner: currentUser.identifier,
        remarks: `${today} | Restored with policy ${policyNumber}`,
      };
    });

    savePoliciesToStorage(nextPolicies);
    saveDocumentsToStorage(nextDocuments);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Archive</h1>
        <p className="text-sm text-muted-foreground">Archived policies and their documents are retained here for records management.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="shadow-card border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Archive className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{archivedPolicies.length}</p>
              <p className="text-xs text-muted-foreground">Archived Policies</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FolderOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{archivedDocuments.length}</p>
              <p className="text-xs text-muted-foreground">Archived Documents</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="text-sm">Archived Policies</CardTitle>
        </CardHeader>
        <CardContent>
          {archivedPolicies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No archived policies.</p>
          ) : (
            <div className="space-y-3">
              {archivedPolicies.map((policy) => (
                <div key={policy.id} className="rounded-lg border border-border/50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{policy.policyNumber} - {policy.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{policy.division} • Last updated {policy.lastUpdated}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="on-hold">Archived</Badge>
                      <Button size="sm" variant="outline" onClick={() => handleRestorePolicy(policy.id, policy.policyNumber)}>
                        Restore
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="text-sm">Archived Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {archivedDocuments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No archived documents.</p>
          ) : (
            <div className="space-y-3">
              {archivedDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.policyNumber} • v{doc.version} • {doc.lastEdited}</p>
                    </div>
                  </div>
                  <Badge variant="outline">Archived</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
