import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Card className="shadow-card border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <Construction className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium text-foreground">Coming Soon</p>
          <p className="text-sm text-muted-foreground">This module is under development.</p>
        </CardContent>
      </Card>
    </div>
  );
}
