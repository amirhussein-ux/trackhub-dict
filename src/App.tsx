import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import DashboardLayout from "./components/DashboardLayout";
import DashboardPage from "./pages/DashboardPage";
import PolicyTrackerPage from "./pages/PolicyTrackerPage";
import PolicyDetailPage from "./pages/PolicyDetailPage";
import ActivityLogPage from "./pages/ActivityLogPage";
import PolicyTimelinePage from "./pages/PolicyTimelinePage";
import DocumentRepositoryPage from "./pages/DocumentRepositoryPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="policies" element={<PolicyTrackerPage />} />
            <Route path="policies/:id" element={<PolicyDetailPage />} />
            <Route path="timeline" element={<PlaceholderPage title="Policy Timeline" description="Visualize policy progress across time." />} />
            <Route path="documents" element={<PlaceholderPage title="Document Repository" description="Upload and manage policy documents." />} />
            <Route path="activity" element={<ActivityLogPage />} />
            <Route path="reports" element={<PlaceholderPage title="Reports" description="Generate and export policy reports." />} />
            <Route path="users" element={<PlaceholderPage title="User Management" description="Manage user accounts and roles." />} />
            <Route path="settings" element={<PlaceholderPage title="Settings" description="Configure system preferences." />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
