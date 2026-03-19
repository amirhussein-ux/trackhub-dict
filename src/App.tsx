import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.tsx";
import FirstLoginPasswordChangePage from "./pages/FirstLoginPasswordChangePage.tsx";
import DashboardLayout from "./components/DashboardLayout";
import DashboardPage from "./pages/DashboardPage";
import PolicyTrackerPage from "./pages/PolicyTrackerPage";
import PolicyDetailPage from "./pages/PolicyDetailPage";
import ActivityLogPage from "./pages/ActivityLogPage";
import PolicyTimelinePage from "./pages/PolicyTimelinePage";
import DocumentRepositoryPage from "./pages/DocumentRepositoryPage";
import ReportsPage from "./pages/ReportsPage";
import ArchivePage from "./pages/ArchivePage";
import UserManagementPage from "./pages/UserManagementPage";
import AccessRequestsPage from "./pages/AccessRequestsPage";
import SettingsPage from "./pages/SettingsPage";
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
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/first-login-password-change" element={<FirstLoginPasswordChangePage />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="policies" element={<PolicyTrackerPage />} />
            <Route path="policies/:id" element={<PolicyDetailPage />} />
            <Route path="timeline" element={<PolicyTimelinePage />} />
            <Route path="documents" element={<DocumentRepositoryPage />} />
            <Route path="archive" element={<ArchivePage />} />
            <Route path="activity" element={<ActivityLogPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="users" element={<UserManagementPage />} />
            <Route path="access-requests" element={<AccessRequestsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="profile" element={<PlaceholderPage title="Profile" description="View and edit your profile information." />} />
            <Route path="support" element={<PlaceholderPage title="Contact & Support" description="Get help and submit feedback." />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
