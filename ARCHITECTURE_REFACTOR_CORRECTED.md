# Architecture Refactor: RBAC vs Workflow Roles (CORRECTED)

## Problem Statement

Your current architecture mixes:
- **RBAC Roles** (stored in database)
- **Workflow Roles** (contextual, policy-specific)
- **Ownership Roles** (derived from relationships)

This creates confusion and code duplication.

---

## Current State (Mixed Model)

### Stored Roles (5 roles)
```
OIC Director
Division Chief
Division Member
Policy Owner          ❌ Should be derived
Policy Access         ❌ Should be derived
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

### True RBAC Roles (3 roles - stored in database)
```
OIC Director          ✅ System-wide authority
Division Chief        ✅ Division-level authority
Division Member       ✅ Standard user
```

### Dynamic Workflow Roles (Computed per-policy)
```
Policy Owner          ✅ Derived from policy.createdBy
Collaborator          ✅ Derived from policy.accessEmails
Reviewer              ✅ Derived from policy.reviewers
Approver              ✅ Derived from policy.approvalChain
Publisher             ✅ Derived from user.division === "PPMED"
```

---

## Implementation Plan

### STEP 1: Create Policy Relationships Utility

**File:** `backend/utils/policyRelationships.ts`

```typescript
import type { SessionUser } from "./ownership";

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

### STEP 2: Update User Schema

**File:** `backend/models/User.ts`

**Before:**
```typescript
const userRoles = [
  "OIC Director",
  "Division Chief",
  "Division Member",
  "Policy Owner",      // ❌ Remove
  "Policy Access",     // ❌ Remove
] as const;
```

**After:**
```typescript
const userRoles = [
  "OIC Director",
  "Division Chief",
  "Division Member",
] as const;
```

---

### STEP 3: Update Ownership Utility

**File:** `backend/utils/ownership.ts`

**Remove these functions:**
```typescript
// ❌ DELETE - moved to policyRelationships.ts
export function isPolicyOwner(user: SessionUser, policy: PolicyAccessRecord): boolean { ... }
export function hasPolicyAccess(user: SessionUser, policy: PolicyAccessRecord): boolean { ... }
```

**Keep these functions:**
```typescript
// ✅ KEEP - these are RBAC checks
export function isPrivilegedUser(user: SessionUser): boolean { ... }
export function isOicDirector(user: SessionUser): boolean {
  return user.role === "OIC Director";
}
export function isDivisionChief(user: SessionUser): boolean {
  return user.role === "Division Chief";
}
export function isDivisionMember(user: SessionUser): boolean {
  return user.role === "Division Member";
}
```

---

### STEP 4: Update Access Control

**File:** `src/lib/access-control.ts`

```typescript
import { isPolicyOwner, isCollaborator, canPublish } from "@/lib/policyRelationships";

export function canEditPolicyRecord(user: SessionUser, policy: Pick<Policy, "accessEmails" | "createdBy" | "uploadedBy">): boolean {
  const role = normalizeRole(user.role);
  if (role === "OIC Director" || role === "Division Chief") return true;
  return isPolicyOwner(user, policy) || isCollaborator(user, policy);
}

export function canPublishPolicy(user: SessionUser): boolean {
  return canPublish(user);
}
```

---

### STEP 5: Update Controllers

**File:** `backend/controllers/policyController.ts`

Replace all instances of:
```typescript
// ❌ BAD
if (user.role === "Policy Owner")
if (user.role === "Policy Access")
```

With:
```typescript
// ✅ GOOD
import { isPolicyOwner, isCollaborator } from "../utils/policyRelationships";

if (isPolicyOwner(currentUser, policy))
if (isCollaborator(currentUser, policy))
```

---

### STEP 6: Update Frontend Components

**File:** `src/pages/PolicyTrackerPage.tsx`

Replace:
```typescript
// ❌ BAD
disabled={currentUser.role === "Policy Owner"}
disabled={currentUser.role === "Policy Access"}
```

With:
```typescript
// ✅ GOOD
import { isPolicyOwner, isCollaborator } from "@/lib/policyRelationships";

disabled={!isPolicyOwner(currentUser, policy)}
disabled={!isCollaborator(currentUser, policy)}
```

---

### STEP 7: Update Seed Data

**File:** `backend/utils/seedDefaultUsers.ts`

No changes needed - seed data already uses correct RBAC roles (OIC Director, Division Chief, Division Member).

---

## Migration Checklist

### Phase 1: Create New Utilities
- [ ] Create `backend/utils/policyRelationships.ts`
- [ ] Create `src/lib/policyRelationships.ts` (frontend version)
- [ ] Add comprehensive tests

### Phase 2: Update Data Models
- [ ] Update `backend/models/User.ts` - remove Policy Owner and Policy Access
- [ ] Verify no migrations needed (roles are just strings)
- [ ] Update any existing users with fake roles

### Phase 3: Update RBAC Layer
- [ ] Update `backend/utils/ownership.ts`
- [ ] Update `src/lib/access-control.ts`
- [ ] Remove fake role checks

### Phase 4: Update Controllers
- [ ] Search for `role === "Policy Owner"`
- [ ] Search for `role === "Policy Access"`
- [ ] Replace with relationship helpers

### Phase 5: Update Frontend
- [ ] Update `src/lib/access-control.ts`
- [ ] Update all components using role checks
- [ ] Update conditional rendering

### Phase 6: Testing
- [ ] Unit tests for relationship helpers
- [ ] Integration tests for all phases
- [ ] UAT with new role model
- [ ] Security testing

### Phase 7: Deployment
- [ ] Deploy to development
- [ ] Run full test suite
- [ ] Deploy to staging
- [ ] Final UAT
- [ ] Deploy to production

---

## Benefits of This Refactor

✅ **Cleaner Architecture**
- RBAC roles are truly system-level (3 roles)
- Workflow roles are policy-specific (5 roles)
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

if (user.role === "Policy Access") {
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
4. Update User schema
5. Refactor controllers
6. Update frontend
7. Run comprehensive tests
8. Deploy gradually

