# Phase 7: Critical Integration Tests - Roadmap & Implementation
**Date**: May 17, 2026  
**Status**: 🎯 PLAN CREATED - Ready for Implementation

## Overview

Integration tests verify that all system components work together correctly. These tests:
- Execute complete workflows (auth → policy creation → approval → publish)
- Validate RBAC enforcement across all endpoints
- Ensure concurrent operations don't cause race conditions
- Verify error handling is consistent
- Confirm security measures work end-to-end

## Test Environment Setup

### Prerequisites
```bash
# .env.test
TEST_PORT=3001
TEST_DB_URL=mongodb://localhost:27017/trackhub-test
NODE_ENV=test
```

### Test Data Fixtures
```typescript
// testUsers: 4 pre-configured users representing all scenarios
- oicDirector: Full system access
- divisionChief: Admin features + division policies
- divisionMember: Only own division policies
- otherDivisionMember: Different division (for cross-division denial tests)
```

### Test Database Cleanup
- Each test: `beforeEach()` clears all collections
- Suite: `beforeAll()` connects to test DB
- Suite: `afterAll()` closes connection + stops server

## Test Suite Structure

### PHASE 1: AUTHENTICATION (7 tests)
**Purpose**: Verify login/logout/session mechanics

```typescript
✅ register new user successfully
✅ login with valid credentials
✅ reject login with invalid password
✅ reject inactive users on login
✅ logout and clear session
✅ return 401 for expired session
✅ validate email format on registration
```

**Key Checks**:
- Response contains user object with role/division
- Session cookie set with httpOnly, secure flags
- Password hashed (bcrypt), never returned in response
- Inactive users rejected immediately
- Logout clears ALL session data

### PHASE 2: RBAC (6 tests)
**Purpose**: Verify role-based access control enforcement

```typescript
✅ OIC Director accesses all resources
✅ Division Chief accesses admin features (Reports only, not Users)
✅ Division Member blocked from admin features
✅ Division Member cannot access other division policies
✅ Collaborators can access shared policies
✅ Privileged users can access all division policies
```

**Key Checks**:
- Non-privileged users get 403 on admin endpoints
- Division isolation enforced: `/api/policies?division=PPDD` only for PPDD members
- Ownership checks respected: Can only edit if owner or collaborator
- Collaborator emails properly propagated to related documents

### PHASE 3: WORKFLOW (8 tests)
**Purpose**: Verify policy workflow state machine

```typescript
✅ create policy in Draft state
✅ prevent self-approval when submitting for review
✅ transition to Under Review when submitted
✅ reject policy and return for revision
✅ approve policy when all reviewers approve
✅ publish policy (PPMED only)
✅ prevent double approvals
✅ auto-archive published policies after 365 days
```

**Key Checks**:
- Policy status/workflowState transitions correctly
- Approval chain includes correct reviewers (same division)
- Creator NOT in approval chain
- Rejection reason recorded, policy returns to On Progress
- Both reviewers must approve before status changes
- Only PPMED division can publish
- Published date set to current time
- Archive job runs daily, archives policies > 365 days old

### PHASE 4: DOCUMENTS (6 tests)
**Purpose**: Verify document upload/access control

```typescript
✅ upload document with valid format
✅ reject oversized files (>10MB)
✅ reject unsupported file types
✅ enforce document access control
✅ paginate document results
✅ grant document access to collaborators
```

**Key Checks**:
- MIME type validation: Only pdf, docx, xlsx, jpg, png
- File size check: 10MB limit enforced
- Unauthorized users get 403 on document access
- Pagination returns correct page + metadata (total, totalPages)
- Sharing policy access updates all related documents
- Search query DOS protection: Max 100 chars

### PHASE 5: SECURITY (7 tests)
**Purpose**: Verify security measures

```typescript
✅ rate limit repeated failed login attempts
✅ reject invalid/expired tokens
✅ enforce CORS on cross-origin requests
✅ set secure HTTP headers
✅ not expose sensitive error details
✅ validate search queries for DOS protection
✅ hash passwords securely
✅ prevent SQL injection attempts
```

**Key Checks**:
- 6 failed logins → 429 on attempt #6
- Invalid JWT → 401
- CORS: preflight options respected
- Response headers include CSP, HSTS, X-Frame-Options (from Helmet)
- Error response: `{ code, message }` (no stack traces)
- Search query > 100 chars → 400
- Password never returned in API responses
- Mongoose parameterization prevents injection

### PHASE 6: NOTIFICATIONS (4 tests)
**Purpose**: Verify notification system

```typescript
✅ create notifications on workflow events
✅ prevent N+1 notification queries
✅ filter notifications by recipient
✅ mark notifications as read
```

**Key Checks**:
- Approval submission creates notifications for reviewers
- Database query count: Single `insertMany()` call (not per-user loop)
- GET /notifications filters by `recipientEmail` in session
- Mark read sets `read: true` + timestamp

### PHASE 7: ERROR HANDLING (4 tests)
**Purpose**: Verify consistent error responses

```typescript
✅ return standardized error response format
✅ log errors for debugging
✅ handle database connection errors gracefully
✅ validate request payloads with Zod
```

**Key Checks**:
- All errors return `{ code: string, message: string, details?: object }`
- Error logged with timestamp, request ID, user
- Database connection loss → 500 with generic message
- Validation errors include field-level details

### PHASE 8: ASYNC/CONCURRENCY (3 tests)
**Purpose**: Verify concurrent operations are safe

```typescript
✅ handle concurrent policy approvals safely
✅ prevent race conditions in document access updates
✅ handle concurrent uploads to same policy
```

**Key Checks**:
- 2 concurrent approvals don't cause duplicate entries
- Concurrent grantAccess calls all apply
- 3 concurrent uploads create 3 documents (no lost updates)

## Implementation Priority

### Tier 1: Critical (Must have)
- Phase 1: Authentication (session security)
- Phase 2: RBAC (access control foundation)
- Phase 5: Security (OWASP top 10)

### Tier 2: Important (Should have)
- Phase 3: Workflow (business logic integrity)
- Phase 4: Documents (core feature)

### Tier 3: Nice to have (Could have)
- Phase 6: Notifications (nice UX)
- Phase 7: Error Handling (debugging)
- Phase 8: Concurrency (edge cases)

## Test Utilities to Create

### 1. User Helper
```typescript
async function createTestUser(user: Partial<UserType>): Promise<{ id: string, token: string }>
```

### 2. Login Helper
```typescript
async function loginAs(user: TestUser): Promise<{ cookie: string, user: SessionUser }>
```

### 3. API Request Helper
```typescript
async function apiAs(user: TestUser, method: string, path: string, body?: any)
```

### 4. Policy Helper
```typescript
async function createTestPolicy(creator: TestUser, data?: Partial<Policy>): Promise<Policy>
```

### 5. Document Helper
```typescript
async function uploadTestDocument(policy: Policy, file: Buffer): Promise<Document>
```

### 6. Workflow Helper
```typescript
async function submitPolicyForReview(policy: Policy, creator: TestUser): Promise<Policy>
async function approvePolicyAs(policy: Policy, reviewer: TestUser): Promise<Policy>
```

### 7. Assertion Helper
```typescript
function assertStatusCode(response: Response, expected: number)
function assertErrorCode(response: Response, code: string)
function assertPermissionDenied(response: Response)
```

## Expected Test Results

### Coverage Goals
- Authentication: 100% (4/4 paths)
- RBAC: 95% (all role combinations tested)
- Workflow: 90% (edge cases like concurrent approvals)
- Documents: 85% (covers main operations)
- Security: 100% (critical paths)
- Notifications: 80% (integration tested in workflow)

### Performance Baselines
- Auth endpoint: < 200ms
- Policy creation: < 500ms
- Document upload: < 1000ms (depends on file size)
- Approval submission: < 300ms
- Query operations: < 100ms

## Continuous Integration

### Pre-commit Checks
```bash
npm run test:integration
```

### Pre-deployment Checks
```bash
npm run test:integration -- --coverage
npm run test:integration -- --bail # Stop on first failure
```

## Known Test Gaps

### Current Gaps (to be added in future iterations)
- [ ] Email notification sending (requires mock SMTP)
- [ ] File storage integration (requires mock S3 or local FS)
- [ ] Third-party API integrations
- [ ] Load testing (concurrent users)
- [ ] Long-running background jobs

### Not in Scope
- UI integration tests (separate from backend tests)
- End-to-end browser tests (Playwright/Cypress)
- Performance testing (load testing tools)
- Security scanning (OWASP ZAP, Snyk)

## Success Criteria

### ✅ Phase 7 Complete When:
1. All 40+ integration tests written
2. All tests passing in CI/CD pipeline
3. Code coverage ≥ 85% for critical paths
4. No flaky tests (100% reliability)
5. Test execution < 60 seconds
6. Documentation updated with test results

## Related Documentation

- [RBAC Audit](./RBAC_AUDIT.md)
- [Workflow Integrity Audit](./WORKFLOW_INTEGRITY_AUDIT.md)
- [Frontend Route Guards Audit](./FRONTEND_ROUTE_GUARDS_AUDIT.md)
- [Architecture Refactor Plan](./ARCHITECTURE_REFACTOR_CORRECTED.md)

## Next Steps

1. **Create test utilities** (user, login, API, policy helpers)
2. **Implement Phase 1 tests** (authentication foundation)
3. **Implement Phase 2 tests** (RBAC validation)
4. **Run against current code** (verify all pass)
5. **Add Phase 3+ tests** (workflow, documents, security)
6. **Document results** in regression test suite
7. **Integrate into CI/CD** for continuous validation

## Conclusion

Phase 7 integration tests provide confidence that:
- ✅ Authentication is secure
- ✅ Authorization is enforced consistently
- ✅ Workflows execute correctly
- ✅ Data is protected
- ✅ Errors are handled gracefully
- ✅ System is ready for production

**Estimated Implementation Time**: 20-30 hours
**Priority**: HIGH (foundation for Phase 8 deployment)
