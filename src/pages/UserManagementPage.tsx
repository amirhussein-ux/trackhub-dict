import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { divisions, type Division } from "@/lib/mock-data";
import { getCurrentUser } from "@/lib/user-session";
import { canDeleteUsers, canEditUsers, canViewUserManagement } from "@/lib/access-control";
import { appendActivity } from "@/lib/records-storage";
import { apiRequest } from "@/lib/api/client";
import { ConfirmActionDialog } from "@/components/ConfirmActionDialog";
import { PageErrorState, PageLoadingState } from "@/components/PageFeedbackState";
import { ArrowUpDown, Eye, Pencil, ShieldCheck, Users } from "lucide-react";

type UserRole = "OIC Director" | "Division Chief" | "Division Member";
type UserStatus = "Active" | "Inactive" | "Suspended";

type ManagedUser = {
  id: string;
  identifier: string;
  name: string;
  email: string;
  phone: string;
  division: Division;
  position: string;
  role: UserRole;
  status: UserStatus;
  dateJoined: string;
  lastActive: string;
  activity: string[];
};

type SortKey = "name" | "email" | "position" | "division" | "role" | "status" | "lastActive";
type PendingStatusChange = {
  userId: string;
  userName: string;
  nextStatus: UserStatus;
};

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  "OIC Director": [
    "Full policy lifecycle oversight",
    "Approve user provisioning requests",
    "Access all reports and analytics",
    "Manage role assignments",
  ],
  "Division Chief": [
    "Manage division policies and members",
    "Review and update policy statuses",
    "View division-level reports",
    "Assign document access permissions",
  ],
  "Division Member": [
    "Create and update assigned policy records",
    "Upload and manage document versions",
    "View activity logs for assigned policies",
  ],
};

const statusFromApi = (status: "active" | "inactive" | "suspended"): UserStatus => {
  if (status === "active") return "Active";
  if (status === "inactive") return "Inactive";
  return "Suspended";
};

const roleFromApi = (role: string): UserRole => {
  if (role === "OIC Director") return "OIC Director";
  if (role === "Division Chief") return "Division Chief";
  return "Division Member";
};

const isDivision = (value: string): value is Division => {
  return divisions.includes(value as Division);
};

const mapApiUserToManaged = (u: {
  id?: string;
  _id?: string;
  identifier: string;
  email: string;
  name: string;
  role: string;
  division?: string;
  verified: boolean;
  firstLogin: boolean;
  status: "active" | "inactive" | "suspended";
}): ManagedUser => {
  // Backend now provides division; keep a safe fallback for legacy records.
  const derivedDivision: Division = isDivision(u.division ?? "") ? u.division : "PRAD";
  const mongoId = u.id || u._id || "";

  return {
    id: mongoId,
    identifier: u.identifier,
    name: u.name,
    email: u.email,
    phone: "",
    division: derivedDivision,
    position: "",
    role: roleFromApi(u.role),
    status: statusFromApi(u.status),
    dateJoined: u.firstLogin ? "" : "",
    lastActive: "",
    activity: [],
  };
};

function initialsOf(name: string | undefined | null): string {
  const safe = String(name ?? "").trim();
  if (!safe) return "U";

  const parts = safe.split(" ").filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "U";
}

function roleBadgeClass(role: UserRole): string {
  if (role === "OIC Director") return "bg-primary/10 text-primary border-primary/40";
  if (role === "Division Chief") return "bg-accent/10 text-accent border-accent/40";
  return "bg-secondary/10 text-secondary border-secondary/40";
}

export default function UserManagementPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentUser = getCurrentUser();

  const canAccess = canViewUserManagement(currentUser);
  const canEdit = canEditUsers(currentUser);
  const canDelete = canDeleteUsers(currentUser);

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [divisionFilter, setDivisionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<PendingStatusChange | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const apiUsers = await apiRequest<
        Array<{
          id?: string;
          _id?: string;
          identifier: string;
          email: string;
          name: string;
          role: string;
          division?: string;
          verified: boolean;
          firstLogin: boolean;
          status: "active" | "inactive" | "suspended";
        }>
      >("/users");

      setUsers(apiUsers.map(mapApiUserToManaged));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to load users right now.";
      setLoadError(message);
      toast({
        title: "Unable to load users",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!canAccess) return;

    void loadUsers();
  }, [canAccess]);

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();

    const next = users.filter((user) => {
      const matchSearch =
        needle.length === 0 ||
        user.name.toLowerCase().includes(needle) ||
        user.email.toLowerCase().includes(needle);

      const matchRole = roleFilter === "all" || user.role === roleFilter;
      const matchDivision = divisionFilter === "all" || user.division === divisionFilter;
      const matchStatus = statusFilter === "all" || user.status === statusFilter;

      return matchSearch && matchRole && matchDivision && matchStatus;
    });

    next.sort((a, b) => {
      const valueA = String(a[sortKey] ?? "").toLowerCase();
      const valueB = String(b[sortKey] ?? "").toLowerCase();
      const compare = valueA.localeCompare(valueB);
      return sortDirection === "asc" ? compare : -compare;
    });

    return next;
  }, [users, search, roleFilter, divisionFilter, statusFilter, sortKey, sortDirection]);

  const stats = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter((user) => user.status === "Active").length;
    const administratorCount = users.filter(
      (user) => user.role === "OIC Director" || user.role === "Division Chief",
    ).length;
    const suspendedUsers = users.filter((user) => user.status === "Suspended").length;

    return { totalUsers, activeUsers, administratorCount, suspendedUsers };
  }, [users]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const openView = (user: ManagedUser) => {
    setSelectedUser(user);
    setViewOpen(true);
  };

  const openEdit = (user: ManagedUser) => {
    setSelectedUser(user);
    setEditOpen(true);
  };

  const requestStatusChange = (user: ManagedUser, nextStatus: UserStatus) => {
    if (user.status === nextStatus) {
      return;
    }

    setPendingStatusChange({
      userId: user.id,
      userName: user.name,
      nextStatus,
    });
  };

  const updateUserStatus = async (userId: string, status: UserStatus) => {
    if (!canEdit) {
      toast({ title: "Access denied", description: "Only OIC Director can edit status.", variant: "destructive" });
      return;
    }

    const apiStatus = status === "Active" ? "active" : status === "Inactive" ? "inactive" : "suspended";

    try {
      await apiRequest(`/users/${userId}/status`, { method: "PATCH", body: { status: apiStatus } });

      setUsers((current) => current.map((u) => (u.id === userId ? { ...u, status } : u)));

      if (selectedUser?.id === userId) setSelectedUser((current) => (current ? { ...current, status } : current));

      appendActivity({
        user: currentUser.identifier,
        action: `Updated user status to ${status}`,
        policyTitle: "User Management",
        type: "update",
      });

      toast({ title: "User updated", description: `Status set to ${status}.` });
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Unable to update user.",
        variant: "destructive",
      });
    }
  };

  const saveUserRoleAndStatus = async (userId: string, role: UserRole, status: UserStatus) => {
    // This UI only supports editing status via backend; role editing isn't backed by an endpoint yet.
    // Keep the "role edit" dialog UX but persist status only.
    setEditOpen(false);

    await updateUserStatus(userId, status);
    // role change is ignored (backend doesn't support editing role in this patch).
    toast({ title: "Role not editable yet", description: "Only user status updates are supported at the moment." });
  };

  if (!canAccess) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card className="shadow-card border-border/50">
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              User Management is restricted to oicdirector@dict.gov.ph and divisionchief@dict.gov.ph.
            </p>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading && users.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground">Manage user accounts and statuses.</p>
        </div>
        <PageLoadingState title="Loading users" description="Please wait while we load account records." />
      </div>
    );
  }

  if (loadError && users.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground">Manage user accounts and statuses.</p>
        </div>
        <PageErrorState
          title="We couldn't load users"
          description={loadError}
          onAction={() => {
            void loadUsers();
          }}
          onSecondaryAction={() => navigate("/dashboard/support")}
        />
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground">Manage user accounts and statuses.</p>
        </div>
        <Badge variant="outline" className="text-xs">{filteredUsers.length} users shown</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="shadow-card border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Users</p>
            <p className="text-2xl font-bold text-foreground mt-1">{stats.totalUsers}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active Users</p>
            <p className="text-2xl font-bold text-accent mt-1">{stats.activeUsers}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Administrator Count</p>
            <p className="text-2xl font-bold text-primary mt-1">{stats.administratorCount}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Suspended Users</p>
            <p className="text-2xl font-bold text-destructive mt-1">{stats.suspendedUsers}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card border-border/50">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <Input
              placeholder="Search by name or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="xl:col-span-2"
            />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="OIC Director">OIC Director</SelectItem>
                <SelectItem value="Division Chief">Division Chief</SelectItem>
                <SelectItem value="Division Member">Division Member</SelectItem>
              </SelectContent>
            </Select>
            <Select value={divisionFilter} onValueChange={setDivisionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Division" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Divisions</SelectItem>
                {divisions.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card border-border/50 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>
                  <button className="inline-flex items-center gap-1" onClick={() => toggleSort("name")}>
                    Name <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </TableHead>
                <TableHead>
                  <button className="inline-flex items-center gap-1" onClick={() => toggleSort("email")}>
                    Email <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </TableHead>
                <TableHead>Division</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <button className="inline-flex items-center gap-1" onClick={() => toggleSort("lastActive")}>
                    Last Active <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No users match the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id || user.identifier || user.email}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className={`h-9 w-9 ${roleBadgeClass(user.role)}`}>
<AvatarFallback>{initialsOf(user.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.identifier}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{user.email}</TableCell>
                    <TableCell className="text-sm">{user.division}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={roleBadgeClass(user.role)}>{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.status}
                        onValueChange={(value: UserStatus) => requestStatusChange(user, value)}
                        disabled={!canEdit}
                      >
                        <SelectTrigger className="h-8 w-[128px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                          <SelectItem value="Suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.lastActive || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openView(user)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(user)} disabled={!canEdit}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {/* Delete not supported in backend in this patch */}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" disabled>
                          <Users className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>Permissions and account metadata.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><span className="font-medium">Name:</span> <span className="text-muted-foreground">{selectedUser.name}</span></div>
                <div><span className="font-medium">Email:</span> <span className="text-muted-foreground">{selectedUser.email}</span></div>
                <div><span className="font-medium">Division:</span> <span className="text-muted-foreground">{selectedUser.division}</span></div>
                <div><span className="font-medium">Role:</span> <span className="text-muted-foreground">{selectedUser.role}</span></div>
                <div><span className="font-medium">Status:</span> <span className="text-muted-foreground">{selectedUser.status}</span></div>
                <div><span className="font-medium">Last Active:</span> <span className="text-muted-foreground">{selectedUser.lastActive || "—"}</span></div>
              </div>

              <div>
                <p className="font-medium mb-1.5">Permissions</p>
                <div className="space-y-1.5">
                  {ROLE_PERMISSIONS[selectedUser.role].map((permission, idx) => (
                    <div
                      key={`${permission}-${idx}`}
                      className="flex items-start gap-2 rounded-md border border-border/60 p-2 bg-muted/20"
                    >
                      <ShieldCheck className="h-4 w-4 text-primary mt-0.5" />
                      <span className="text-muted-foreground">{permission}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user status (role editing not backed by API in this patch).</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-3 text-sm">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={selectedUser.status}
                  onValueChange={(value: UserStatus) => setSelectedUser((current) => (current ? { ...current, status: value } : current))}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              variant="hero"
              disabled={!selectedUser || !canEdit}
              onClick={() => {
                if (!selectedUser) return;
                void saveUserRoleAndStatus(selectedUser.id, selectedUser.role, selectedUser.status);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    <ConfirmActionDialog
      open={pendingStatusChange !== null}
      onOpenChange={(open) => {
        if (!open) {
          setPendingStatusChange(null);
        }
      }}
      title="Confirm status change"
      description={
        pendingStatusChange
          ? `Change ${pendingStatusChange.userName}'s account status to ${pendingStatusChange.nextStatus}? This will take effect immediately.`
          : ""
      }
      confirmLabel="Apply Change"
      onConfirm={async () => {
        if (!pendingStatusChange) {
          return;
        }

        await updateUserStatus(pendingStatusChange.userId, pendingStatusChange.nextStatus);
        setPendingStatusChange(null);
      }}
    />
    </>
  );
}
