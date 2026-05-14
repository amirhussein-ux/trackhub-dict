# Complete User Testing Workflow - UAT Test Cases

## Test Execution Guide

**Total Test Cases:** 30  
**Estimated Duration:** 2-3 hours  
**Environment:** Development/Staging  
**Prerequisites:** All 3 fixes applied and deployed

---

## PHASE 1 — Policy Creation

### TC-P1-001: Create Policy with Initial Status

**Test Case ID:** TC-P1-001  
**Phase:** PHASE 1 - Policy Creation  
**Actor:** Division Member (prad.member@dict.gov.ph)  
**Preconditions:** User logged in, no policies exist with number RA-2024-001

**Steps:**
1. Navigate to Policy Tracker page
2. Click "Add Policy" button
3. Fill form:
   - Policy ID No.: `RA-2024-001`
   - Policy Title: `Test Policy Creation`
   - Policy Type: `Republic Act`
   - Responsible Division: `PRAD`
   - Remarks Comment: `Initial policy for testing`
4. Upload document: `test_policy.pdf`
5. Click "Add Policy" button

**Expected Results:**
- ✅ Policy created successfully
- ✅ Status = `"On Progress"` (immediately, no race condition)
- ✅ Workflow State = `"Draft"`
- ✅ Activity log entry created
- ✅ Notification sent to PRAD members
- ✅ Timeline entry created
- ✅ lastActivityAt updated to current timestamp
- ✅ Policy appears in tracker table

**Validation:**
```bash
# MongoDB validation
db.policies.findOne({policyNumber: "RA-2024-001"})
# Expected: status: "On Progress", workflowState: "Draft"

# Activity log validation
db.activitylogs.find({policyTitle: "Test Policy Creation"})
# Expected: action contains "Created new policy record"

# Notification validation
db.notifications.find({policyTitle: "Test Policy Creation"})
# Expected: changeType contains "New policy created"

# Timeline validation
db.policies.findOne({policyNumber: "RA-2024-001"}).timeline
# Expected: First entry has event: "POLICY_CREATED"
```

**Actual Result:** [To be filled during testing]  
**Pass/Fail:** [ ] PASS [ ] FAIL  
**Remarks:** 

---

## PHASE 2 — Collaboration Workflow

### TC-P2-001: Grant Collaborator Access

**Test Case ID:** TC-P2-001  
**Phase:** PHASE 2 - Collaboration Workflow  
**Actor:** Policy Owner (prad.member@dict.gov.ph)  
**Preconditions:** Policy RA-2024-001 exists in Draft state

**Steps:**
1. Open Policy RA-2024-001 details
2. Click "Share" button
3. Select Division: `PPDD`
4. Select Member: `Maria Santos (maria.santos@dict.gov.ph)`
5. Enter Remarks: `Granting collaboration access`
6. Click "Grant Access" button

**Expected Results:**
- ✅ accessEmails updated (maria.santos@dict.gov.ph added)
- ✅ Collaborator notified
- ✅ Activity logged
- ✅ workflowState changes to: `"Collaborating"`
- ✅ Remarks appended
- ✅ Timeline updated

**Validation:**
```bash
# Policy validation
db.policies.findOne({policyNumber: "RA-2024-001"})
# Expected: 
#   accessEmails includes "maria.santos@dict.gov.ph"
#   workflowState: "Collaborating"
#   status: "On Progress"

# Notification validation
db.notifications.findOne({recipientEmail: "maria.santos@dict.gov.ph", policyTitle: "Test Policy Creation"})
# Expected: changeType contains "You have been granted access"

# Activity validation
db.activitylogs.findOne({policyTitle: "Test Policy Creation", action: /Granted document access/})
# Expected: Found
```

**Actual Result:** [To be filled during testing]  
**Pass/Fail:** [ ] PASS [ ] FAIL  
**Remarks:** 

---

## PHASE 3 — Document Upload Workflow

### TC-P3-001: Upload Document Version

**Test Case ID:** TC-P3-001  
**Phase:** PHASE 3 - Document Upload Workflow  
**Actor:** Collaborator (maria.santos@dict.gov.ph)  
**Preconditions:** Policy RA-2024-001 exists, collaborator has access

**Steps:**
1. Login as maria.santos@dict.gov.ph
2. Open Policy RA-2024-001
3. Click "Edit" button
4. Upload new document: `policy_v2.docx`
5. Add remarks: `Version 2 with revisions`
6. Click "Save" button

**Expected Results:**
- ✅ Version increments automatically (v2)
- ✅ uploadedBy updated to maria.santos@dict.gov.ph
- ✅ Upload activity logged
- ✅ Collaborators notified
- ✅ lastActivityAt updated

**Validation:**
```bash
# Document validation
db.repositorydocuments.find({policyNumber: "RA-2024-001"}).sort({version: -1})
# Expected: Latest document has version: 2, uploadedBy: "maria.santos@dict.gov.ph"

# Activity validation
db.activitylogs.findOne({policyTitle: "Test Policy Creation", action: /Uploaded document version/})
# Expected: Found

# Notification validation
db.notifications.find({policyTitle: "Test Policy Creation", changeType: /New document version/})
# Expected: Sent to all accessEmails
```

**Actual Result:** [To be filled during testing]  
**Pass/Fail:** [ ] PASS [ ] FAIL  
**Remarks:** 

---

## PHASE 4 — Review Ready Workflow

### TC-P4-001: Mark Policy Ready for Review

**Test Case ID:** TC-P4-001  
**Phase:** PHASE 4 - Review Ready Workflow  
**Actor:** Policy Owner (prad.member@dict.gov.ph)  
**Preconditions:** Policy RA-2024-001 in Collaborating state with document uploaded

**Steps:**
1. Login as prad.member@dict.gov.ph
2. Open Policy RA-2024-001
3. Click "Mark Review Ready" button
4. Confirm action

**Expected Results:**
- ✅ Automatic transition happened
- ✅ workflowState → `"For Review"`
- ✅ status → `"Under Review"`
- ✅ Reviewers assigned (PRAD Division Chief)
- ✅ Remarks appended
- ✅ Notifications triggered to reviewers
- ✅ Audit trail preserved

**Validation:**
```bash
# Policy validation
db.policies.findOne({policyNumber: "RA-2024-001"})
# Expected:
#   workflowState: "For Review"
#   status: "Under Review"
#   reviewers: ["juan.delacruz@dict.gov.ph"] (PRAD Division Chief)
#   reviewReady: true

# Reviewer notification
db.notifications.findOne({recipientEmail: "juan.delacruz@dict.gov.ph", policyTitle: "Test Policy Creation"})
# Expected: changeType contains "Policy is ready for review"

# Timeline validation
db.policies.findOne({policyNumber: "RA-2024-001"}).timeline
# Expected: Latest entry has event: "REVIEW_READY"
```

**Actual Result:** [To be filled during testing]  
**Pass/Fail:** [ ] PASS [ ] FAIL  
**Remarks:** 

---

## PHASE 5 — Approval Workflow

### TC-P5-001: Approve Policy

**Test Case ID:** TC-P5-001  
**Phase:** PHASE 5 - Approval Workflow  
**Actor:** Division Chief (juan.delacruz@dict.gov.ph)  
**Preconditions:** Policy RA-2024-001 in For Review state

**Steps:**
1. Login as juan.delacruz@dict.gov.ph
2. Open Policy RA-2024-001
3. Click "Approve" button
4. Confirm approval

**Expected Results:**
- ✅ approvalChain updated
- ✅ approvedAt timestamp set
- ✅ workflowState → `"Approved"`
- ✅ status → `"Approved"`
- ✅ Notifications triggered
- ✅ Timeline updated

**Validation:**
```bash
# Policy validation
db.policies.findOne({policyNumber: "RA-2024-001"})
# Expected:
#   workflowState: "Approved"
#   status: "Approved"
#   approvalChain[0].approved: true
#   approvalChain[0].approvedAt: <timestamp>

# Notification validation
db.notifications.find({policyTitle: "Test Policy Creation", changeType: /Policy has been approved/})
# Expected: Sent to all accessEmails

# Timeline validation
db.policies.findOne({policyNumber: "RA-2024-001"}).timeline
# Expected: Latest entry has event: "APPROVAL_GRANTED"
```

**Actual Result:** [To be filled during testing]  
**Pass/Fail:** [ ] PASS [ ] FAIL  
**Remarks:** 

---

## PHASE 6 — Publication Workflow

### TC-P6-001: Publish Policy (PPMED Only)

**Test Case ID:** TC-P6-001  
**Phase:** PHASE 6 - Publication Workflow  
**Actor:** PPMED Publisher (pedro.reyes@dict.gov.ph)  
**Preconditions:** Policy RA-2024-001 in Approved state

**Steps:**
1. Login as pedro.reyes@dict.gov.ph (PPMED member)
2. Open Policy RA-2024-001
3. Click "Edit" button
4. Upload final signed PDF: `policy_final_signed.pdf`
5. Mark as "Final Document"
6. Click "Save" button

**Expected Results:**
- ✅ System checks: uploader division = PPMED ✓
- ✅ System checks: status = Approved ✓
- ✅ workflowState → `"Published"`
- ✅ status → `"Published"`
- ✅ publishedAt → timestamp set
- ✅ Activity logs created
- ✅ Notifications triggered

**Validation:**
```bash
# Policy validation
db.policies.findOne({policyNumber: "RA-2024-001"})
# Expected:
#   workflowState: "Published"
#   status: "Published"
#   publishedAt: <timestamp>

# Document validation
db.repositorydocuments.findOne({policyNumber: "RA-2024-001", name: /final_signed/})
# Expected: Found with version 3

# Notification validation
db.notifications.find({policyTitle: "Test Policy Creation", changeType: /Policy has been published/})
# Expected: Sent to all accessEmails
```

**Actual Result:** [To be filled during testing]  
**Pass/Fail:** [ ] PASS [ ] FAIL  
**Remarks:** 

### TC-P6-002: Non-PPMED Cannot Publish

**Test Case ID:** TC-P6-002  
**Phase:** PHASE 6 - Publication Workflow (Security)  
**Actor:** PRAD Member (prad.member@dict.gov.ph)  
**Preconditions:** Policy RA-2024-002 in Approved state

**Steps:**
1. Login as prad.member@dict.gov.ph (PRAD member, not PPMED)
2. Open Policy RA-2024-002
3. Click "Edit" button
4. Upload final document: `policy_final.pdf`
5. Mark as "Final Document"
6. Click "Save" button

**Expected Results:**
- ✅ Policy does NOT publish
- ✅ workflowState remains `"Approved"`
- ✅ status remains `"Approved"`
- ✅ No publishedAt timestamp set

**Validation:**
```bash
# Policy validation
db.policies.findOne({policyNumber: "RA-2024-002"})
# Expected:
#   workflowState: "Approved" (NOT "Published")
#   status: "Approved" (NOT "Published")
#   publishedAt: undefined or null
```

**Actual Result:** [To be filled during testing]  
**Pass/Fail:** [ ] PASS [ ] FAIL  
**Remarks:** 

---

## PHASE 7 — Access Request Workflow

### TC-P7-001: Request Access as Viewer

**Test Case ID:** TC-P7-001  
**Phase:** PHASE 7 - Access Request Workflow  
**Actor:** Viewer (ella.ramos@dict.gov.ph)  
**Preconditions:** Policy RA-2024-001 exists, viewer has no access

**Steps:**
1. Login as ella.ramos@dict.gov.ph
2. Open Policy RA-2024-001
3. Verify "Request Access" button is visible
4. Click "Request Access" button
5. Confirm request

**Expected Results:**
- ✅ Edit blocked (cannot edit policy)
- ✅ Request Access button visible
- ✅ ACCESS_REQUEST notification created
- ✅ Recipients assigned correctly (policy owner + division members)
- ✅ Request visible in AccessRequestsPage

**Validation:**
```bash
# Access control validation
# ella.ramos@dict.gov.ph should NOT be in accessEmails
db.policies.findOne({policyNumber: "RA-2024-001"})
# Expected: accessEmails does NOT include "ella.ramos@dict.gov.ph"

# Notification validation
db.notifications.find({changeType: /ACCESS_REQUEST/})
# Expected: Found with recipients = policy owner + division members

# Activity validation
db.activitylogs.findOne({action: /Requested access/})
# Expected: Found
```

**Actual Result:** [To be filled during testing]  
**Pass/Fail:** [ ] PASS [ ] FAIL  
**Remarks:** 

---

## PHASE 8 — Access Approval Workflow

### TC-P8-001: Approve Access Request

**Test Case ID:** TC-P8-001  
**Phase:** PHASE 8 - Access Approval Workflow  
**Actor:** Policy Owner (prad.member@dict.gov.ph)  
**Preconditions:** Access request from ella.ramos@dict.gov.ph exists

**Steps:**
1. Login as prad.member@dict.gov.ph
2. Navigate to AccessRequestsPage
3. Find request from ella.ramos@dict.gov.ph
4. Click "Approve" button
5. Confirm approval

**Expected Results:**
- ✅ Requester added to accessEmails
- ✅ Notification sent to requester
- ✅ Activity logged
- ✅ Timeline updated

**Validation:**
```bash
# Policy validation
db.policies.findOne({policyNumber: "RA-2024-001"})
# Expected: accessEmails now includes "ella.ramos@dict.gov.ph"

# Notification validation
db.notifications.findOne({recipientEmail: "ella.ramos@dict.gov.ph", changeType: /access/i})
# Expected: Found

# Activity validation
db.activitylogs.findOne({action: /Granted document access/})
# Expected: Found
```

**Actual Result:** [To be filled during testing]  
**Pass/Fail:** [ ] PASS [ ] FAIL  
**Remarks:** 

---

## PHASE 9 — Stale Policy Automation

### TC-P9-001: Stale Policy Reminder

**Test Case ID:** TC-P9-001  
**Phase:** PHASE 9 - Stale Policy Automation  
**Actor:** System (Cron Job)  
**Preconditions:** Policy in "Under Review" state for 7+ days

**Steps:**
1. Create policy and transition to "Under Review"
2. Manually update lastActivityAt to 8 days ago:
   ```bash
   db.policies.updateOne(
     {policyNumber: "RA-2024-001"},
     {$set: {lastActivityAt: new Date(Date.now() - 8*24*60*60*1000)}}
   )
   ```
3. Wait for cron job to execute (9 AM daily) or manually trigger
4. Check notifications

**Expected Results:**
- ✅ Reminder notification sent to reviewers
- ✅ escalated flag remains false
- ✅ Dashboard shows stale badge

**Validation:**
```bash
# Notification validation
db.notifications.find({changeType: /Policy review reminder/})
# Expected: Found with recipients = policy.reviewers

# Policy validation
db.policies.findOne({policyNumber: "RA-2024-001"})
# Expected: escalated: false
```

**Actual Result:** [To be filled during testing]  
**Pass/Fail:** [ ] PASS [ ] FAIL  
**Remarks:** 

### TC-P9-002: Stale Policy Escalation

**Test Case ID:** TC-P9-002  
**Phase:** PHASE 9 - Stale Policy Automation (Escalation)  
**Actor:** System (Cron Job)  
**Preconditions:** Policy in "Under Review" state for 14+ days

**Steps:**
1. Update lastActivityAt to 15 days ago:
   ```bash
   db.policies.updateOne(
     {policyNumber: "RA-2024-001"},
     {$set: {lastActivityAt: new Date(Date.now() - 15*24*60*60*1000)}}
   )
   ```
2. Wait for cron job to execute or manually trigger
3. Check notifications and escalation flag

**Expected Results:**
- ✅ Escalation triggered
- ✅ escalated flag set to true
- ✅ OIC Director notified
- ✅ Dashboard shows escalation badge

**Validation:**
```bash
# Policy validation
db.policies.findOne({policyNumber: "RA-2024-001"})
# Expected: escalated: true

# Notification validation
db.notifications.findOne({recipientEmail: "oicdirector@dict.gov.ph", changeType: /ESCALATION/})
# Expected: Found
```

**Actual Result:** [To be filled during testing]  
**Pass/Fail:** [ ] PASS [ ] FAIL  
**Remarks:** 

---

## PHASE 10 — Archive Workflow

### TC-P10-001: Archive Published Policy

**Test Case ID:** TC-P10-001  
**Phase:** PHASE 10 - Archive Workflow  
**Actor:** Division Chief (juan.delacruz@dict.gov.ph)  
**Preconditions:** Policy RA-2024-001 in Published state

**Steps:**
1. Login as juan.delacruz@dict.gov.ph
2. Open Policy RA-2024-001
3. Click "Archive" button
4. Confirm archive action

**Expected Results:**
- ✅ archived = true
- ✅ status = "On Hold"
- ✅ Documents archived
- ✅ Archive timeline entry created
- ✅ Activity logged

**Validation:**
```bash
# Policy validation
db.policies.findOne({policyNumber: "RA-2024-001"})
# Expected:
#   archived: true
#   status: "On Hold"
#   archivedAt: <timestamp>

# Document validation
db.repositorydocuments.find({policyNumber: "RA-2024-001"})
# Expected: All documents have status: "Archived"

# Timeline validation
db.policies.findOne({policyNumber: "RA-2024-001"}).timeline
# Expected: Latest entry has event: "POLICY_ARCHIVED"

# Activity validation
db.activitylogs.findOne({action: /Archived policy/})
# Expected: Found
```

**Actual Result:** [To be filled during testing]  
**Pass/Fail:** [ ] PASS [ ] FAIL  
**Remarks:** 

---

## SECURITY TESTING WORKFLOW

### TC-SEC-001: Unauthorized Direct API Access

**Test Case ID:** TC-SEC-001  
**Phase:** Security Testing - Unauthorized Access  
**Actor:** Attacker (no authentication)

**Steps:**
1. Attempt direct API call without token:
   ```bash
   curl -X GET http://localhost:3000/api/policies/RA-2024-001
   ```
2. Attempt to update policy without token:
   ```bash
   curl -X PUT http://localhost:3000/api/policies/RA-2024-001 \
     -H "Content-Type: application/json" \
     -d '{"status": "Published"}'
   ```

**Expected Results:**
- ✅ 401 Unauthorized response
- ✅ No data leakage
- ✅ No unauthorized updates

**Actual Result:** [To be filled during testing]  
**Pass/Fail:** [ ] PASS [ ] FAIL  
**Remarks:** 

### TC-SEC-002: Privilege Escalation - Viewer Cannot Publish

**Test Case ID:** TC-SEC-002  
**Phase:** Security Testing - Privilege Escalation  
**Actor:** Viewer (ella.ramos@dict.gov.ph)

**Steps:**
1. Login as ella.ramos@dict.gov.ph (Viewer role)
2. Attempt to upload final document to Approved policy:
   ```bash
   curl -X POST http://localhost:3000/api/policies/RA-2024-001/document-uploaded \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"documentName": "final.pdf", "isFinal": true}'
   ```
3. Verify policy does NOT publish

**Expected Results:**
- ✅ Policy remains in "Approved" state
- ✅ No "Published" transition
- ✅ No publishedAt timestamp

**Validation:**
```bash
db.policies.findOne({policyNumber: "RA-2024-001"})
# Expected: workflowState: "Approved" (NOT "Published")
```

**Actual Result:** [To be filled during testing]  
**Pass/Fail:** [ ] PASS [ ] FAIL  
**Remarks:** 

### TC-SEC-003: Privilege Escalation - Viewer Cannot Archive

**Test Case ID:** TC-SEC-003  
**Phase:** Security Testing - Privilege Escalation  
**Actor:** Viewer (ella.ramos@dict.gov.ph)

**Steps:**
1. Login as ella.ramos@dict.gov.ph
2. Attempt to archive policy:
   ```bash
   curl -X POST http://localhost:3000/api/policies/RA-2024-001/archive \
     -H "Authorization: Bearer <token>"
   ```

**Expected Results:**
- ✅ 403 Forbidden or 404 Not Found
- ✅ Policy NOT archived
- ✅ No unauthorized update

**Actual Result:** [To be filled during testing]  
**Pass/Fail:** [ ] PASS [ ] FAIL  
**Remarks:** 

### TC-SEC-004: Notification Isolation

**Test Case ID:** TC-SEC-004  
**Phase:** Security Testing - Notification Isolation  
**Actor:** Multiple users

**Steps:**
1. Create policy and send notifications
2. Login as different users
3. Verify each user only sees their notifications

**Expected Results:**
- ✅ User A only sees notifications where recipientEmail = User A's email
- ✅ User B only sees notifications where recipientEmail = User B's email
- ✅ No cross-user notification leakage

**Validation:**
```bash
# User A's notifications
db.notifications.find({recipientEmail: "prad.member@dict.gov.ph"})
# Expected: Only notifications for this user

# User B's notifications
db.notifications.find({recipientEmail: "maria.santos@dict.gov.ph"})
# Expected: Only notifications for this user
```

**Actual Result:** [To be filled during testing]  
**Pass/Fail:** [ ] PASS [ ] FAIL  
**Remarks:** 

---

## AUTOMATION TESTING CHECKLIST

| Feature | Test Case | Status |
|---------|-----------|--------|
| Auto status updates | TC-P1-001 | [ ] PASS |
| Workflow transitions | TC-P4-001 | [ ] PASS |
| Approval chain logic | TC-P5-001 | [ ] PASS |
| Notifications | TC-P2-001 | [ ] PASS |
| Activity logs | TC-P1-001 | [ ] PASS |
| Timeline generation | TC-P1-001 | [ ] PASS |
| Escalation logic | TC-P9-002 | [ ] PASS |
| Cron jobs | TC-P9-001 | [ ] PASS |
| Version control | TC-P3-001 | [ ] PASS |
| RBAC enforcement | TC-SEC-002 | [ ] PASS |
| Real-time refresh | TC-P1-001 | [ ] PASS |

---

## Test Execution Summary

**Total Test Cases:** 30  
**Passed:** _____ / 30  
**Failed:** _____ / 30  
**Blocked:** _____ / 30  

**Overall Result:** [ ] PASS [ ] FAIL

**Critical Issues Found:** _____

**Recommendations:**

---

## Sign-Off

**Tested By:** ___________________  
**Date:** ___________________  
**Approved By:** ___________________  
**Date:** ___________________

