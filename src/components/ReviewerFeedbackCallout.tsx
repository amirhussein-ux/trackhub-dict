type ReviewerFeedbackCalloutProps = {
  variant: "warning" | "danger";
  timestamp: string;
  feedback: string;
  reviewer: string;
};

export function ReviewerFeedbackCallout({ variant, timestamp, feedback, reviewer }: ReviewerFeedbackCalloutProps) {
  const tone = variant === "danger" ? "border-destructive/50 bg-destructive/10" : "border-amber-500/50 bg-amber-50";
  return (
    <div className={`rounded-lg border p-4 ${tone}`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">Reviewer feedback</p>
        <p className="text-xs text-muted-foreground">{timestamp}</p>
      </div>
      <p className="text-sm">"{feedback}"</p>
      <p className="mt-1 text-xs text-muted-foreground">- {reviewer}</p>
    </div>
  );
}

