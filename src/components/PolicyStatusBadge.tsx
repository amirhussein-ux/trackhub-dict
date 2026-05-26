import { Badge } from "@/components/ui/badge";

type StatusVariant = "on-progress" | "under-review" | "approved" | "published" | "on-hold";

const STATUS_MAP: Record<string, { label: string; variant: StatusVariant }> = {
  Draft: { label: "In progress", variant: "on-progress" },
  Collaborating: { label: "In progress", variant: "on-progress" },
  "Returned for Revision": { label: "In progress", variant: "on-progress" },
  "For Review": { label: "Under review", variant: "under-review" },
  "Under Review": { label: "Under review", variant: "under-review" },
  Approved: { label: "Approved", variant: "approved" },
  Published: { label: "Published", variant: "published" },
  Rejected: { label: "On hold", variant: "on-hold" },
  Archived: { label: "On hold", variant: "on-hold" },
};

export function PolicyStatusBadge({ workflowState }: { workflowState?: string }) {
  const mapped = STATUS_MAP[workflowState ?? "Draft"] ?? STATUS_MAP.Draft;
  return <Badge variant={mapped.variant}>{mapped.label}</Badge>;
}

