const steps = ["Create", "Add team", "Send for review", "With approvers", "Published"] as const;

export function PolicyProgressStepper({ workflowState }: { workflowState?: string }) {
  const state = workflowState ?? "Draft";
  const activeIndex =
    state === "Draft"
      ? 0
      : state === "Collaborating"
        ? 1
        : state === "For Review" || state === "Under Review"
          ? 3
          : state === "Published"
            ? 4
            : state === "Approved"
              ? 3
              : 1;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2">
        {steps.map((step, index) => (
          <div key={step} className="text-center">
            <div className={`mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${index <= activeIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {index + 1}
            </div>
            <p className={`text-xs ${index <= activeIndex ? "text-foreground" : "text-muted-foreground"}`}>{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

