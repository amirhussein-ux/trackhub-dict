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
import { useState } from "react";
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
import { logoutUser } from "@/lib/auth-workflows";
import { clearCurrentUser, getCurrentUser } from "@/lib/user-session";
import { canViewReports, canViewUserManagement } from "@/lib/access-control";
import { ConfirmActionDialog } from "@/components/ConfirmActionDialog";
import Logo from "@/assets/trackhublogo.png";


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
  const { state, setOpen } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const isActive = (path: string) => location.pathname === path;
  const visibleAdminNav = adminNav.filter((item) => {
    if (item.title === "Reports") return canViewReports(currentUser);
    if (item.title === "User Management") return canViewUserManagement(currentUser);
    return true;
  });


  return (
    <>
    <Sidebar
        collapsible="icon"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="
          w-72
          border-r-0
          bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#0f172a]
          backdrop-blur-xl
          transition-all duration-300 ease-in-out
          ">
      <SidebarHeader className={`p-4 bg-white/5 backdrop-blur-xl border-r border-white/10 ${collapsed ? "flex justify-center" : ""}`}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5"}`}>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring rounded"
            aria-label="Go to dashboard"
            title="Go to dashboard"
          >
            <img
              src={Logo}
              alt="DICT"
              className="h-4 w-4 "
            />
          </button>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="font-bold text-sm tracking-widest text-[#12254D]">TRACKHUB</p>
              <p className="text-[10px] text-[#12254D] leading-tight ">DICT Policy Tracker</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-white/5 backdrop-blur-xl border-r border-white/10">
        <SidebarGroup>
          <SidebarGroupLabel className="text-blue-900 text-[10px] uppercase tracking-wider">
            {!collapsed && "Main"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      end
                      className={`
                        flex items-center ${collapsed ? "justify-center" : "gap-2"}
                        px-4 py-3 rounded-full
                        transition-all duration-200 ease-in-out

                        ${
                          isActive(item.url)
                            ? "bg-blue-400 text-white shadow-md"
                            : "text-[#12254D] hover:bg-blue-900/50 hover:text-white"
                        }

                        hover:scale-[1.02] active:scale-[0.98]
                      `}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-blue-900 text-[10px] uppercase tracking-wider">
            {!collapsed && "Admin"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleAdminNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      end
                      className={`
                        flex items-center ${collapsed ? "justify-center" : "gap-2"}
                        px-4 py-3 rounded-full
                        transition-all duration-200 ease-in-out

                        ${
                          isActive(item.url)
                            ? "bg-blue-400 text-white shadow-md"
                            : "text-[#12254D] hover:bg-blue-900/50 hover:text-white"
                        }

                        hover:scale-[1.02] active:scale-[0.98]
                      `}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 bg-white/5 backdrop-blur-xl border-r border-white/10">
          <Button
            variant="ghost"
            className={`
              w-full flex items-center ${collapsed ? "justify-center" : "gap-2"}
              px-4 py-3 rounded-full
              text-[#12254D]

              transition-all duration-200 ease-in-out

              hover:bg-blue-900/50 hover:text-white
              hover:scale-[1.02] active:scale-[0.98]
            `}
            onClick={() => {
              setLogoutDialogOpen(true);
            }}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>Log Out</span>}
          </Button>
      </SidebarFooter>
    </Sidebar>
    <ConfirmActionDialog
      open={logoutDialogOpen}
      onOpenChange={setLogoutDialogOpen}
      title="Log out of TrackHub?"
      description="Your current session will end and you will be returned to the landing page."
      confirmLabel="Log Out"
      confirmVariant="destructive"
      onConfirm={async () => {
        await logoutUser();
        clearCurrentUser();
        navigate("/");
      }}
    />
    </>
  );
}
