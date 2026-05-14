# Architecture Refactor: RBAC vs Workflow Roles

## Problem Statement

Your current architecture mixes:
- **RBAC Roles** (stored in database)
- **Workflow Roles** (contextual, policy-specific)
- **Ownership Roles** (derived from relationships)

This creates confusion and code duplication.

---

## Current State (Mixed Model)

### Stored Roles (7 roles)
```
OIC Director
Admin
Division Chief
Policy Owner          ❌ Should be derived
Division Member
Policy Access         ❌ Should be derived
Viewer
```

### Derived Roles (Not stored, but checked as if they were)
```
Collaborator          ❌ Checked as role, but derived from accessEmails
Reviewer              ❌ Checked as role, but derived from policy.reviewers
Publisher             ❌ Checked as role, but derived from division
Approver              ❌ Checked as role, but derived from approvalChain
```

---

## Target State (Clean Separation)

### True RBAC Roles (5 roles - stored in database)
```
OIC Director          ✅ System-wide authority
Admin                 ✅ Technical administration
Division Chief        ✅ Division-level authority
Division Member       ✅ Standard user
Viewer                ✅ Read-only access
```

### Dynamic Workflow Roles (Computed per-policy)
```
Policy Owner          ✅ Derived from policy.createdBy
Collaborator          ✅ Derived from policy.accessEmails
Reviewer              ✅ Derived from policy.reviewers
Approver              ✅ Derived from policy.approvalChain
Publisher             ✅ Derived from user.division === "PPMED"
Requester             ✅ Derived from access request context
```

---

## Implementation Plan

### STEP 1: Create Policy Relationships Utility

**File:** `backend/utils/policyRelationships.ts`

```typescript
import { SessionUser } from "./ownership";

interface PolicyDocument {
  createdBy: string;
  uploadedBy?: string;
  accessEmails?: string[];
  reviewers?: string[];
  approvalChain?: Array<{ approverEmail: string; approved: boolean }>;
  division?: string;
}

const normalize = (value: string): string => value.trim().toLowerCase();

/**
 * Check if user is the policy owner
 */
export function isPolicyOwner(user: SessionUser, policy: PolicyDocument): boolean {
  const byIdentifier = normalize(user.identifier);
  const byName = normalize(user.name);
  const byEmail = normalize(user.email);
  const createdBy = normalize(policy.createdBy);
  const uploadedBy = normalize(policy.uploadedBy ?? "");

  return (
    createdBy === byIdentifier ||
    uploadedBy === byIdentifier ||
    createdBy === byName ||
    uploadedBy === byName ||
    createdBy === byEmail
  );
}

/**
 * Check if user is a collaborator on the policy
 */
export function isCollaborator(user: SessionUser, policy: PolicyDocument): boolean {
  if (isPolicyOwner(user, policy)) return true;
  
  const normalizedEmail = normalize(user.email);
  return (policy.accessEmails ?? [])
    .map(normalize)
    .includes(normalizedEmail);
}

/**
 * Check if user is assigned as a reviewer
 */
export function isReviewer(user: SessionUser, policy: PolicyDocument): boolean {
  const normalizedEmail = normalize(user.email);
  return (policy.reviewers ?? [])
    .map(normalize)
    .includes(normalizedEmail);
}

/**
 * Check if user is in the approval chain
 */
export function isApprover(user: SessionUser, policy: PolicyDocument): boolean {
  const normalizedEmail = normalize(user.email);
  return (policy.approvalChain ?? [])
    .map((entry) => normalize(entry.approverEmail))
    .includes(normalizedEmail);
}

/**
 * Check if user can publish (PPMED division member)
 */
export function canPublish(user: SessionUser): boolean {
  return user.division === "PPMED";
}

/**
 * Check if user is a requester (for access requests)
 */
export function isRequester(user: SessionUser, requesterEmail: string): boolean {
  return normalize(user.email) === normalize(requesterEmail);
}

/**
 * Get all workflow roles for a user on a specific policy
 */
export function getWorkflowRoles(user: SessionUser, policy: PolicyDocument): string[] {
  const roles: string[] = [];

  if (isPolicyOwner(user, policy)) roles.push("Policy Owner");
  if (isCollaborator(user, policy)) roles.push("Collaborator");
  if (isReviewer(user, policy)) roles.push("Reviewer");
  if (isApprover(user, policy)) roles.push("Approver");
  if (canPublish(user)) roles.push("Publisher");

  return roles;
}
```

---

### STEP 2: Update RBAC Utility

**File:** `backend/utils/ownership.ts` (Update)

```typescript
// Keep existing RBAC role checks
export function isOicDirector(user: SessionUser): boolean {
  return user.role === "OIC Director" || user.role === "Admin";
}

export function isDivisionChief(user: SessionUser): boolean {
  return user.role === "Division Chief";
}

export function isDivisionMember(user: SessionUser): boolean {
  return user.role === "Division Member";
}

export function isViewer(user: SessionUser): boolean {
  return user.role === "Viewer";
}

export function isPrivilegedUser(user: SessionUser): boolean {
  return isOicDirector(user) || isDivisionChief(user);
}

// Remove these - they're not RBAC roles:
// export function isPolicyOwner() - moved to policyRelationships.ts
// export function isCollaborator() - moved to policyRelationships.ts
// export function isPublisher() - moved to policyRelationships.ts
```

---

### STEP 3: Update User Schema

**File:** `backend/models/User.ts` (Update)

```typescript
const userRoles = [
  "OIC Director",
  "Admin",
  "Division Chief",
  "Division Member",
  "Viewer",
] as const;

// REMOVE these from enum:
// "Policy Owner"      ❌ Not a RBAC role
// "Policy Access"     ❌ Not a RBAC role

const userSchema = new Schema({
  identifier: { type: String, required: true, trim: true, unique: true },
  email: { type: String, required: true, trim: true, unique: true },
  firstName: { type: String, trim: true, default: "" },
  lastName: { type: String, trim: true, default: "" },
  name: { type: String, required: true, trim: true },
  role: { type: String, enum: userRoles, required: true },  // ✅ Only 5 roles
  division: { type: String, enum: divisions, default: "" },
  password: { type: String, required: true },
  verified: { type: Boolean, default: false },
  firstLogin: { type: Boolean, default: false },
  status: { type: String, enum: userStatuses, default: "active", index: true },
});
```

---

### STEP 4: Update Access Control

**File:** `src/lib/access-control.ts` (Update)

```typescript
import { isPolicyOwner, isCollaborator, isReviewer, isApprover, canPublish } from "@/lib/policyRelationships";

// Keep RBAC checks
export function canViewReports(user: SessionUser): boolean {
  const role = normalizeRole(user.role);
  return role === "OIC Director" || role === "Division Chief";
}

// Update workflow checks to use relationship helpers
export function canEditPolicyRecord(user: SessionUser, policy: Pick<Policy, "createdBy" | "uploadedBy" | "accessEmails">): boolean {
  const role = normalizeRole(user.role);
  if (role === "OIC Director" || role === "Division Chief") return true;
  return isPolicyOwner(user, policy) || isCollaborator(user, policy);
}

export function canGrantPolicyAccess(user: SessionUser, policy: Pick<Policy, "createdBy" | "uploadedBy">): boolean {
  if (isOicDirector(user) || isDivisionChief(user)) return true;
  return isPolicyOwner(user, policy);
}

export function canPublishPolicy(user: SessionUser): boolean {
  return canPublish(user);  // ✅ Uses relationship helper
}
```

---

### STEP 5: Update Controllers

**File:** `backend/controllers/policyController.ts` (Update)

Replace all instances of:
```typescript
// ❌ BAD
if (user.role === "Policy Owner")
if (user.role === "Publisher")
if (user.role === "Collaborator")
```

With:
```typescript
// ✅ GOOD
import { isPolicyOwner, isCollaborator, canPublish } from "../utils/policyRelationships";

if (isPolicyOwner(currentUser, policy))
if (canPublish(currentUser))
if (isCollaborator(currentUser, policy))
```

---

### STEP 6: Update Workflow Engine

**File:** `backend/workflow/workflowRules.ts` (Update)

```typescript
import { canPublish } from "../utils/policyRelationships";

case "FINAL_DOCUMENT_UPLOADED": {
  const uploaderDivision = event.metadata?.uploaderDivision;
  
  // ✅ Use relationship helper instead of checking role
  if (
    uploaderDivision === "PPMED" &&
    currentState === "Approved" &&
    canTransition(currentState, "Published")
  ) {
    result.stateChange = "Published";
    result.remarks = buildRemarkEntry("Final document uploaded, policy published", new Date());
    policy.publishedAt = new Date();
  }
  break;
}
```

---

### STEP 7: Update Frontend Access Control

**File:** `src/lib/access-control.ts` (Frontend)

```typescript
import { isPolicyOwner, isCollaborator, canPublish } from "@/lib/policyRelationships";

export function canEditPolicyRecord(user: SessionUser, policy: Policy): boolean {
  const role = normalizeRole(user.role);
  if (role === "OIC Director" || role === "Division Chief") return true;
  return isPolicyOwner(user, policy) || isCollaborator(user, policy);
}

export function canPublishPolicy(user: SessionUser): boolean {
  return canPublish(user);
}
```

---

### STEP 8: Update Frontend Components

**File:** `src/pages/PolicyTrackerPage.tsx` (Update)

Replace:
```typescript
// ❌ BAD
disabled={currentUser.role === "Policy Owner"}
disabled={currentUser.role === "Viewer"}
```

With:
```typescript
// ✅ GOOD
import { isPolicyOwner, isCollaborator } from "@/lib/policyRelationships";

disabled={!isPolicyOwner(currentUser, policy)}
disabled={!canEditPolicyRecord(currentUser, policy)}
```

---

## Migration Checklist

### Phase 1: Create New Utilities
- [ ] Create `backend/utils/policyRelationships.ts`
- [ ] Create `src/lib/policyRelationships.ts` (frontend version)
- [ ] Add comprehensive tests

### Phase 2: Update RBAC Layer
- [ ] Update `backend/utils/ownership.ts`
- [ ] Update `src/lib/access-control.ts`
- [ ] Remove fake roles from checks

### Phase 3: Update Data Models
- [ ] Update `backend/models/User.ts` - remove fake roles
- [ ] Verify no migrations needed (roles are just strings)
- [ ] Update seed data

### Phase 4: Update Controllers
- [ ] Search for `role === "Policy Owner"`
- [ ] Search for `role === "Publisher"`
- [ ] Search for `role === "Collaborator"`
- [ ] Replace with relationship helpers

### Phase 5: Update Workflow Engine
- [ ] Update `backend/workflow/workflowRules.ts`
- [ ] Update `backend/workflow/workflowEngine.ts`
- [ ] Update `backend/services/policyAutomationService.ts`

### Phase 6: Update Frontend
- [ ] Update `src/lib/access-control.ts`
- [ ] Update all components using role checks
- [ ] Update conditional rendering

### Phase 7: Testing
- [ ] Unit tests for relationship helpers
- [ ] Integration tests for all phases
- [ ] UAT with new role model
- [ ] Security testing

### Phase 8: Deployment
- [ ] Deploy to development
- [ ] Run full test suite
- [ ] Deploy to staging
- [ ] Final UAT
- [ ] Deploy to production

---

## Benefits of This Refactor

✅ **Cleaner Architecture**
- RBAC roles are truly system-level
- Workflow roles are policy-specific
- No confusion between the two

✅ **Better Scalability**
- Easy to add new workflow roles
- No need to modify User schema
- Dynamic role computation

✅ **Improved Security**
- Clear separation of concerns
- Easier to audit permissions
- Less chance of privilege escalation

✅ **Better Maintainability**
- Single source of truth for each role type
- Easier to test
- Clearer code intent

✅ **No Breaking Changes**
- Workflow engine unchanged
- Automation still works
- Backward compatible

---

## Code Examples

### Before (Mixed Model)
```typescript
// ❌ Confusing - is this RBAC or workflow?
if (user.role === "Policy Owner") {
  // Can edit policy
}

if (user.role === "Publisher") {
  // Can publish
}

if (user.role === "Collaborator") {
  // Can access
}
```

### After (Clean Separation)
```typescript
// ✅ Clear - RBAC check
if (user.role === "OIC Director") {
  // System-wide authority
}

// ✅ Clear - Workflow check
if (isPolicyOwner(user, policy)) {
  // Can edit this specific policy
}

if (canPublish(user)) {
  // User's division is PPMED
}

if (isCollaborator(user, policy)) {
  // User is in policy's accessEmails
}
```

---

## Impact Analysis

| Component | Impact | Effort |
|-----------|--------|--------|
| User Schema | Minimal | Low |
| RBAC Utility | Update | Low |
| Controllers | Refactor | Medium |
| Workflow Engine | Minimal | Low |
| Frontend | Refactor | Medium |
| Tests | Update | Medium |
| Documentation | Update | Low |

**Total Effort:** ~2-3 days for complete refactor

---

## Backward Compatibility

✅ **No database migrations needed**
- Roles are just strings
- Existing data remains valid
- Can deploy gradually

✅ **No API changes**
- Same endpoints
- Same request/response format
- Same behavior

✅ **Gradual Migration**
- Can refactor one component at a time
- Old and new code can coexist
- No big bang deployment

---

## Recommendation

This refactor is **highly recommended** because:

1. **Improves code clarity** - Clear separation of concerns
2. **Reduces bugs** - Less confusion about role types
3. **Scales better** - Easy to add new workflow roles
4. **Maintains security** - Better permission model
5. **Low risk** - Backward compatible, gradual migration

**Estimated Timeline:** 2-3 days for complete refactor

---

## Next Steps

1. Review this plan
2. Approve refactor approach
3. Create `policyRelationships.ts` utility
4. Update RBAC layer
5. Refactor controllers
6. Update frontend
7. Run comprehensive tests
8. Deploy gradually

