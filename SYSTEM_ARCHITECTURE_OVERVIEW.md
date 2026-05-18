# TrackHub Policy Management System - Architecture Overview

## 1. SYSTEM PURPOSE
TrackHub is a comprehensive policy management and tracking system for the Department of Information and Communications Technology (DICT). It automates policy lifecycle management from creation through publication, with intelligent workflow automation, approval chains, and document versioning.

---

## 2. CORE ARCHITECTURE PATTERN

### Event-Driven Workflow Automation
```
USER ACTION → EMIT EVENT → WORKFLOW RULES ENGINE → STATE TRANSITION → NOTIFICATIONS
```

The system follows a **single source of truth** pattern where:
- Backend processes all workflow events
- Frontend triggers actions via API endpoints
- Workflow engine evaluates business rules
- Automatic status updates occur without manual intervention
- All changes are audited in timeline and activity logs

---

## 3. TECHNOLOGY STACK

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Language**: TypeScript
- **Job Scheduling**: node-cron
- **Security**: Helmet, CORS, Rate Limiting, bcryptjs

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn-ui (Radix UI + Tailwind CSS)
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios (via custom client)

### Infrastructure
- **Environment**: Development/Production/Test
- **Port**: 5000 (backend), 8080 (frontend)
- **Database**: MongoDB Atlas or local instance

---

## 4. DATA MODELS

### Policy Schema
```typescript
{
  // Identification
  policyNumber: string (unique)
  title: string
  type: "Republic Act" | "Executive Order" | "Issuance" | "Administrative Order" | "Memorandum Order"
  division: "PRAD" | "PPDD" | "PPMED" | "PPMCAD"
  
  // Workflow State (NEW - Smart Automation)
  workflowState: "Draft" | "Collaborating" | "For Review" | "Under Review" | "Approved" | "Published" | "Archived" | "Rejected" | "Returned for Revision"
  status: "On Hold" | "On Progress" | "Under Review" | "Approved" | "Published" (legacy, mapped from workflowState)
  
  // Approval Chain
  reviewReady: boolean
  approvalChain: [{
    approverEmail: string
    approved: boolean
    approvedAt?: Date
    rejectedAt?: Date
    rejectionReason?: string
  }]
  reviewers: string[] (Division Chiefs + OIC Director emails)
  
  // Tracking
  createdBy: string (user identifier)
  createdDate: string (ISO date)
  lastUpdated: string (ISO date)
  uploadedBy: string
  lastEditedBy: string
  lastActivityAt: Date (indexed for performance)
  
  // Dates & Metadata
  dateSigned: string
  effectivityClause: string
  effectivityDate: string
  publicationSource: string
  publicationDate: string
  referenceLink: string
  remarks: string (audit history)
  
  // Access Control
  accessEmails: string[] (collaborators)
  
  // Lifecycle
  archived: boolean
  archivedAt?: Date
  publishedAt?: Date
  escalated: boolean (for stale policy tracking)
  deadline?: Date
  
  // Audit Trail
  timeline: [{
    timestamp: Date
    event: WorkflowEventType
    actor: string
    description: string
    metadata?: Record<string, any>
  }]
}
```

### User Schema
```typescript
{
  identifier: string (unique, e.g., "amir.khan")
  email: string (unique)
  firstName: string
  lastName: string
  name: string
  role: "OIC Director" | "Division Chief" | "Division Member"
  division: "PRAD" | "PPDD" | "PPMED" | "PPMCAD"
  password: string (bcrypt hashed)
  verified: boolean
  firstLogin: boolean
  status: "active" | "inactive" | "suspended"
}
```

### Activity Log Schema
```typescript
{
  user: string
  action: string
  policyTitle: string
  type: "create" | "update" | "upload" | "download" | "status"
  timestamp: string (formatted as "YYYY-MM-DD HH:MM")
}
```

### Notification Schema
```typescript
{
  policyId: string
  policyTitle: string
  changeType: string
  timestamp: string
  read: boolean
  recipientEmail: string
}
```

### Repository Document Schema
```typescript
{
  policyId: string
  policyNumber: string
  policyTitle: string
  name: string (filename)
  type: "pdf" | "docx" | "xlsx" | "jpg" | "png"
  size: string (human-readable)
  version: number
  uploadedBy: string
  uploadedDate: string
  division: string
  category: PolicyType
  status: "Active" | "Archived"
  owner: string
  lastEdited: string
  fileDataUrl: string (base64 encoded)
  fileMimeType: string
  remarks: string
  accessEmails: string[]
}
```

---

## 5. WORKFLOW STATES & TRANSITIONS

### State Machine
```
Draft
  ↓ (ACCESS_GRANTED)
Collaborating
  ↓ (DOCUMENT_UPLOADED + REVIEW_READY)
For Review
  ↓ (APPROVAL_GRANTED)
Under Review
  ├─ (APPROVAL_GRANTED - all approvers) → Approved
  └─ (REVIEW_REJECTED) → Returned for Revision
  
Approved
  ↓ (FINAL_DOCUMENT_UPLOADED from PPMED)
Published
  ↓ (POLICY_ARCHIVED)
Archived

Rejected (terminal state)
Returned for Revision → Collaborating (cycle)
```

### Workflow Events (9 Types)
1. **POLICY_CREATED** - New policy record created
2. **ACCESS_GRANTED** - Collaborator added to policy
3. **DOCUMENT_UPLOADED** - New document version uploaded
4. **REVIEW_READY** - Policy submitted for review (requires: collaborators + documents)
5. **REVIEW_REJECTED** - Policy returned for revision with reason
6. **APPROVAL_GRANTED** - Approver grants approval
7. **FINAL_DOCUMENT_UPLOADED** - Final document uploaded (PPMED only triggers publication)
8. **POLICY_ARCHIVED** - Policy archived for records
9. **POLICY_UPDATED** - Policy metadata updated

---

## 6. API ENDPOINTS

### Policy Management
```
POST   /api/policies                          Create new policy
GET    /api/policies                          List policies (with filters)
GET    /api/policies/:id                      Get policy details
PUT    /api/policies/:id                      Update policy
DELETE /api/policies/:id                      Delete policy

POST   /api/policies/:id/actions/grant-access         Grant collaborator access
POST   /api/policies/:id/actions/review-ready         Submit for review
POST   /api/policies/:id/actions/approve             Approve policy
POST   /api/policies/:id/actions/reject              Reject policy
POST   /api/policies/:id/actions/document-uploaded   Upload document
POST   /api/policies/:id/actions/publish             Publish policy
POST   /api/policies/:id/actions/archive             Archive policy
```

### Document Management
```
POST   /api/documents                         Upload document
GET    /api/documents                         List documents
GET    /api/documents/:id                     Get document
DELETE /api/documents/:id                     Delete document
```

### Activity & Notifications
```
GET    /api/activities                        Get activity log
GET    /api/notifications                     Get notifications
PUT    /api/notifications/:id                 Mark notification as read
```

### User Management
```
GET    /api/users                             List users (admin only)
POST   /api/users                             Create user (admin only)
PUT    /api/users/:id                         Update user (admin only)
DELETE /api/users/:id                         Delete user (admin only)
```

### Authentication
```
POST   /api/auth/login                        User login
POST   /api/auth/logout                       User logout
POST   /api/auth/verify-code                  Verify OTP
POST   /api/auth/forgot-password              Request password reset
POST   /api/auth/reset-password               Reset password
```

---

## 7. WORKFLOW ENGINE LOGIC

### File: `backend/workflow/workflowEngine.ts`

**Function**: `processWorkflowEvent(event: WorkflowEvent)`

**Flow**:
1. Fetch policy from database
2. Evaluate workflow rules based on event type
3. Determine state transition (if any)
4. Map workflow state to legacy status
5. Update `lastActivityAt` timestamp
6. Add timeline entry
7. Create activity log
8. Send notifications to collaborators
9. Save policy to database

**Key Features**:
- Bulk notification inserts (N+1 query fix)
- Timeline tracking for audit trail
- Automatic status mapping
- Metadata preservation

---

## 8. WORKFLOW RULES ENGINE

### File: `backend/workflow/workflowRules.ts`

**Function**: `evaluateWorkflowRules(policy, event)`

**Rules by Event Type**:

#### POLICY_CREATED
- State: Draft
- Remark: "Policy created and owner relationship established"

#### ACCESS_GRANTED
- State: Collaborating (if valid transition)
- Remark: "Collaborator access granted"

#### DOCUMENT_UPLOADED
- State: No change
- Remark: "Document version uploaded"
- Updates: `lastActivityAt`

#### REVIEW_READY
- Conditions:
  - Has collaborators (accessEmails.length > 0)
  - Has documents (RepositoryDocument count > 0)
  - reviewReady flag = true
- State: For Review (if conditions met)
- Remark: Success or failure message

#### APPROVAL_GRANTED
- State transitions:
  - For Review → Under Review (first approval)
  - Under Review → Approved (all approvals granted)
- Remark: "Approval recorded"

#### REVIEW_REJECTED
- State: Returned for Revision or Rejected
- Remark: "Policy returned for revision"

#### FINAL_DOCUMENT_UPLOADED
- Conditions:
  - Uploader division = PPMED
  - Policy status = Approved
- State: Published
- Updates: `publishedAt` timestamp

#### POLICY_ARCHIVED
- State: Archived
- Updates: `archivedAt` timestamp
- Remark: "Policy archived and retained for governance records"

#### POLICY_UPDATED
- State: No change
- Remark: "Policy metadata updated"
- Updates: `lastActivityAt`

---

## 9. AUTOMATION SERVICES

### File: `backend/services/policyAutomationService.ts`

**Class**: `PolicyAutomationService`

**Key Methods**:

#### `markReviewReady(policyId, triggeredBy)`
- Validates: Policy exists, user is not creator, documents exist, collaborators assigned
- Fetches Division Chiefs + OIC Director for policy division
- Initializes approval chain with these reviewers
- Sets `reviewReady = true`
- Emits REVIEW_READY event

#### `grantApproval(policyId, approverEmail, triggeredBy)`
- Updates approval chain entry: `approved = true`, `approvedAt = now`
- Checks if all approvers approved
- If all approved: sets status = "Approved", workflowState = "Approved"
- Emits APPROVAL_GRANTED event

#### `rejectApproval(policyId, approverEmail, rejectionReason, triggeredBy)`
- Updates approval chain entry: `approved = false`, `rejectedAt = now`, `rejectionReason`
- Sets `reviewReady = false`
- Sets workflowState = "Returned for Revision", status = "On Progress"
- Emits REVIEW_REJECTED event

#### `grantAccess(policyId, collaboratorEmail, triggeredBy)`
- Adds email to policy.accessEmails
- Adds email to all associated documents' accessEmails
- Emits ACCESS_GRANTED event

#### `publishPolicy(policyId, triggeredBy)`
- Sets `publishedAt = now`
- Emits FINAL_DOCUMENT_UPLOADED event (with PPMED division)

#### `archivePolicy(policyId, triggeredBy)`
- Sets `archived = true`, `archivedAt = now`
- Updates all associated documents: status = "Archived"
- Emits POLICY_ARCHIVED event

---

## 10. BACKGROUND JOBS

### Stale Policy Job (`backend/jobs/stalePolicyJob.ts`)
- **Schedule**: Daily at 9 AM
- **Threshold**: 7 days (reminder), 14 days (escalation)
- **Logic**:
  - Find policies in "Under Review" state not updated for 7+ days
  - Send reminder notifications to reviewers
  - Escalation handled by separate job

### Escalation Job (`backend/jobs/escalationJob.ts`)
- **Schedule**: Daily at 10 AM
- **Threshold**: 14 days
- **Logic**:
  - Find policies in "Under Review" state not updated for 14+ days
  - Mark as escalated
  - Notify OIC Director

### Archive Job (`backend/jobs/archiveJob.ts`)
- **Schedule**: Weekly
- **Logic**:
  - Archive policies marked for archival
  - Clean up old notifications

---

## 11. ACCESS CONTROL

### File: `backend/utils/ownership.ts`

**Functions**:

#### `canAccessPolicy(user, policy)`
- Privileged users (OIC Director, Division Chief) can access all
- Regular users can access if:
  - They created the policy
  - They uploaded the policy
  - They're in accessEmails list
  - Policy is in their division

#### `canEditPolicy(user, policy)`
- Policy owner (creator) can edit
- OIC Director can edit
- Division Chief can edit if policy in their division

#### `canGrantPolicyAccess(user, policy)`
- Policy owner can grant access
- OIC Director can grant access

#### `canReviewPolicy(user, policy)`
- User is in policy.reviewers list
- User is OIC Director

#### `canApprovePolicy(user)`
- User role is "OIC Director" or "Division Chief"

#### `canArchivePolicy(user)`
- User role is "OIC Director"

#### `canPublishPolicy(user)`
- User role is "OIC Director"

#### `isPolicyOwner(user, policy)`
- user.identifier === policy.createdBy

#### `isPrivilegedUser(user)`
- user.role in ["OIC Director", "Division Chief"]

---

## 12. FRONTEND PAGES

### PolicyTrackerPage (`src/pages/PolicyTrackerPage.tsx`)
- **Purpose**: Main policy management interface
- **Features**:
  - Policy table with filtering (status, division, type, search)
  - Pagination (8 items per page)
  - Create new policy dialog
  - Edit policy dialog (with document upload)
  - Share access dialog
  - Archive confirmation dialog
  - Workflow state badges (visual indicator)
  - Remarks history display

### PolicyDetailPage (`src/pages/PolicyDetailPage.tsx`)
- **Purpose**: Detailed policy view
- **Features**:
  - Full policy metadata
  - Document versions
  - Approval chain status
  - Timeline/activity history
  - Action buttons (review, approve, reject, publish)

### ActivityLogPage (`src/pages/ActivityLogPage.tsx`)
- **Purpose**: System-wide activity tracking
- **Features**:
  - Chronological activity log
  - Filter by user, action type, policy
  - Export functionality

### ArchivePage (`src/pages/ArchivePage.tsx`)
- **Purpose**: Archived policies management
- **Features**:
  - View archived policies
  - Restore archived policies
  - Permanent deletion

---

## 13. SECURITY FEATURES

### Authentication
- Email + password login
- OTP verification
- Password reset flow
- First-login password change requirement
- Session management with secure tokens

### Authorization
- Role-based access control (RBAC)
- Policy-level access control
- Approval chain validation
- Division-based filtering

### Data Protection
- Helmet security headers
- CORS configuration
- Rate limiting (API, auth, support endpoints)
- Input validation (Zod schemas)
- Regex escape for search queries (DOS prevention)
- Request size limits (20MB)

### Audit Trail
- Activity logging for all actions
- Timeline entries for workflow events
- Notification history
- User identification on all changes

---

## 14. PERFORMANCE OPTIMIZATIONS

### Database Indexes
```typescript
policySchema.index({ createdAt: -1 });
policySchema.index({ division: 1, status: 1, createdAt: -1 });
policySchema.index({ createdBy: 1, uploadedBy: 1 });
policySchema.index({ accessEmails: 1 });
policySchema.index({ workflowState: 1, lastActivityAt: -1 });
policySchema.index({ escalated: 1, lastActivityAt: -1 });
policySchema.index({ "timeline.timestamp": -1 });
```

### Query Optimizations
- Bulk notification inserts (N+1 fix)
- Pagination with skip/limit
- Indexed sorting on frequently queried fields
- Lean queries where full document not needed

### Rate Limiting
- API read limiter: 100 requests/15 min
- Create limiter: 50 requests/15 min
- Auth limiter: 5 requests/15 min
- Support limiter: 10 requests/15 min
- AI generation limiter: 20 requests/hour

---

## 15. ERROR HANDLING

### Global Error Handler (`backend/middleware/errorHandler.ts`)
- Catches all unhandled errors
- Logs with context
- Returns appropriate HTTP status codes
- Sanitizes error messages for frontend

### Validation
- Request body validation (Zod schemas)
- Parameter validation
- Type checking with TypeScript

### Logging
- Structured logging with pino
- Log levels: info, warn, error
- Request context tracking
- Error stack traces

---

## 16. WORKFLOW STATE MAPPING

### Workflow State → Legacy Status
```
Draft → On Progress
Collaborating → On Progress
For Review → Under Review
Under Review → Under Review
Approved → Approved
Published → Published
Archived → On Hold
Rejected → On Hold
Returned for Revision → On Progress
```

This mapping ensures backward compatibility with existing policies while supporting new workflow automation.

---

## 17. KEY BUSINESS RULES

1. **Self-Approval Prevention**: Policy creator cannot submit their own policy for review
2. **Minimum Requirements for Review**:
   - At least one document uploaded
   - At least one collaborator assigned
3. **Automatic Reviewer Assignment**: Division Chiefs + OIC Director automatically assigned as reviewers
4. **All-or-Nothing Approval**: Policy only moves to "Approved" when ALL approvers approve
5. **PPMED Publication Gate**: Only PPMED division can trigger publication
6. **Stale Policy Escalation**: 7-day reminder, 14-day escalation to OIC Director
7. **Approval Chain Immutability**: Once set, approval chain cannot be modified (only entries updated)

---

## 18. DEPLOYMENT CHECKLIST

- [ ] Environment variables configured (.env)
- [ ] MongoDB connection verified
- [ ] Default users seeded
- [ ] Background jobs scheduled
- [ ] CORS origin configured
- [ ] Rate limits tuned for environment
- [ ] Logging configured
- [ ] Error handling tested
- [ ] Security headers enabled
- [ ] Database indexes created

---

## 19. COMMON WORKFLOWS

### Create & Publish a Policy
1. User creates policy (Draft state)
2. User adds collaborators (Collaborating state)
3. User uploads documents
4. User marks review ready (For Review state)
5. Reviewers approve (Under Review → Approved)
6. PPMED uploads final document (Published state)
7. Policy archived when no longer needed

### Reject & Revise
1. Approver rejects policy (Returned for Revision)
2. Policy owner revises and uploads new document
3. Policy resubmitted for review
4. Cycle repeats until approved

### Grant Access
1. Policy owner grants access to collaborator
2. Collaborator added to accessEmails
3. Collaborator added to all associated documents
4. Notification sent to collaborator

---

## 20. TROUBLESHOOTING GUIDE

### Policy Creation Fails
- Check: Status field has default value in schema
- Check: User has "Division Member" or higher role
- Check: Division is valid (PRAD, PPDD, PPMED, PPMCAD)

### Review Submission Fails
- Check: At least one document uploaded
- Check: At least one collaborator assigned
- Check: User is not policy creator
- Check: Division has active reviewers

### Approval Not Working
- Check: User is in approval chain
- Check: Policy is in "For Review" or "Under Review" state
- Check: Approver email matches exactly

### Notifications Not Sent
- Check: Recipients in accessEmails list
- Check: Notification job running
- Check: Email service configured

### Workflow State Not Updating
- Check: Event emitted successfully
- Check: Workflow rules conditions met
- Check: Database transaction committed
- Check: Indexes created for performance

---

## 21. FUTURE ENHANCEMENTS

- [ ] Email notifications integration
- [ ] PDF generation for policies
- [ ] Advanced search with Elasticsearch
- [ ] Policy versioning with diff view
- [ ] Bulk operations (import/export)
- [ ] Custom workflow templates
- [ ] Integration with external systems
- [ ] Mobile app support
- [ ] Real-time collaboration (WebSockets)
- [ ] Advanced analytics dashboard

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**System Status**: Production Ready
