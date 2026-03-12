import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { divisions, type Division } from "@/lib/mock-data";
import { clearCurrentUser, getCurrentUser, setCurrentUser, type UserRole } from "@/lib/user-session";
import { Eye, EyeOff, Lock, ShieldCheck, UserCircle } from "lucide-react";

type ProfileSettings = {
  division: Division;
  role: UserRole;
  contactNumber: string;
  position: string;
};

type SecuritySettings = {
  twoFactorEnabled: boolean;
  showPasswords: boolean;
};

const PROFILE_SETTINGS_KEY = "trackhub.profile-settings";
const SECURITY_SETTINGS_KEY = "trackhub.security-settings";

const ROLE_OPTIONS: UserRole[] = ["Admin", "Policy Owner", "Policy Access", "Viewer"];

function loadProfileSettings(defaultRole: UserRole): ProfileSettings {
  try {
    const raw = window.localStorage.getItem(PROFILE_SETTINGS_KEY);
    if (!raw) {
      return {
        division: "PRAD",
        role: defaultRole,
        contactNumber: "+63 917 000 0000",
        position: "Policy Officer",
      };
    }

    const parsed = JSON.parse(raw) as ProfileSettings;
    if (!parsed || !parsed.division || !parsed.role) {
      throw new Error("Invalid profile settings");
    }

    return parsed;
  } catch {
    return {
      division: "PRAD",
      role: defaultRole,
      contactNumber: "+63 917 000 0000",
      position: "Policy Officer",
    };
  }
}

function loadSecuritySettings(): SecuritySettings {
  try {
    const raw = window.localStorage.getItem(SECURITY_SETTINGS_KEY);
    if (!raw) {
      return { twoFactorEnabled: false, showPasswords: false };
    }

    const parsed = JSON.parse(raw) as SecuritySettings;
    if (typeof parsed?.twoFactorEnabled !== "boolean" || typeof parsed?.showPasswords !== "boolean") {
      throw new Error("Invalid security settings");
    }

    return parsed;
  } catch {
    return { twoFactorEnabled: false, showPasswords: false };
  }
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentUser = getCurrentUser();

  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [profileSettings, setProfileSettings] = useState<ProfileSettings>(() => loadProfileSettings(currentUser.role));
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(() => loadSecuritySettings());

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordInputType = securitySettings.showPasswords ? "text" : "password";

  const passwordStrength = useMemo(() => {
    const hasLength = newPassword.length >= 8;
    const hasLower = /[a-z]/.test(newPassword);
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasDigit = /\d/.test(newPassword);
    const score = [hasLength, hasLower, hasUpper, hasDigit].filter(Boolean).length;
    return score;
  }, [newPassword]);

  const saveProfile = () => {
    if (!name.trim() || !email.trim()) {
      toast({
        title: "Missing required fields",
        description: "Name and email are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      window.localStorage.setItem(PROFILE_SETTINGS_KEY, JSON.stringify(profileSettings));
      setCurrentUser({
        ...currentUser,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: profileSettings.role,
      });

      toast({ title: "Profile updated", description: "Account and profile settings were saved." });
    } catch {
      toast({ title: "Save failed", description: "Unable to save profile settings.", variant: "destructive" });
    }
  };

  const updatePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: "Missing fields", description: "Please complete all password fields.", variant: "destructive" });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: "Password mismatch", description: "New password and confirmation must match.", variant: "destructive" });
      return;
    }

    if (passwordStrength < 3) {
      toast({
        title: "Weak password",
        description: "Use at least 8 characters with upper/lowercase letters and numbers.",
        variant: "destructive",
      });
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast({ title: "Password updated", description: "Your password has been changed successfully." });
  };

  const saveSecuritySettings = (next: SecuritySettings) => {
    setSecuritySettings(next);
    try {
      window.localStorage.setItem(SECURITY_SETTINGS_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage write errors.
    }
  };

  const sendPasswordReset = () => {
    toast({
      title: "Password reset initiated",
      description: `Reset instructions were sent to ${email.trim() || currentUser.email}.`,
    });
  };

  const logout = () => {
    clearCurrentUser();
    navigate("/");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage account, profile, security controls, and session actions.</p>
      </div>

      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><UserCircle className="h-4 w-4" /> Account & Profile Settings</CardTitle>
          <CardDescription>Edit your profile, role assignment, and contact information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Name</Label>
              <Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input id="profile-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Division</Label>
              <Select
                value={profileSettings.division}
                onValueChange={(value: Division) => setProfileSettings((current) => ({ ...current, division: value }))}
              >
                <SelectTrigger><SelectValue placeholder="Select division" /></SelectTrigger>
                <SelectContent>
                  {divisions.map((division) => (
                    <SelectItem key={division} value={division}>{division}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={profileSettings.role}
                onValueChange={(value: UserRole) => setProfileSettings((current) => ({ ...current, role: value }))}
              >
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-contact">Contact Info</Label>
              <Input
                id="profile-contact"
                value={profileSettings.contactNumber}
                onChange={(event) => setProfileSettings((current) => ({ ...current, contactNumber: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-position">Position</Label>
              <Input
                id="profile-position"
                value={profileSettings.position}
                onChange={(event) => setProfileSettings((current) => ({ ...current, position: event.target.value }))}
              />
            </div>
          </div>
          <Button variant="hero" onClick={saveProfile}>Save Profile</Button>
        </CardContent>
      </Card>

      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Lock className="h-4 w-4" /> Change Password</CardTitle>
          <CardDescription>Secure password update flow with basic complexity checks.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input id="current-password" type={passwordInputType} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input id="new-password" type={passwordInputType} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input id="confirm-password" type={passwordInputType} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            Password strength: {passwordStrength}/4
          </p>
          <Button variant="hero" onClick={updatePassword}>Update Password</Button>
        </CardContent>
      </Card>

      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" /> Security Settings</CardTitle>
          <CardDescription>Manage authentication controls and password visibility/reset options.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
              <p className="text-xs text-muted-foreground">Require an extra verification step at sign-in.</p>
            </div>
            <Switch
              checked={securitySettings.twoFactorEnabled}
              onCheckedChange={(checked) => saveSecuritySettings({ ...securitySettings, twoFactorEnabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Password Visibility</p>
              <p className="text-xs text-muted-foreground">Show or hide password fields while typing.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveSecuritySettings({ ...securitySettings, showPasswords: !securitySettings.showPasswords })}
            >
              {securitySettings.showPasswords ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {securitySettings.showPasswords ? "Hide" : "Show"}
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Password Reset</p>
              <p className="text-xs text-muted-foreground">Send account recovery instructions to your email address.</p>
            </div>
            <Button variant="outline" size="sm" onClick={sendPasswordReset}>Send Reset Link</Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Log Out</CardTitle>
          <CardDescription>End your current session and return to landing page.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={logout}>Log Out</Button>
        </CardContent>
      </Card>
    </div>
  );
}
