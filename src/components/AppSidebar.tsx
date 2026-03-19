import {
  LayoutDashboard,
  FileText,
  Clock,
  FolderOpen,
  Activity,
  UserCheck,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Archive,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { clearCurrentUser, getCurrentUser } from "@/lib/user-session";
import { canViewReports, canViewUserManagement } from "@/lib/access-control";
import dictLogo from "@/assets/Artboard 4.png";

const mainNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Policy Tracker", url: "/dashboard/policies", icon: FileText },
  { title: "Policy Timeline", url: "/dashboard/timeline", icon: Clock },
  { title: "Documents", url: "/dashboard/documents", icon: FolderOpen },
  { title: "Archive", url: "/dashboard/archive", icon: Archive },
  { title: "Activity Logs", url: "/dashboard/activity", icon: Activity },
  { title: "Access Requests", url: "/dashboard/access-requests", icon: UserCheck },
];

const adminNav = [
  { title: "Reports", url: "/dashboard/reports", icon: BarChart3 },
  { title: "User Management", url: "/dashboard/users", icon: Users },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const isActive = (path: string) => location.pathname === path;
  const visibleAdminNav = adminNav.filter((item) => {
    if (item.title === "Reports") return canViewReports(currentUser);
    if (item.title === "User Management") return canViewUserManagement(currentUser);
    return true;
  });

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className={`p-4 ${collapsed ? "flex justify-center" : ""}`}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5"}`}>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring rounded"
            aria-label="Go to dashboard"
            title="Go to dashboard"
          >
            <img
              src={dictLogo}
              alt="DICT"
              className={`flex-shrink-0 brightness-0 invert opacity-90 rounded ${collapsed ? "h-4 w-4" : "h-9 w-9"}`}
            />
          </button>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="font-bold text-sm text-sidebar-foreground leading-tight">TrackHub</p>
              <p className="text-[10px] text-sidebar-foreground/50 leading-tight">DICT Policy Tracker</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-wider">
            {!collapsed && "Main"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="h-4 w-4 mr-2 flex-shrink-0" />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-wider">
            {!collapsed && "Admin"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleAdminNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="h-4 w-4 mr-2 flex-shrink-0" />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <Separator className="mb-3 bg-sidebar-border" />
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 h-9"
          onClick={() => {
            clearCurrentUser();
            navigate("/");
          }}
        >
          <LogOut className="h-4 w-4 mr-2 flex-shrink-0" />
          {!collapsed && <span>Log Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
