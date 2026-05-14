# RBAC Refactor - Step-by-Step Migration Guide

## Overview

This guide walks through migrating from a mixed RBAC/workflow role model to a clean separation of concerns.

**Timeline:** 2-3 days  
**Risk Level:** Low (backward compatible)  
**Breaking Changes:** None

---

## Phase 1: Create New Utilities (Day 1 - 1 hour)

### Step 1.1: Create Backend Utility

**File:** `backend/utils/policyRelationships.ts`

✅ Already created - contains:
- `isPolicyOwner()`
- `isCollaborator()`
- `isReviewer()`
- `isApprover()`
- `canPublish()`
- `getWorkflowRoles()`

### Step 1.2: Create Frontend Utility

**File:** `src/lib/policyRelationships.ts`

✅ Already created - same functions as backend

### Step 1.3: Add Tests

**File:** `backend/utils/__tests__/policyRelationships.test.ts`

```typescript
import { isPolicyOwner, isCollaborator, isReviewer } from "../policyRelationships";

describe("Policy Relationships", () => {
  const mockUser = {
    identifier: "user1",
    email: "user@dict.gov.ph",
    name: "Test User",
    role: "Division Member",
    division: "PRAD",
  };

  const mockPolicy = {
    createdBy: "user1",
    uploadedBy: "user1",
    accessEmails: ["collaborator@dict.gov.ph"],
    reviewers: ["reviewer@dict.gov.ph"],
    approvalChain: [{ approverEmail: "approver@dict.gov.ph", approved: false }],
  };

  test("isPolicyOwner returns true for creator", () => {
    expect(isPolicyOwner(mockUser, mockPolicy)).toBe(true);
  });

  test("isCollaborator returns true for owner", () => {
    expect(isCollaborator(mockUser, mockPolicy)).toBe(true);
  });

  test("isReviewer returns false for non-reviewer", () => {
    expect(isReviewer(mockUser, mockPolicy)).toBe(false);
  });
});
```

---

## Phase 2: Update RBAC Layer (Day 1 - 1 hour)

### Step 2.1: Update User Schema

**File:** `backend/models/User.ts`

**Before:**
```typescript
const userRoles = [
  "OIC Director",
  "Admin",
  "Division Chief",
  "Division Member",
  "Policy Owner",      // ❌ Remove
  "Policy Access",     // ❌ Remove
  "Viewer",
] as const;
```

**After:**
```typescript
const userRoles = [
  "OIC Director",
  "Admin",
  "Division Chief",
  "Division Member",
  "Viewer",
] as const;
```

### Step 2.2: Update Ownership Utility

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
export function isOicDirector(user: SessionUser): boolean { ... }
export function isDivisionChief(user: SessionUser): boolean { ... }
```

### Step 2.3: Update Access Control

**File:** `src/lib/access-control.ts`

**Before:**
```typescript
export function isPolicyOwner(user: SessionUser, policy: Pick<Policy, "createdBy" | "uploadedBy">): boolean {
  const byIdentifier = normalizeText(user.identifier);
  const byName = normalizeText(user.name);
  const createdBy = normalizeText(policy.createdBy);
  const uploadedBy = normalizeText(policy.uploadedBy);
  return createdBy === byIdentifier || uploadedBy === byIdentifier || createdBy === byName || uploadedBy === byName;
}
```

**After:**
```typescript
// Import from policyRelationships instead
import { isPolicyOwner, isCollaborator } from "@/lib/policyRelationships";

// Use the imported functions
export function canEditPolicyRecord(user: SessionUser, policy: Pick<Policy, "accessEmails" | "createdBy" | "uploadedBy">): boolean {
  const role = normalizeRole(user.role);
  if (role === "OIC Director" || role === "Division Chief") return true;
  return isPolicyOwner(user, policy) || isCollaborator(user, policy);
}
```

---

## Phase 3: Update Controllers (Day 1-2 - 2 hours)

### Step 3.1: Search and Replace

Search for these patterns in `backend/controllers/`:

```bash
# Find all instances
grep -r "role === \"Policy Owner\"" backend/controllers/
grep -r "role === \"Publisher\"" backend/controllers/
grep -r "role === \"Collaborator\"" backend/controllers/
grep -r "role === \"Reviewer\"" backend/controllers/
```

### Step 3.2: Update Policy Controller

**File:** `backend/controllers/policyController.ts`

**Before:**
```typescript
if (currentUser.role === "Policy Owner") {
  // Can edit
}
```

**After:**
```typescript
import { isPolicyOwner } from "../utils/policyRelationships";

if (isPolicyOwner(currentUser, policy)) {
  // Can edit
}
```

### Step 3.3: Update All Controllers

Apply same pattern to:
- `documentController.ts`
- `accessRequestController.ts`
- Any other controller using role checks

---

## Phase 4: Update Workflow Engine (Day 2 - 1 hour)

### Step 4.1: Update Workflow Rules

**File:** `backend/workflow/workflowRules.ts`

**Before:**
```typescript
case "FINAL_DOCUMENT_UPLOADED": {
  const uploaderDivision = event.metadata?.uploaderDivision;
  if (uploaderDivision === "PPMED" && currentState === "Approved") {
    // Publish
  }
}
```

**After:**
```typescript
import { canPublish } from "../utils/policyRelationships";

case "FINAL_DOCUMENT_UPLOADED": {
  const uploaderDivision = event.metadata?.uploaderDivision;
  if (uploaderDivision === "PPMED" && currentState === "Approved") {
    // Publish - division already validated server-side
  }
}
```

### Step 4.2: Update Workflow Engine

**File:** `backend/workflow/workflowEngine.ts`

No changes needed - workflow engine doesn't check roles directly.

---

## Phase 5: Update Frontend (Day 2 - 2 hours)

### Step 5.1: Update Access Control

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

### Step 5.2: Update Components

**File:** `src/pages/PolicyTrackerPage.tsx`

**Before:**
```typescript
disabled={currentUser.role === "Viewer"}
disabled={currentUser.role === "Policy Owner"}
```

**After:**
```typescript
import { isPolicyOwner, isCollaborator } from "@/lib/policyRelationships";

disabled={!canEditPolicyRecord(currentUser, p)}
disabled={!isPolicyOwner(currentUser, p)}
```

### Step 5.3: Update All Components

Search for role checks in:
- `PolicyTrackerPage.tsx`
- `PolicyDetailsPage.tsx`
- `AccessRequestsPage.tsx`
- Any component using role checks

---

## Phase 6: Update Seed Data (Day 2 - 30 min)

### Step 6.1: Update Seed Users

**File:** `backend/seeds/seedDefaultUsers.ts`

**Before:**
```typescript
{
  identifier: "policy.owner@dict.gov.ph",
  email: "policy.owner@dict.gov.ph",
  role: "Policy Owner",  // ❌ Remove
}
```

**After:**
```typescript
{
  identifier: "prad.member@dict.gov.ph",
  email: "prad.member@dict.gov.ph",
  role: "Division Member",  // ✅ Use RBAC role
  division: "PRAD",
}
```

---

## Phase 7: Testing (Day 2-3 - 2 hours)

### Step 7.1: Unit Tests

```bash
npm run test -- policyRelationships.test.ts
```

### Step 7.2: Integration Tests

```bash
npm run test:integration
```

### Step 7.3: UAT Tests

Execute UAT_TEST_CASES.md with new role model

---

## Phase 8: Deployment (Day 3 - 1 hour)

### Step 8.1: Development Deployment

```bash
git add .
git commit -m "refactor: separate RBAC from workflow roles"
npm run build
npm run dev
```

### Step 8.2: Run Tests

```bash
npm run test
npm run test:integration
```

### Step 8.3: Staging Deployment

```bash
git push origin main
# CI/CD deploys to staging
```

### Step 8.4: Production Deployment

```bash
# After staging verification
# CI/CD deploys to production
```

---

## Verification Checklist

### Code Changes
- [ ] `policyRelationships.ts` created (backend)
- [ ] `policyRelationships.ts` created (frontend)
- [ ] User schema updated (removed fake roles)
- [ ] `ownership.ts` updated (removed duplicate functions)
- [ ] `access-control.ts` updated (uses new utilities)
- [ ] All controllers updated (uses relationship helpers)
- [ ] All components updated (uses relationship helpers)
- [ ] Workflow engine verified (no changes needed)

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] UAT tests pass
- [ ] Security tests pass
- [ ] No regressions

### Deployment
- [ ] Development deployment successful
- [ ] Staging deployment successful
- [ ] Production deployment successful
- [ ] Monitoring shows no errors

---

## Rollback Plan

If issues arise:

### Quick Rollback
```bash
git revert <commit-hash>
npm run build
npm run dev
```

### Data Rollback
No database changes needed - roles are just strings.

### Estimated Rollback Time
< 5 minutes

---

## Migration Validation

### Before Migration
```typescript
// ❌ Mixed model
user.role === "Policy Owner"
user.role === "Publisher"
user.role === "Collaborator"
```

### After Migration
```typescript
// ✅ Clean separation
isPolicyOwner(user, policy)
canPublish(user)
isCollaborator(user, policy)
```

---

## Success Criteria

- ✅ All fake roles removed from User schema
- ✅ All role checks use relationship helpers
- ✅ All tests pass
- ✅ No breaking changes
- ✅ Backward compatible
- ✅ Production deployment successful

---

## Timeline Summary

| Phase | Duration | Status |
|-------|----------|--------|
| Create utilities | 1 hour | ✅ Done |
| Update RBAC layer | 1 hour | ⏳ Ready |
| Update controllers | 2 hours | ⏳ Ready |
| Update workflow | 1 hour | ⏳ Ready |
| Update frontend | 2 hours | ⏳ Ready |
| Update seed data | 30 min | ⏳ Ready |
| Testing | 2 hours | ⏳ Ready |
| Deployment | 1 hour | ⏳ Ready |
| **TOTAL** | **~10 hours** | **⏳ Ready** |

---

## Next Steps

1. Review this migration guide
2. Approve refactor approach
3. Execute Phase 1 (create utilities)
4. Execute Phase 2 (update RBAC)
5. Execute Phase 3 (update controllers)
6. Execute Phase 4 (update workflow)
7. Execute Phase 5 (update frontend)
8. Execute Phase 6 (update seed data)
9. Execute Phase 7 (testing)
10. Execute Phase 8 (deployment)

---

**Status:** ✅ Ready to execute

