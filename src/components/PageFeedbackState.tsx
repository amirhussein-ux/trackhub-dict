import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, LifeBuoy, RefreshCw } from "lucide-react";

type PageFeedbackStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
};

export function PageLoadingState({ title, description }: Pick<PageFeedbackStateProps, "title" | "description">) {
  return (
    <Card className="shadow-card border-border/50">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-4 rounded bg-muted animate-pulse" />
        <div className="h-4 rounded bg-muted animate-pulse w-5/6" />
        <div className="h-4 rounded bg-muted animate-pulse w-3/4" />
      </CardContent>
    </Card>
  );
}

export function PageErrorState({
  title,
  description,
  actionLabel = "Try Again",
  onAction,
  secondaryActionLabel = "Contact Support",
  onSecondaryAction,
}: PageFeedbackStateProps) {
  return (
    <Card className="shadow-card border-border/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        {onAction ? (
          <Button variant="hero" onClick={onAction}>
            <RefreshCw className="h-4 w-4" /> {actionLabel}
          </Button>
        ) : null}
        {onSecondaryAction ? (
          <Button variant="outline" onClick={onSecondaryAction}>
            <LifeBuoy className="h-4 w-4" /> {secondaryActionLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
