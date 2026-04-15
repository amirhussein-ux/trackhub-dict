import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useNavigate } from "react-router-dom";
import { Bell, Search, LogOut, User, Settings, HelpCircle, CheckCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { loadNotificationsFromStorage, saveNotificationsToStorage, subscribeToDataUpdates } from "@/lib/records-storage";
import { getCurrentUser } from "@/lib/user-session";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [notifications, setNotifications] = useState(() => loadNotificationsFromStorage());
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    return subscribeToDataUpdates(() => {
      setNotifications(loadNotificationsFromStorage());
    });
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      saveNotificationsToStorage(next);
      return next;
    });
  };

  const groupByDate = (items: typeof notifications) => {
    const today = "2025-03-08";
    const yesterday = "2025-03-07";
    const groups: Record<string, typeof items> = { Today: [], Yesterday: [], Earlier: [] };
    items.forEach((n) => {
      const date = n.timestamp.split(" ")[0];
      if (date === today) groups.Today.push(n);
      else if (date === yesterday) groups.Yesterday.push(n);
      else groups.Earlier.push(n);
    });
    return groups;
  };

  const grouped = groupByDate(notifications);

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Nav */}
          <header className="h-14 flex items-center justify-between border-b border-border bg-[hsl(220,20%,97%)] text-primary-foreground px-4 sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black" />
                <Input placeholder="Search by ID, title, division, status..." className="pl-9 h-9 w-80 bg-background/95 text-foreground" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Notification Panel */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-4 w-4 text-[#12254D]" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[380px] p-0">
                  <SheetHeader className="p-4 pb-2 border-b border-border">
                    <div className="flex items-center justify-between">
                      <SheetTitle className="text-base">Notifications</SheetTitle>
                      {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
                          <CheckCheck className="h-3 w-3 mr-1" /> Mark all read
                        </Button>
                      )}
                    </div>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-80px)]">
                    <div className="p-2">
                      {Object.entries(grouped).map(([label, items]) =>
                        items.length > 0 ? (
                          <div key={label} className="mb-4">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1.5">{label}</p>
                            {items.map((n) => (
                              <button
                                key={n.id}
                                className={`w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors flex items-start gap-3 ${!n.read ? "bg-primary/5" : ""}`}
                                onClick={() => {
                                  const isAccessRequest = n.changeType.startsWith("ACCESS_REQUEST|");
                                  if (isAccessRequest) {
                                    navigate("/dashboard/access-requests");
                                    return;
                                  }

                                  setNotifications((prev) => {
                                    const next = prev.map((x) => (x.id === n.id ? { ...x, read: true } : x));
                                    saveNotificationsToStorage(next);
                                    return next;
                                  });
                                  navigate(`/dashboard/policies/${n.policyId}`);
                                }}
                              >
                                {!n.read && <div className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                                <div className={`min-w-0 ${n.read ? "ml-5" : ""}`}>
                                  <p className="text-sm font-medium text-foreground truncate">{n.policyTitle}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">{n.changeType}</p>
                                  <p className="text-[10px] text-muted-foreground/60 mt-1">{n.timestamp.split(" ")[1]}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : null
                      )}
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>

              {/* User Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <div className="h-8 w-8 rounded-full hero-gradient flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-foreground">{currentUser.identifier}</p>
                    <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/dashboard/profile")}>
                    <User className="h-4 w-4 mr-2" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
                    <Settings className="h-4 w-4 mr-2" /> Account & Preferences
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard/support")}>
                    <HelpCircle className="h-4 w-4 mr-2" /> Contact & Support
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/")} className="text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 bg-background overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
