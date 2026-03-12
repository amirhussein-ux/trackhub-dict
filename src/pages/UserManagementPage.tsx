import { useMemo, useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { divisions, type Division } from "@/lib/mock-data";
import { getCurrentUser } from "@/lib/user-session";
import { ArrowUpDown, Eye, Pencil, ShieldCheck, Trash2, Users } from "lucide-react";

type UserRole = "Director" | "Division Chief" | "Division Member";
type UserStatus = "Active" | "Inactive" | "Suspended";

type ManagedUser = {
  id: string;
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

const USER_MANAGEMENT_ALLOWED_EMAILS = new Set(["oicdirector@dict.gov.ph", "divisionchief@dict.gov.ph"]);

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  Director: [
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

const MOCK_USERS: ManagedUser[] = [
  {
    id: "USR-001",
    name: "OIC Director Sanchez",
    email: "oicdirector@dict.gov.ph",
    phone: "+63 917 100 0001",
    division: "PRAD",
    position: "Officer-in-Charge Director",
    role: "Director",
    status: "Active",
    dateJoined: "2024-01-12",
    lastActive: "2026-03-12 08:20",
    activity: ["Approved 2 policy updates", "Reviewed archive restoration logs"],
  },
  {
    id: "USR-002",
    name: "Division Chief Ramos",
    email: "divisionchief@dict.gov.ph",
    phone: "+63 917 100 0002",
    division: "PPDD",
    position: "Division Chief",
    role: "Division Chief",
    status: "Active",
    dateJoined: "2024-02-10",
    lastActive: "2026-03-12 07:58",
    activity: ["Granted policy access to 3 users", "Updated status transitions"],
  },
  {
    id: "USR-003",
    name: "Juan Dela Cruz",
    email: "juan.delacruz@dict.gov.ph",
    phone: "+63 917 110 0011",
    division: "PRAD",
    position: "Policy Analyst",
    role: "Division Member",
    status: "Active",
    dateJoined: "2025-01-08",
    lastActive: "2026-03-11 17:45",
    activity: ["Uploaded RA memo v2", "Edited policy remarks"],
  },
  {
    id: "USR-004",
    name: "Mia Cortez",
    email: "mia.cortez@dict.gov.ph",
    phone: "+63 917 110 0012",
    division: "PRAD",
    position: "Planning Officer",
    role: "Division Member",
    status: "Inactive",
    dateJoined: "2025-02-19",
    lastActive: "2026-02-27 10:22",
    activity: ["Prepared policy draft annex", "Reviewed publication schedule"],
  },
  {
    id: "USR-005",
    name: "Maria Santos",
    email: "maria.santos@dict.gov.ph",
    phone: "+63 917 120 0021",
    division: "PPDD",
    position: "Policy Specialist",
    role: "Division Member",
    status: "Active",
    dateJoined: "2025-01-15",
    lastActive: "2026-03-12 08:04",
    activity: ["Archived outdated repository document", "Updated notification recipients"],
  },
  {
    id: "USR-006",
    name: "Leo Garcia",
    email: "leo.garcia@dict.gov.ph",
    phone: "+63 917 120 0022",
    division: "PPDD",
    position: "Records Coordinator",
    role: "Division Member",
    status: "Suspended",
    dateJoined: "2025-03-02",
    lastActive: "2026-02-15 15:00",
    activity: ["Awaiting account reactivation review"],
  },
  {
    id: "USR-007",
    name: "Pedro Reyes",
    email: "pedro.reyes@dict.gov.ph",
    phone: "+63 917 130 0031",
    division: "PPMED",
    position: "Implementation Officer",
    role: "Division Member",
    status: "Active",
    dateJoined: "2025-02-03",
    lastActive: "2026-03-11 16:40",
    activity: ["Uploaded EO policy attachment", "Updated effectivity date"],
  },
  {
    id: "USR-008",
    name: "Ella Ramos",
    email: "ella.ramos@dict.gov.ph",
    phone: "+63 917 130 0032",
    division: "PPMED",
    position: "Monitoring Officer",
    role: "Division Member",
    status: "Active",
    dateJoined: "2025-01-25",
    lastActive: "2026-03-11 14:12",
    activity: ["Reviewed timeline milestones", "Logged status movement"],
  },
  {
    id: "USR-009",
    name: "Ana Lim",
    email: "ana.lim@dict.gov.ph",
    phone: "+63 917 140 0041",
    division: "PPMCAD",
    position: "Compliance Officer",
    role: "Division Member",
    status: "Active",
    dateJoined: "2025-01-30",
    lastActive: "2026-03-12 07:21",
    activity: ["Shared document access with legal unit", "Updated policy references"],
  },
  {
    id: "USR-010",
    name: "Noel Bautista",
    email: "noel.bautista@dict.gov.ph",
    phone: "+63 917 140 0042",
    division: "PPMCAD",
    position: "Policy Writer",
    role: "Division Member",
    status: "Inactive",
    dateJoined: "2025-02-11",
    lastActive: "2026-02-20 11:33",
    activity: ["Submitted draft for chief review"],
  },
  {
    id: "USR-011",
    name: "Carla Mendoza",
    email: "carla.mendoza@dict.gov.ph",
    phone: "+63 917 130 0033",
    division: "PPMED",
    position: "Division Chief - PPMED",
    role: "Division Chief",
    status: "Active",
    dateJoined: "2024-11-05",
    lastActive: "2026-03-12 06:51",
    activity: ["Approved 4 submissions", "Restored archived policy for audit"],
  },
  {
    id: "USR-012",
    name: "Rico Navarro",
    email: "rico.navarro@dict.gov.ph",
    phone: "+63 917 120 0023",
    division: "PPDD",
    position: "Administrative Assistant",
    role: "Division Member",
    status: "Suspended",
    dateJoined: "2025-04-10",
    lastActive: "2026-01-14 09:10",
    activity: ["Access temporarily suspended pending verification"],
  },
];

function initialsOf(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "U";
}

function roleBadgeClass(role: UserRole): string {
  if (role === "Director") return "bg-primary/10 text-primary border-primary/40";
  if (role === "Division Chief") return "bg-accent/10 text-accent border-accent/40";
  return "bg-secondary/10 text-secondary border-secondary/40";
}

function statusBadgeClass(status: UserStatus): string {
  if (status === "Active") return "bg-accent/10 text-accent border-accent/40";
  if (status === "Suspended") return "bg-destructive/10 text-destructive border-destructive/40";
  return "bg-muted text-muted-foreground border-border";
}

function avatarClass(role: UserRole): string {
  if (role === "Director") return "bg-primary/15 text-primary";
  if (role === "Division Chief") return "bg-accent/15 text-accent";
  return "bg-secondary/15 text-secondary";
}

export default function UserManagementPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentUser = getCurrentUser();
  const canAccess = USER_MANAGEMENT_ALLOWED_EMAILS.has(currentUser.email.toLowerCase());

  const [users, setUsers] = useState<ManagedUser[]>(MOCK_USERS);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [divisionFilter, setDivisionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const next = users.filter((user) => {
      const matchSearch =
        needle.length === 0 ||
        user.name.toLowerCase().includes(needle) ||
        user.email.toLowerCase().includes(needle) ||
        user.position.toLowerCase().includes(needle);

      const matchRole = roleFilter === "all" || user.role === roleFilter;
      const matchDivision = divisionFilter === "all" || user.division === divisionFilter;
      const matchStatus = statusFilter === "all" || user.status === statusFilter;

      return matchSearch && matchRole && matchDivision && matchStatus;
    });

    next.sort((a, b) => {
      const valueA = String(a[sortKey]).toLowerCase();
      const valueB = String(b[sortKey]).toLowerCase();
      const compare = valueA.localeCompare(valueB);
      return sortDirection === "asc" ? compare : -compare;
    });

    return next;
  }, [users, search, roleFilter, divisionFilter, statusFilter, sortKey, sortDirection]);

  const stats = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter((user) => user.status === "Active").length;
    const administratorCount = users.filter((user) => user.role === "Director" || user.role === "Division Chief").length;
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

  const openDelete = (user: ManagedUser) => {
    setSelectedUser(user);
    setDeleteOpen(true);
  };

  const updateUserStatus = (userId: string, status: UserStatus) => {
    setUsers((current) => current.map((user) => (user.id === userId ? { ...user, status } : user)));
  };

  const confirmDelete = () => {
    if (!selectedUser) return;
    setUsers((current) => current.filter((user) => user.id !== selectedUser.id));
    setDeleteOpen(false);
    toast({ title: "User deleted", description: `${selectedUser.name} was removed from the list.` });
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground">Manage user accounts, roles, statuses, and permissions across divisions.</p>
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
              placeholder="Search by name, email, or position"
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
                <SelectItem value="Director">Director</SelectItem>
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
                {divisions.map((division) => (
                  <SelectItem key={division} value={division}>{division}</SelectItem>
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
                <TableHead>
                  <button className="inline-flex items-center gap-1" onClick={() => toggleSort("position")}>
                    Position <ArrowUpDown className="h-3.5 w-3.5" />
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
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No users match the selected filters.</TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className={`h-9 w-9 ${avatarClass(user.role)}`}>
                          <AvatarFallback>{initialsOf(user.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{user.email}</TableCell>
                    <TableCell className="text-sm">{user.position}</TableCell>
                    <TableCell className="text-sm">{user.division}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={roleBadgeClass(user.role)}>{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Select value={user.status} onValueChange={(value: UserStatus) => updateUserStatus(user.id, value)}>
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
                    <TableCell className="text-sm text-muted-foreground">{user.lastActive}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openView(user)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(user)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openDelete(user)}>
                          <Trash2 className="h-4 w-4" />
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
            <DialogDescription>Complete user information, permissions, and recent activity.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><span className="font-medium">Name:</span> <span className="text-muted-foreground">{selectedUser.name}</span></div>
                <div><span className="font-medium">Email:</span> <span className="text-muted-foreground">{selectedUser.email}</span></div>
                <div><span className="font-medium">Phone:</span> <span className="text-muted-foreground">{selectedUser.phone}</span></div>
                <div><span className="font-medium">Position:</span> <span className="text-muted-foreground">{selectedUser.position}</span></div>
                <div><span className="font-medium">Division:</span> <span className="text-muted-foreground">{selectedUser.division}</span></div>
                <div><span className="font-medium">Role:</span> <span className="text-muted-foreground">{selectedUser.role}</span></div>
                <div><span className="font-medium">Date Joined:</span> <span className="text-muted-foreground">{selectedUser.dateJoined}</span></div>
                <div><span className="font-medium">Last Active:</span> <span className="text-muted-foreground">{selectedUser.lastActive}</span></div>
              </div>

              <div>
                <p className="font-medium mb-1.5">Permissions</p>
                <div className="space-y-1.5">
                  {ROLE_PERMISSIONS[selectedUser.role].map((permission) => (
                    <div key={permission} className="flex items-start gap-2 rounded-md border border-border/60 p-2 bg-muted/20">
                      <ShieldCheck className="h-4 w-4 text-primary mt-0.5" />
                      <span className="text-muted-foreground">{permission}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-medium mb-1.5">Recent Activity</p>
                <div className="space-y-1.5">
                  {selectedUser.activity.map((item) => (
                    <div key={item} className="rounded-md border border-border/60 p-2 bg-muted/20 text-muted-foreground">
                      {item}
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
            <DialogDescription>Form scaffolding is ready for full user edit workflow integration.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-3 text-sm">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={selectedUser.name} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={selectedUser.email} readOnly />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Close</Button>
            <Button
              variant="hero"
              onClick={() => {
                toast({ title: "Edit flow ready", description: "Connect this modal to your user update API or form handler." });
              }}
            >
              Save (Placeholder)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>This action removes the selected user record from the table.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {selectedUser ? `Are you sure you want to delete ${selectedUser.name}?` : "No user selected."}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
