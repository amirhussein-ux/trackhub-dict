# TrackHub Smart Policy Status Automation — Implementation Guide

## Overview

The Smart Policy Status Automation system has been implemented as a clean extension to TrackHub's existing architecture. This guide explains the components, integration points, and how to use the system.

---

## Architecture Components

### 1. Workflow Types (`backend/workflow/workflowTypes.ts`)

Defines all workflow event types, states, and data structures:

- **WorkflowEventType**: 11 event types covering the entire policy lifecycle
- **WorkflowEvent**: Event structure with policyId, triggeredBy, and metadata
- **WorkflowState**: 11 workflow states from Draft to Archived
- **ApprovalChainEntry**: Tracks individual approvals with timestamps
- **TimelineEntry**: Structured workflow history entries

### 2. Workflow Transitions (`backend/workflow/workflowTransitions.ts`)

Enforces valid state transitions:

```
Draft → Assigned → Collaborating → For Review → Under Review 
  → Pending Approval → Approved → Published → Archived
```

Also supports rejection paths:
```
Under Review → Returned for Revision → For Review
Pending Approval → Rejected → Returned for Revision
```

### 3. Workflow Event Emitter (`backend/workflow/workflowEvents.ts`)

Centralized event dispatcher that:
- Logs all workflow events
- Delegates to workflow engine
- Handles errors gracefully

### 4. Workflow Helpers (`backend/workflow/workflowHelpers.ts`)

Utility functions for:
- Transition validation with conditions
- Remark history management
- Approval progress tracking
- Collaborator detection

### 5. Workflow Rules (`backend/workflow/workflowRules.ts`)

Business logic for each event type:

| Event | Conditions | Action |
|-------|-----------|--------|
| POLICY_CREATED | - | Draft → Assigned |
| ACCESS_GRANTED | Has collaborators | Assigned → Collaborating |
| DOCUMENT_UPLOADED | - | Update lastActivityAt |
| REVIEW_READY | Has reviewers, documents | Collaborating → For Review |
| REVIEW_APPROVED | - | For Review → Under Review |
| APPROVAL_GRANTED | All approvals granted | Under Review → Pending Approval → Approved |
| FINAL_DOCUMENT_UPLOADED | PPMED member, Approved status | Approved → Published |
| POLICY_ARCHIVED | - | Any → Archived |

### 6. Workflow Engine (`backend/workflow/workflowEngine.ts`)

Central orchestrator that:
- Processes workflow events
- Evaluates rules
- Applies state changes
- Creates activities
- Sends notifications
- Updates timestamps

### 7. Timeline Service (`backend/services/timelineService.ts`)

Manages structured workflow history:
- Add timeline entries
- Query by event type, actor, date range
- Format for display
- Get latest entry

### 8. Policy Automation Service (`backend/services/policyAutomationService.ts`)

High-level API for triggering workflow actions:
- `markReviewReady()`
- `grantApproval()`
- `rejectApproval()`
- `grantAccess()`
- `uploadDocument()`
- `publishPolicy()`
- `archivePolicy()`

### 9. Stale Policy Job (`backend/jobs/stalePolicyJob.ts`)

Automated background job that:
- Runs daily at 9 AM
- Detects policies under review for 7+ days
- Sends reminders to reviewers
- Escalates to OIC Director after 14 days
- Marks policies as escalated

---

## Integration Points

### 1. Policy Model Extension

Add these fields to `backend/models/Policy.ts`:

```typescript
workflowState: {
  type: String,
  enum: ["Draft", "Assigned", "Collaborating", "For Review", "Under Review", 
         "Pending Approval", "Approved", "Published", "Archived", "Rejected", 
         "Returned for Revision"],
  default: "Draft"
},

reviewReady: {
  type: Boolean,
  default: false
},

approvalChain: [{
  approverEmail: String,
  approved: Boolean,
  approvedAt: Date,
  rejectedAt: Date,
  rejectionReason: String
}],

reviewers: [String],

lastActivityAt: {
  type: Date,
  default: Date.now
},

deadline: Date,

escalated: {
  type: Boolean,
  default: false
},

publishedAt: Date,

archivedAt: Date,

timeline: [{
  timestamp: Date,
  event: String,
  actor: String,
  description: String,
  metadata: Object
}]
```

### 2. Controller Integration

In `backend/controllers/policyController.ts`, after successful operations:

```typescript
import { PolicyAutomationService } from "../services/policyAutomationService";

// After creating policy
await PolicyAutomationService.triggerWorkflowEvent(
  policy.id,
  "POLICY_CREATED",
  currentUser.email
);

// After granting access
await PolicyAutomationService.grantAccess(
  policyId,
  collaboratorEmail,
  currentUser.email
);

// After uploading document
await PolicyAutomationService.uploadDocument(
  policyId,
  documentName,
  currentUser.email
);
```

### 3. Server Initialization

In `backend/server.ts`, start the stale policy job:

```typescript
import { startStalePolicyJob } from "./jobs/stalePolicyJob";

connectDB()
  .then(async () => {
    await seedDefaultUsers();
    startStalePolicyJob(); // Add this line
    app.listen(PORT, () => {
      logger.info({ port: PORT }, "Server running");
    });
  })
  .catch((error) => {
    logger.error({ err: error }, "Failed to start server");
    process.exit(1);
  });
```

### 4. Frontend Integration

In `src/pages/PolicyTrackerPage.tsx`, replace direct status mutations:

**Before:**
```typescript
// DON'T DO THIS
await updatePolicyInApi(policy.id, { status: "Approved" });
```

**After:**
```typescript
// DO THIS
import { PolicyAutomationService } from "@/lib/api/automationService";

await PolicyAutomationService.grantApproval(
  policy.id,
  approverEmail,
  currentUser.email
);
```

---

## Usage Examples

### Example 1: Create Policy with Automation

```typescript
// Backend
const policy = await Policy.create({
  policyNumber: "RA-2026-001",
  title: "New ICT Policy",
  division: "PRAD",
  createdBy: user.name,
  // ... other fields
});

// Trigger automation
await emitWorkflowEvent({
  type: "POLICY_CREATED",
  policyId: policy.id,
  triggeredBy: user.email
});

// Result: workflowState automatically set to "Assigned"
```

### Example 2: Grant Access and Trigger Collaboration

```typescript
// Backend
await PolicyAutomationService.grantAccess(
  policyId,
  "maria.santos@dict.gov.ph",
  currentUser.email
);

// Result:
// - Email added to accessEmails
// - ACCESS_GRANTED event emitted
// - workflowState → Collaborating (if conditions met)
// - Activity logged
// - Notification sent to Maria
```

### Example 3: Mark Ready for Review

```typescript
// Backend
await PolicyAutomationService.markReviewReady(
  policyId,
  currentUser.email
);

// Result:
// - reviewReady set to true
// - REVIEW_READY event emitted
// - workflowState → For Review (if has reviewers and documents)
// - Activity logged
// - Notifications sent to reviewers
```

### Example 4: Grant Approval

```typescript
// Backend
await PolicyAutomationService.grantApproval(
  policyId,
  "juan.delacruz@dict.gov.ph",
  currentUser.email
);

// Result:
// - Approval recorded in approvalChain
// - APPROVAL_GRANTED event emitted
// - If all approvals granted: workflowState → Approved
// - Activity logged
// - Notifications sent
```

---

## Workflow State Diagram

```
┌─────────┐
│  Draft  │
└────┬────┘
     │ (ACCESS_GRANTED)
     ▼
┌──────────────┐
│ Collaborating│
└────┬─────────┘
     │ (REVIEW_READY)
     ▼
┌──────────┐
│For Review│
└────┬─────┘
     │ (REVIEW_APPROVED)
     ▼
┌──────────────┐
│ Under Review │
└────┬─────────┘
     │ (APPROVAL_GRANTED)
     ▼
┌──────────────────┐
│Pending Approval  │
└────┬─────────────┘
     │ (APPROVAL_GRANTED)
     ▼
┌──────────┐
│ Approved │
└────┬─────┘
     │ (FINAL_DOCUMENT_UPLOADED)
     ▼
┌───────────┐
│ Published │
└────┬──────┘
     │ (POLICY_ARCHIVED)
     ▼
┌──────────┐
│ Archived │
└──────────┘
```

---

## Automated Reminders

The stale policy job runs daily at 9 AM and:

1. **After 7 days** under review:
   - Sends reminder to all reviewers
   - Logs activity

2. **After 14 days** under review:
   - Marks policy as escalated
   - Notifies OIC Director
   - Flags in dashboard

---

## Activity and Notification Flow

Every workflow event automatically:

1. **Creates Activity Log Entry**
   - User who triggered action
   - Action description
   - Policy title
   - Activity type (create, update, upload, status)

2. **Sends Notifications**
   - To all collaborators (accessEmails)
   - Includes event type and state change
   - Marked as unread

3. **Updates Timeline**
   - Timestamp
   - Event type
   - Actor
   - Description
   - Metadata

---

## Backward Compatibility

The system maintains full backward compatibility:

- Existing policies work without `workflowState`
- Old status field still used for filtering
- Gradual migration possible
- No breaking changes to API

---

## Best Practices

1. **Always use PolicyAutomationService** for workflow actions
2. **Never directly mutate workflowState** in controllers
3. **Emit events after data persistence** to ensure consistency
4. **Use metadata** to pass additional context
5. **Check transition validity** before applying changes
6. **Log all automation decisions** for audit trail

---

## Monitoring and Debugging

Check logs for:
- Workflow event processing
- State transitions
- Escalations
- Failed automations

Example log entry:
```
{
  "eventType": "APPROVAL_GRANTED",
  "policyId": "507f1f77bcf86cd799439011",
  "stateChange": "Approved",
  "message": "Workflow event processed successfully"
}
```

---

## Future Enhancements

Potential additions:
- Custom workflow templates
- Conditional approval chains
- SLA tracking
- Workflow analytics dashboard
- Webhook integrations
- Email notifications
- Slack integration
