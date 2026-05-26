import type { Policy } from "@/lib/mock-data";

export function ApprovalChainProgress({ policy }: { policy: Policy }) {
  const entries = policy.approvalChain ?? [];
  if (entries.length === 0) return null;

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold">Approval progress</h3>
      <div className="space-y-2">
        {entries.map((entry, index) => {
          const approved = entry.approved;
          const when = entry.approvedAt ? new Date(entry.approvedAt).toLocaleDateString() : "";
          return (
            <p key={`${entry.approverEmail}-${index}`} className="text-sm">
              {approved ? "[x]" : "[ ]"} {entry.approverEmail} {approved ? `Approved - ${when}` : "Pending"}
            </p>
          );
        })}
      </div>
    </div>
  );
}
