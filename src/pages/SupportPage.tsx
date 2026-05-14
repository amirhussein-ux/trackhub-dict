import { useMemo, useState } from "react";
import { Building2, CheckCircle2, FileText, LifeBuoy, Loader2, Mail, MessageSquareText, Paperclip, Send, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { divisions } from "@/lib/mock-data";
import { getCurrentUser } from "@/lib/user-session";
import { submitSupportForm, supportCategories, type SupportCategory } from "@/lib/api/supportService";

type SupportFormState = {
  fullName: string;
  email: string;
  department: string;
  subject: string;
  category: SupportCategory;
  message: string;
  attachment: File | null;
};

type SupportFormErrors = Partial<Record<keyof Omit<SupportFormState, "attachment"> | "attachment", string>>;

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
const allowedExtensions = new Set(["pdf", "docx", "png", "jpg", "jpeg"]);

function getDefaultFormState(): SupportFormState {
  const currentUser = getCurrentUser();
  return {
    fullName: currentUser.name === "Guest User" ? "" : currentUser.name,
    email: currentUser.email === "guest@dict.gov.ph" ? "" : currentUser.email,
    department: currentUser.division ?? "",
    subject: "",
    category: "Technical Issue",
    message: "",
    attachment: null,
  };
}

function getAttachmentError(file: File | null): string | undefined {
  if (!file) {
    return undefined;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !allowedExtensions.has(extension)) {
    return "Attachment must be a PDF, DOCX, PNG, or JPG file.";
  }

  if (file.size > MAX_ATTACHMENT_SIZE) {
    return "Attachment must be 5 MB or smaller.";
  }

  return undefined;
}

function validateForm(form: SupportFormState): SupportFormErrors {
  const errors: SupportFormErrors = {};

  if (!form.fullName.trim()) {
    errors.fullName = "Full name is required.";
  }

  if (!form.email.trim()) {
    errors.email = "Email address is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!form.subject.trim()) {
    errors.subject = "Subject is required.";
  } else if (form.subject.trim().length < 3) {
    errors.subject = "Subject must be at least 3 characters.";
  }

  if (!form.message.trim()) {
    errors.message = "Please describe your concern.";
  } else if (form.message.trim().length < 10) {
    errors.message = "Message must be at least 10 characters.";
  }

  const attachmentError = getAttachmentError(form.attachment);
  if (attachmentError) {
    errors.attachment = attachmentError;
  }

  return errors;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SupportPage() {
  const { toast } = useToast();
  const [form, setForm] = useState<SupportFormState>(() => getDefaultFormState());
  const [errors, setErrors] = useState<SupportFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastTicketId, setLastTicketId] = useState<string | null>(null);

  const attachmentSummary = useMemo(() => {
    if (!form.attachment) {
      return "Optional. Accepted formats: PDF, DOCX, PNG, JPG. Maximum file size: 5 MB.";
    }

    return `${form.attachment.name} • ${formatFileSize(form.attachment.size)}`;
  }, [form.attachment]);

  const updateField = <K extends keyof SupportFormState>(field: K, value: SupportFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      toast({
        title: "Please review the form",
        description: "Some required fields are missing or invalid.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await submitSupportForm({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        department: form.department.trim(),
        subject: form.subject.trim(),
        category: form.category,
        message: form.message.trim(),
        attachment: form.attachment,
      });

      setLastTicketId(response.ticketId);
      setForm((current) => ({
        ...getDefaultFormState(),
        fullName: current.fullName,
        email: current.email,
        department: current.department,
      }));
      setErrors({});

      toast({
        title: "Support request sent",
        description: `Your concern was submitted successfully. Ticket ID: ${response.ticketId}.`,
      });
    } catch (error) {
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "We couldn't submit your concern right now.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contact & Support</h1>
          <p className="text-sm text-muted-foreground">
            Send technical issues, account concerns, policy questions, and feature requests directly to the TrackHub support team.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="px-3 py-1">
            <Mail className="mr-1 h-3.5 w-3.5" /> trackhub.customerservice@gmail.com
          </Badge>
          <Badge variant="secondary" className="px-3 py-1">
            <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Rate-limited and validated
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
        <Card className="border-border/60 shadow-card">
          <CardHeader className="border-b border-border/50 bg-gradient-to-r from-background to-muted/30">
            <CardTitle className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-primary" />
              Submit a Support Concern
            </CardTitle>
            <CardDescription>
              Complete the form below and we’ll forward your concern to customer support with the right category and context.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="support-full-name">Full Name</Label>
                  <Input
                    id="support-full-name"
                    value={form.fullName}
                    onChange={(event) => updateField("fullName", event.target.value)}
                    placeholder="Juan Dela Cruz"
                  />
                  {errors.fullName ? <p className="text-xs text-destructive">{errors.fullName}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="support-email">Email Address</Label>
                  <Input
                    id="support-email"
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    placeholder="juan@dict.gov.ph"
                  />
                  {errors.email ? <p className="text-xs text-destructive">{errors.email}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label>Department / Division</Label>
                  <Select value={form.department || "__none"} onValueChange={(value) => updateField("department", value === "__none" ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Not specified</SelectItem>
                      {divisions.map((division) => (
                        <SelectItem key={division} value={division}>
                          {division}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Concern Category</Label>
                  <Select value={form.category} onValueChange={(value: SupportCategory) => updateField("category", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {supportCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="support-subject">Subject</Label>
                <Input
                  id="support-subject"
                  value={form.subject}
                  onChange={(event) => updateField("subject", event.target.value)}
                  placeholder="Login error after password reset"
                />
                {errors.subject ? <p className="text-xs text-destructive">{errors.subject}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="support-message">Message / Concern Description</Label>
                <Textarea
                  id="support-message"
                  value={form.message}
                  onChange={(event) => updateField("message", event.target.value)}
                  placeholder="Describe the issue, what happened, and any steps already tried."
                  className="min-h-[180px] resize-y"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{errors.message ? <span className="text-destructive">{errors.message}</span> : "Include enough detail so support can reproduce or understand the concern."}</span>
                  <span>{form.message.trim().length}/5000</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="support-attachment">Attachment Upload</Label>
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Attach a supporting file</p>
                      <p className="text-xs text-muted-foreground">{attachmentSummary}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="support-attachment"
                        type="file"
                        accept=".pdf,.docx,.png,.jpg,.jpeg"
                        className="max-w-[260px]"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          updateField("attachment", file);
                          setErrors((current) => ({ ...current, attachment: getAttachmentError(file) }));
                        }}
                      />
                    </div>
                  </div>
                </div>
                {errors.attachment ? <p className="text-xs text-destructive">{errors.attachment}</p> : null}
              </div>

              <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Submissions are protected with file validation, input checks, and anti-spam rate limiting.
                </p>
                <Button type="submit" variant="hero" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Submit Concern
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                What Happens Next
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                Your concern is sent directly to the TrackHub support mailbox with your selected category and full message.
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                Attachments are checked before submission and limited to supported document and image formats.
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                Each request receives a trackable ticket ID for follow-up.
              </div>
              {lastTicketId ? (
                <div className="rounded-lg border border-green-600/30 bg-green-50 p-3 text-green-800">
                  Most recent ticket: <span className="font-semibold">{lastTicketId}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Submission Checklist</CardTitle>
              <CardDescription>Helpful details that speed up support resolution.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
                <Mail className="mt-0.5 h-4 w-4 text-primary" />
                <span>Use your active email so support can reply with follow-up questions.</span>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
                <Building2 className="mt-0.5 h-4 w-4 text-primary" />
                <span>Add your division when the concern is tied to a workflow, document, or approval path.</span>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
                <MessageSquareText className="mt-0.5 h-4 w-4 text-primary" />
                <span>Describe the issue clearly, including the page, action performed, and what you expected to happen.</span>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
                <FileText className="mt-0.5 h-4 w-4 text-primary" />
                <span>Attach screenshots or files only when they directly help explain the concern.</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
