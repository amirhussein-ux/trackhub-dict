import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockActivities } from "@/lib/mock-data";
import { FileText, Upload, RefreshCw, Download, Activity as ActivityIcon } from "lucide-react";

const iconMap: Record<string, typeof FileText> = {
  create: FileText,
  upload: Upload,
  update: RefreshCw,
  download: Download,
  status: ActivityIcon,
};

export default function ActivityLogPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Activity Logs</h1>
        <p className="text-sm text-muted-foreground">Complete audit trail of all system actions.</p>
      </div>
      <Card className="shadow-card border-border/50">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {mockActivities.map((a) => {
              const Icon = iconMap[a.type] || ActivityIcon;
              return (
                <div key={a.id} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{a.user}</span>{" "}
                      <span className="text-muted-foreground">{a.action}</span>
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{a.policyTitle}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{a.timestamp}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
