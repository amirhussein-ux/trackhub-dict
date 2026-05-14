import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConfirmActionDialog } from "@/components/ConfirmActionDialog";
import { PageErrorState, PageLoadingState } from "@/components/PageFeedbackState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/api/client";
import { requestPasswordReset, logoutUser } from "@/lib/auth-workflows";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { divisions, type Division } from "@/lib/mock-data";
import { clearCurrentUser, getCurrentUser, type UserRole } from "@/lib/user-session";
import { Eye, EyeOff, Lock, ShieldCheck, UserCircle } from "lucide-react";

type ProfileSettings = {
  division: Division;
  contactNumber: string;
  position: string;
};

type SecuritySettings = {
  showPasswords: boolean;
};

type AccountRecord = {
  firstName?: string;
  lastName?: string;
  name: string;
  email: string;
  role: UserRole;
};

type PendingConfirmation =
  | "save-profile"
  | "update-password"
  | "send-reset-link"
  | "logout"
  | null;

const PROFILE_SETTINGS_KEY = "trackhub.profile-settings";
const SECURITY_SETTINGS_KEY = "trackhub.security-settings";
const DEFAULT_CONTACT_PLACEHOLDER = "";
const DEFAULT_POSITION = "Policy Officer";
const DEFAULT_DIVISION: Division = "PRAD";

function loadProfileSettings(): ProfileSettings {
  try {
    const raw = window.localStorage.getItem(PROFILE_SETTINGS_KEY);
    if (!raw) {
      return {
        division: DEFAULT_DIVISION,
        contactNumber: DEFAULT_CONTACT_PLACEHOLDER,
        position: DEFAULT_POSITION,
      };
    }

    const parsed = JSON.parse(raw) as Partial<ProfileSettings>;
    if (!parsed || !parsed.division) {
      throw new Error("Invalid profile settings");
    }

    return {
      division: parsed.division,
      contactNumber: parsed.contactNumber ?? DEFAULT_CONTACT_PLACEHOLDER,
      position: parsed.position ?? DEFAULT_POSITION,
    };
  } catch {
    return {
      division: DEFAULT_DIVISION,
      contactNumber: DEFAULT_CONTACT_PLACEHOLDER,
      position: DEFAULT_POSITION,
    };
  }
}

function loadSecuritySettings(): SecuritySettings {
  try {
    const raw = window.localStorage.getItem(SECURITY_SETTINGS_KEY);
    if (!raw) {
      return { showPasswords: false };
    }

    const parsed = JSON.parse(raw) as Partial<SecuritySettings> | null;
    // Only accept an explicit boolean value from storage. If it's missing or malformed,
    // fall back to the secure default (do not show passwords).
    if (parsed && typeof parsed.showPasswords === "boolean") {
      return { showPasswords: parsed.showPasswords };
    }

    return { showPasswords: false };
  } catch {
    return { showPasswords: false };
  }
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentUser = getCurrentUser();
  const [account, setAccount] = useState<AccountRecord>({
    firstName: "",
    lastName: "",
    name: currentUser.name,
    email: currentUser.email,
    role: currentUser.role,
  });
  const [profileSettings, setProfileSettings] = useState<ProfileSettings>(() => loadProfileSettings());
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(() => loadSecuritySettings());
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation>(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);
  const [accountLoadError, setAccountLoadError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const loadAccount = async () => {
    setIsLoadingAccount(true);
    setAccountLoadError(null);

    try {
      const response = await apiRequest<{ user: AccountRecord }>("/auth/me", { method: "GET" });
      setAccount(response.user);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to load account settings right now.";
      setAccountLoadError(message);
    } finally {
      setIsLoadingAccount(false);
    }
  };

  useEffect(() => {
    void loadAccount();
  }, []);

  const passwordInputType = securitySettings.showPasswords ? "text" : "password";
  const accountDisplayName = [account.firstName?.trim(), account.lastName?.trim()].filter(Boolean).join(" ") || account.name;

  const passwordStrength = useMemo(() => {
    const hasLength = newPassword.length >= 8;
    const hasLower = /[a-z]/.test(newPassword);
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasDigit = /\d/.test(newPassword);
    const score = [hasLength, hasLower, hasUpper, hasDigit].filter(Boolean).length;
    return score;
  }, [newPassword]);

  const saveProfile = () => {
    try {
      window.localStorage.setItem(PROFILE_SETTINGS_KEY, JSON.stringify(profileSettings));
      toast({ title: "Profile updated", description: "Local profile preferences were saved." });
    } catch {
      toast({ title: "Save failed", description: "Unable to save profile settings.", variant: "destructive" });
    }
  };

  const updatePassword = () => {
    void (async () => {
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

      try {
        await apiRequest("/auth/change-password", {
          method: "POST",
          body: {
            currentPassword,
            newPassword,
          },
        });

        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        toast({ title: "Password updated", description: "Your password has been changed successfully." });
      } catch (error) {
        toast({
          title: "Password update failed",
          description: error instanceof Error ? error.message : "Unable to update your password right now.",
          variant: "destructive",
        });
      }
    })();
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
    void (async () => {
      const result = await requestPasswordReset(account.email);
      if (result.ok === false) {
        toast({ title: "Password reset failed", description: result.message, variant: "destructive" });
        return;
      }

      toast({
        title: "Password reset initiated",
        description: result.message,
      });
    })();
  };

  const logout = () => {
    void (async () => {
      await logoutUser();
      clearCurrentUser();
      navigate("/");
    })();
  };

  if (isLoadingAccount) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage account, profile, security controls, and session actions.</p>
        </div>
        <PageLoadingState title="Loading settings" description="Please wait while we load your account information." />
      </div>
    );
  }

  if (accountLoadError) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage account, profile, security controls, and session actions.</p>
        </div>
        <PageErrorState
          title="We couldn't load your settings"
          description={accountLoadError}
          onAction={() => {
            void loadAccount();
          }}
          onSecondaryAction={() => navigate("/dashboard/support")}
        />
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage account, profile, security controls, and session actions.</p>
      </div>

      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><UserCircle className="h-4 w-4" /> Account & Profile Settings</CardTitle>
          <CardDescription>Review your account record and manage local profile preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Name</Label>
              <Input id="profile-name" value={accountDisplayName} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input id="profile-email" type="email" value={account.email} readOnly />
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
              <Input value={account.role} readOnly />
              <p className="text-xs text-muted-foreground">Roles are sourced from the user records in the database and cannot be edited here.</p>
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
          <Button variant="hero" onClick={() => setPendingConfirmation("save-profile")}>Save Profile</Button>
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
          <Button variant="hero" onClick={() => setPendingConfirmation("update-password")}>Update Password</Button>
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
            <Badge variant="outline">Coming Soon</Badge>
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
            <Button variant="outline" size="sm" onClick={() => setPendingConfirmation("send-reset-link")}>Send Reset Link</Button>
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
          <Button variant="destructive" onClick={() => setPendingConfirmation("logout")}>Log Out</Button>
        </CardContent>
      </Card>
    </div>
    <ConfirmActionDialog
      open={pendingConfirmation !== null}
      onOpenChange={(open) => {
        if (!open) {
          setPendingConfirmation(null);
        }
      }}
      title={
        pendingConfirmation === "save-profile"
          ? "Save profile preferences?"
          : pendingConfirmation === "update-password"
            ? "Update your password?"
            : pendingConfirmation === "send-reset-link"
              ? "Send password reset instructions?"
              : pendingConfirmation === "logout"
                ? "Log out of TrackHub?"
                : ""
      }
      description={
        pendingConfirmation === "save-profile"
          ? "This will save your division, contact info, and position preferences on this device."
          : pendingConfirmation === "update-password"
            ? "Your password fields will be submitted and your credentials will be updated."
            : pendingConfirmation === "send-reset-link"
              ? `Reset instructions will be sent to ${account.email}.`
              : pendingConfirmation === "logout"
                ? "Your current session will end and you will be returned to the landing page."
                : ""
      }
      confirmLabel={
        pendingConfirmation === "save-profile"
          ? "Save"
          : pendingConfirmation === "update-password"
            ? "Update Password"
            : pendingConfirmation === "send-reset-link"
              ? "Send Reset Link"
              : pendingConfirmation === "logout"
                ? "Log Out"
                : "Confirm"
      }
      confirmVariant={pendingConfirmation === "logout" ? "destructive" : "default"}
      onConfirm={async () => {
        if (pendingConfirmation === "save-profile") {
          saveProfile();
          return;
        }

        if (pendingConfirmation === "update-password") {
          updatePassword();
          return;
        }

        if (pendingConfirmation === "send-reset-link") {
          sendPasswordReset();
          return;
        }

        if (pendingConfirmation === "logout") {
          logout();
          return;
        }
      }}
    />
    </>
  );
}
