# PolicyTrackerPage Integration Guide

## Overview
This guide shows how to update `src/pages/PolicyTrackerPage.tsx` to use `PolicyAutomationService` instead of direct policy mutations.

## Step 1: Add Import

Add this import at the top of PolicyTrackerPage.tsx:

```typescript
import { PolicyAutomationService } from "@/lib/api/automationService";
```

## Step 2: Update handleShareSave Function

**Before:**
```typescript
const handleShareSave = () => {
  // ... validation code ...
  
  const sharedPolicy: ManagedPolicy = {
    ...selectedPolicy,
    accessEmails: Array.from(new Set([...(selectedPolicy.accessEmails ?? []), memberRecord.email])),
    lastUpdated: now,
    remarks: appendRemarkHistory(selectedPolicy, shareNote.trim() || `Shared access with ${memberRecord.name} (${shareDivision})`, now),
  };
  setPolicies((current) => current.map((p) => (p.id === selectedPolicy.id ? sharedPolicy : p)));
  void updatePolicyInApi(selectedPolicy.id, sharedPolicy);
  
  registerPolicyAction(
    selectedPolicy,
    `Granted document access to ${memberRecord.name}`,
    "update",
    getNotificationRecipients(selectedPolicy, [memberRecord.email])
  );
  
  setShareOpen(false);
  toast({ title: "Access updated", description: `${memberRecord.name} now has access to this document.` });
};
```

**After:**
```typescript
const handleShareSave = async () => {
  if (!selectedPolicy || !shareDivision || !shareMember) {
    return;
  }

  if (!canGrantPolicyAccess(currentUser, selectedPolicy)) {
    toast({ title: "Access denied", description: "Only the policy owner or OIC Director can grant access.", variant: "destructive" });
    return;
  }

  const memberRecord = divisionMembers[shareDivision].find((member) => member.email === shareMember);
  if (!memberRecord) {
    return;
  }

  try {
    // Use automation service instead of direct mutation
    await PolicyAutomationService.grantAccess(selectedPolicy.id, memberRecord.email);
    
    setShareOpen(false);
    toast({ title: "Access updated", description: `${memberRecord.name} now has access to this document.` });
  } catch (error) {
    toast({
      title: "Failed to grant access",
      description: error instanceof Error ? error.message : "Unable to grant access at this time.",
      variant: "destructive",
    });
  }
};
```

## Step 3: Update handleArchiveConfirm Function

**Before:**
```typescript
const handleArchiveConfirm = () => {
  // ... validation code ...
  
  const archivedPolicy: ManagedPolicy = {
    ...selectedPolicy,
    archived: true,
    status: "On Hold",
    lastUpdated: now,
    remarks: appendRemarkHistory(selectedPolicy, "Archived and retained for records management", now),
  };
  setPolicies((current) => current.map((p) => (p.id === selectedPolicy.id ? archivedPolicy : p)));
  void updatePolicyInApi(selectedPolicy.id, archivedPolicy);
  
  // ... document archiving code ...
  
  registerPolicyAction(selectedPolicy, "Archived policy and linked documents", "status", getNotificationRecipients(selectedPolicy));
  
  setArchiveOpen(false);
  toast({ title: "Document archived", description: "The policy and linked documents were archived and retained before deletion." });
};
```

**After:**
```typescript
const handleArchiveConfirm = async () => {
  if (!selectedPolicy) {
    return;
  }

  if (!canArchivePolicyRecord(currentUser, selectedPolicy)) {
    toast({ title: "Access denied", description: "You do not have permission to archive this policy.", variant: "destructive" });
    return;
  }

  try {
    // Use automation service instead of direct mutation
    await PolicyAutomationService.archivePolicy(selectedPolicy.id);
    
    // Archive related documents
    const relatedDocuments = loadDocumentsFromStorage();
    const now = new Date().toISOString().slice(0, 10);
    const archivedDocuments = relatedDocuments.map((doc) => {
      if (doc.policyId !== selectedPolicy.id && doc.policyNumber !== selectedPolicy.policyNumber) {
        return doc;
      }

      return {
        ...doc,
        status: "Archived" as const,
        lastEdited: now,
        remarks: `${now} | Archived with policy ${selectedPolicy.policyNumber}`,
      };
    });

    saveDocumentsToStorage(archivedDocuments);
    
    setArchiveOpen(false);
    toast({ title: "Document archived", description: "The policy and linked documents were archived and retained before deletion." });
  } catch (error) {
    toast({
      title: "Failed to archive policy",
      description: error instanceof Error ? error.message : "Unable to archive policy at this time.",
      variant: "destructive",
    });
  }
};
```

## Step 4: Update handleEditSave Function

**Key Change:** After saving policy updates, emit workflow event for document upload:

```typescript
const handleEditSave = async () => {
  // ... existing validation and update code ...
  
  if (editVersionFile) {
    const docType = getDocumentTypeFromFilename(editVersionFile.name);
    if (!docType) {
      uploadError = true;
    } else {
      try {
        // ... existing document upload code ...
        
        saveDocumentsToStorage([nextDoc, ...allDocuments]);
        uploadedVersion = true;
        
        // Emit workflow event for document upload
        await PolicyAutomationService.uploadDocument(
          selectedPolicy.id,
          editVersionFile.name
        );
      } catch {
        uploadError = true;
      }
    }
  }
  
  // ... rest of function ...
};
```

## Step 5: Update handleAddPolicy Function

**Key Change:** After creating policy, emit workflow event:

```typescript
const handleAddPolicy = async () => {
  // ... existing validation code ...
  
  let savedPolicy: ManagedPolicy;
  try {
    savedPolicy = await createPolicyInApi(newPolicyPayload) as ManagedPolicy;
  } catch {
    toast({
      title: "Failed to create policy",
      description: "Could not save the policy to the server. Please try again.",
      variant: "destructive",
    });
    return;
  }

  // ... existing document creation code ...
  
  // Emit workflow event for policy creation
  try {
    // The backend will emit POLICY_CREATED event automatically
    // But we can also trigger document upload events
    for (const doc of createdDocuments) {
      await PolicyAutomationService.uploadDocument(
        savedPolicy.id,
        doc.name
      );
    }
  } catch (error) {
    logger.error("Failed to emit workflow events", error);
    // Don't fail the operation if events fail
  }
  
  // ... rest of function ...
};
```

## Key Benefits of Using PolicyAutomationService

1. **Centralized Workflow Logic**: All automation happens on the backend
2. **Consistent State**: Backend is source of truth for workflow state
3. **Automatic Activity Logging**: Every action creates audit trail
4. **Automatic Notifications**: Collaborators notified of changes
5. **Automatic Timeline**: Structured workflow history maintained
6. **Reduced Frontend Complexity**: No need to manage workflow state locally

## Important Notes

- All `PolicyAutomationService` methods are async and should be awaited
- Errors are thrown and should be caught with try/catch
- The backend workflow engine handles all state transitions
- Frontend should not directly mutate `workflowState` or `approvalChain`
- Use `updatePolicyInApi` only for non-workflow updates (metadata, remarks, etc.)

## Testing the Integration

After making these changes:

1. Create a new policy - should automatically transition to "Assigned" state
2. Grant access - should trigger "Collaborating" state if conditions met
3. Upload document - should update lastActivityAt
4. Archive policy - should transition to "Archived" state
5. Check activity log - all actions should be recorded
6. Check notifications - collaborators should receive updates

## Migration Path

You can migrate functions one at a time:
1. Start with `handleShareSave` (simplest)
2. Then `handleArchiveConfirm`
3. Then `handleEditSave` (document upload)
4. Finally `handleAddPolicy` (policy creation)

Each function can work independently with the automation service.
