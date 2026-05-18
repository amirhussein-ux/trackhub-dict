import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import OnboardingPage from "./pages/OnboardingPage";
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
import SupportPage from "./pages/SupportPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";
import { apiRequest } from "./lib/api/client";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { setCurrentUser } from "./lib/user-session";

import { useEffect } from "react";

const queryClient = new QueryClient();

function SessionEagerValidator(): null {
  const location = useLocation();

  // Restore session on app mount - directly call API without error redirect handler
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const response = await fetch("/api/auth/me", { 
          method: "GET",
          credentials: "include" // Include httpOnly cookies
        });
        
        if (!response.ok) {
          // 401 is expected if session expired; just skip restoration
          return;
        }

        const data = (await response.json()) as {
          user?: {
            identifier: string;
            email: string;
            name: string;
            role: "OIC Director" | "Division Chief" | "Division Member";
            division?: "PRAD" | "PPDD" | "PPMED" | "PPMCAD";
          };
        };

        if (data.user) {
          setCurrentUser(data.user);
        }
      } catch {
        // Network error; user remains as guest
      }
    };
    
    void restoreSession();
  }, []);

  // Validate session on route changes
  useEffect(() => {
    const path = location.pathname;

    // Avoid redirect loops / rate limiting on auth & public pages.
    const isPublicRoute =
      path === "/" ||
      path === "/landing" ||
      path === "/login" ||
      path === "/forgot-password" ||
      path === "/first-login-password-change" ||
      path.startsWith("/support") ||
      path.startsWith("/profile") ||
      path.startsWith("/dashboard/support") ||
      path.startsWith("/dashboard/profile");

    if (isPublicRoute) {
      return;
    }

    void apiRequest("/auth/me", { method: "GET" }).catch(() => {
      // apiRequest already handles 401 redirect; ignore other errors.
    });
  }, [location.pathname]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppErrorBoundary>
        <BrowserRouter>
          <SessionEagerValidator />
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<OnboardingPage />} />
            <Route path="/landing" element={<LandingPage />} />
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
              <Route path="support" element={<SupportPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AppErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
