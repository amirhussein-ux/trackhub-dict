import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, LifeBuoy, RefreshCw } from "lucide-react";
import React from "react";

type AppErrorBoundaryProps = {
  children: React.ReactNode;
  resetKey?: string;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

class AppErrorBoundaryInner extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Frontend render failure caught by error boundary:", error);
  }

  componentDidUpdate(prevProps: AppErrorBoundaryProps) {
    if (this.props.resetKey && this.props.resetKey !== prevProps.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-xl shadow-card border-border/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <CardTitle>Something went wrong</CardTitle>
                <CardDescription>This screen ran into a problem. You can try again or refresh the page.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="hero" onClick={() => this.setState({ hasError: false })}>
              <RefreshCw className="h-4 w-4" /> Try Again
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
            <Button variant="outline" onClick={() => (window.location.href = "/dashboard/support")}>
              <LifeBuoy className="h-4 w-4" /> Contact Support
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
}

export function AppErrorBoundary(props: AppErrorBoundaryProps) {
  return <AppErrorBoundaryInner {...props} />;
}
