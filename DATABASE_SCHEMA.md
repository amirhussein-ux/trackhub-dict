# TrackHub Policy Management System - Database Schema

**Version**: 1.0  
**Last Updated**: May 18, 2026  
**Environment**: MongoDB 7.0+ (Atlas Cloud-Hosted)  
**Status**: Production-Ready

---

## 📑 Table of Contents

1. [Overview](#overview)
2. [Collection Summary](#collection-summary)
3. [Detailed Schema Definitions](#detailed-schema-definitions)
4. [Relationships & References](#relationships--references)
5. [Indexes & Query Optimization](#indexes--query-optimization)
6. [Validation Rules](#validation-rules)
7. [Example Documents](#example-documents)
8. [Data Integrity](#data-integrity)
9. [Scalability Considerations](#scalability-considerations)
10. [Migration Guide](#migration-guide)
11. [Query Patterns](#query-patterns)
12. [Performance Tuning](#performance-tuning)

---

## Overview

### Purpose
TrackHub manages policy lifecycle workflows across 4 divisions with complete audit trails, multi-user collaboration, and state machine-driven automation. The database schema supports:

- ✅ **Event-Driven Workflow**: 9 state transitions with 9 triggering events
- ✅ **RBAC Authorization**: 3-tier role hierarchy with division-level scoping
- ✅ **Multi-User Collaboration**: Access grants, reviewer assignments, approval chains
- ✅ **Audit Trails**: Complete activity logging (50,000+ documents/year)
- ✅ **Document Versioning**: Multi-version support with storage optimization
- ✅ **Automated Notifications**: Event-triggered notifications (100,000+ documents/year)
- ✅ **TTL Auto-Cleanup**: Automatic deletion of aged audit/notification records

### Design Principles

| Principle | Rationale | Implementation |
|-----------|-----------|-----------------|
| **Single Responsibility** | Each collection represents one business entity | 8 focused collections |
| **Normalization** | Reduce redundancy, improve consistency | References via IDs (no embedding) |
| **Performance First** | Index all common queries proactively | 20+ strategic indexes |
| **Scalability** | Support 10,000+ users, 100,000+ policies | Document size ≤16MB, TTL cleanup |
| **Data Integrity** | Prevent orphaned records, maintain consistency | Foreign key patterns, validation |
| **Audit Compliance** | Track all changes for governance | ActivityLog + timeline arrays |
| **Time-Series Ready** | Support historical analysis | createdAt/updatedAt on all docs |

### Environment Configuration

```javascript
// Connection Settings (atlas)
Database: trackhub-prod
Host: cluster.mongodb.net (Atlas)
Authentication: SCRAM-SHA-256
SSL/TLS: Required in-transit
Connection Pool: 10 connections (max)
Server Selection: primaryPreferred (read from secondaries ok)
Replication: 3-node replica set (Atlas default)
```

---

## Collection Summary

### Overview Table

| # | Collection | Records | Indexes | Purpose | TTL |
|---|-----------|---------|---------|---------|-----|
| 1 | **Policy** | 1,000-10,000 | 7 | Core policy workflow documents | ❌ No |
| 2 | **User** | 50-200 | 4 | User authentication & RBAC | ❌ No |
| 3 | **RepositoryDocument** | 5,000-50,000 | 5 | Document versioning (⚠️ base64) | ❌ No |
| 4 | **ActivityLog** | 50,000+ | 2+TTL | Audit trail (1-year retention) | ✅ Yes (1yr) |
| 5 | **Notification** | 100,000+ | 3+TTL | Event notifications (30-day retention) | ✅ Yes (30d) |
| 6 | **SupportTicket** | 100-500 | 2 | Support ticket management | ❌ No |
| 7 | **VerificationCode** | 100-500 | 1+TTL | OTP storage (15-min retention) | ✅ Yes (15m) |
| 8 | **Item** | Variable | 1 | Generic extensible storage | ❌ No |

### Total Document Size Estimate

```
Policy:              1,000 × 2.5 KB   = 2.5 MB
User:                  200 × 1.2 KB   = 0.24 MB
RepositoryDocument: 10,000 × 500 KB   = 5,000 MB ⚠️ CRITICAL
ActivityLog:        50,000 × 0.5 KB   = 25 MB (aged out regularly)
Notification:      100,000 × 0.3 KB   = 30 MB (aged out regularly)
SupportTicket:        500 × 2 KB      = 1 MB
VerificationCode:     200 × 0.3 KB    = 0.06 MB
Item:               1,000 × 0.5 KB    = 0.5 MB
---
TOTAL STORAGE: ~5,059 MB (~5 GB)
⚠️ RepositoryDocument dominates due to base64 file storage
```

**Scalability Impact**: Current base64 approach limits to ~50-100 concurrent documents. Refactor to S3/GCS before production scaling.

---

## Detailed Schema Definitions

### 1. Policy Collection

**Purpose**: Core business entity representing policies in workflow lifecycle

**Storage**: ~2.5 MB (1,000-10,000 documents)

**Lifecycle**: Created → Workflow States → Published/Archived → Historical retention

#### Schema

```javascript
{
  // Identifiers
  _id:                    ObjectId,                    // MongoDB primary key
  policyNumber:           String,                      // Unique: "POL-2026-001"
  
  // Core Information
  title:                  String,                      // Max 500 chars
  description:            String,                      // Max 2000 chars (optional)
  type:                   Enum,                        // "Republic Act" | "Executive Order" 
                                                       // | "Issuance" | "Admin Order" 
                                                       // | "Memo Order"
  division:               Enum,                        // "PRAD" | "PPDD" | "PPMED" | "PPMCAD"
  
  // Workflow State Machine
  workflowState:          Enum,                        // "Draft" | "Collaborating" | "For Review" 
                                                       // | "Under Review" | "Approved" 
                                                       // | "Returned for Revision" | "Rejected" 
                                                       // | "Published" | "Archived"
  status:                 Enum,                        // Denormalized from workflowState
                                                       // "active" | "archived" | "rejected"
  
  // User Tracking
  createdBy:              String,                      // User identifier (creator)
  uploadedBy:             String,                      // User identifier (who uploaded docs)
  lastEditedBy:           String,                      // User identifier (last editor)
  
  // Collaboration
  accessEmails:           [String],                    // Array of collaborator emails
                                                       // Used for read/write access
                          // Example: ["chief@example.com", "reviewer@example.com"]
  
  // Approval Chain
  approvalChain:          [                            // All approvers for this policy
    {
      email:              String,                      // Approver email
      name:               String,                      // Approver name
      division:           String,                      // Approver's division
      role:               String,                      // "OIC Director" | "Division Chief"
      status:             Enum,                        // "pending" | "approved" | "rejected"
      approvedAt:         Date,                        // When they approved (null if pending)
      comment:            String,                      // Optional approval comment
      _id:                ObjectId
    }
  ],
  
  // Reviewers (Under Review stage)
  reviewers:              [                            // Assigned reviewers
    {
      email:              String,
      name:               String,
      division:           String,
      role:               String,
      status:             Enum,                        // "pending" | "submitted"
      submittedAt:        Date,                        // When review submitted
      reviewComments:     String,                      // Reviewer feedback
      _id:                ObjectId
    }
  ],
  
  // Workflow Metadata
  workflowEvents:         [String],                    // History of triggered events
                          // Example: ["POLICY_CREATED", "ACCESS_GRANTED", "DOCUMENT_UPLOADED"]
  lastActivityAt:         Date,                        // For escalation detection
                                                       // When last activity occurred
  escalated:              Boolean,                     // Flag: Policy overdue for action
  
  // Publishing
  publishedAt:            Date,                        // When published (null until Published)
  archivedAt:             Date,                        // When archived (null until Archived)
  
  // Audit Trail
  timeline:               [                            // Complete workflow history
    {
      event:              String,                      // "created" | "status_changed" | etc
      from:               String,                      // Previous state
      to:                 String,                      // New state
      changedBy:          String,                      // User who made change
      reason:             String,                      // Why (optional)
      timestamp:          Date,
      _id:                ObjectId
    }
  ],
  
  // Timestamps
  createdAt:              Date,                        // Document creation
  updatedAt:              Date,                        // Last modification
  
  // Metadata
  version:                Number,                      // Schema version (default: 1)
}
```

#### Constraints & Validation

```javascript
{
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["policyNumber", "title", "type", "division", "createdBy", "workflowState"],
      properties: {
        policyNumber: { bsonType: "string", pattern: "^POL-\\d{4}-\\d{3}$" },
        title: { bsonType: "string", minLength: 5, maxLength: 500 },
        type: { enum: ["Republic Act", "Executive Order", "Issuance", "Administrative Order", "Memorandum Order"] },
        division: { enum: ["PRAD", "PPDD", "PPMED", "PPMCAD"] },
        workflowState: { enum: ["Draft", "Collaborating", "For Review", "Under Review", "Approved", "Returned for Revision", "Rejected", "Published", "Archived"] },
        status: { enum: ["active", "archived", "rejected"] }
      }
    }
  }
}
```

#### Indexes

| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| 1 | `policyNumber` | UNIQUE | Prevent duplicate policy numbers |
| 2 | `createdAt` | ASC | Sort by creation date |
| 3 | `{division, status, createdAt}` | COMPOUND | Filter by division/status, sort by date |
| 4 | `{createdBy, uploadedBy}` | COMPOUND | Find policies created/uploaded by user |
| 5 | `accessEmails` | SPARSE | Find policies user can access |
| 6 | `{workflowState, lastActivityAt}` | COMPOUND | Escalation detection queries |
| 7 | `{escalated, lastActivityAt}` | COMPOUND | Find overdue policies |

```javascript
// Create indexes
db.Policy.createIndex({ policyNumber: 1 }, { unique: true });
db.Policy.createIndex({ createdAt: 1 });
db.Policy.createIndex({ division: 1, status: 1, createdAt: -1 });
db.Policy.createIndex({ createdBy: 1, uploadedBy: 1 });
db.Policy.createIndex({ accessEmails: 1 }, { sparse: true });
db.Policy.createIndex({ workflowState: 1, lastActivityAt: 1 });
db.Policy.createIndex({ escalated: 1, lastActivityAt: 1 });
```

---

### 2. User Collection

**Purpose**: Authentication, authorization, user profiles

**Storage**: ~0.24 MB (50-200 documents)

**Lifecycle**: Created → Active/Inactive → Historical retention

#### Schema

```javascript
{
  // Identifiers
  _id:                    ObjectId,                    // MongoDB primary key
  identifier:             String,                      // Unique: "john.doe@ppp.gov.ph"
  
  // Personal Information
  email:                  String,                      // Unique, lowercase stored
  name:                   String,                      // Display name
  
  // Authorization
  role:                   Enum,                        // "OIC Director" (system admin)
                                                       // "Division Chief" (division lead)
                                                       // "Division Member" (creator)
                                                       // "Guest" (read-only, optional)
  division:               String,                      // "PRAD" | "PPDD" | "PPMED" | "PPMCAD"
                                                       // (null for OIC Director)
  
  // Authentication
  password:               String,                      // bcrypt hash (10 salt rounds)
  verified:               Boolean,                     // Email verified? (default: false)
  
  // User Status
  status:                 Enum,                        // "active" | "inactive" | "suspended"
  firstLogin:             Boolean,                     // Force password change on first login?
  
  // Policy Publishing Permission
  canPublishPolicies:     Boolean,                     // Only PPMED members = true
  
  // Session Management
  lastLoginAt:            Date,                        // Track login activity
  lastActivityAt:         Date,                        // Track user engagement
  
  // Audit Metadata
  createdAt:              Date,
  updatedAt:              Date,
}
```

#### Constraints & Validation

```javascript
{
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["identifier", "email", "name", "role"],
      properties: {
        identifier: { bsonType: "string" },
        email: { bsonType: "string", pattern: "^[\\w.-]+@[\\w.-]+\\.\\w+$" },
        name: { bsonType: "string", minLength: 2 },
        role: { enum: ["OIC Director", "Division Chief", "Division Member", "Guest"] },
        division: { enum: [null, "PRAD", "PPDD", "PPMED", "PPMCAD"] },
        canPublishPolicies: { bsonType: "bool" }
      }
    }
  }
}
```

#### Indexes

| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| 1 | `identifier` | UNIQUE | User lookup by identifier |
| 2 | `email` | UNIQUE | Prevent duplicate emails |
| 3 | `{role, division}` | COMPOUND | Find all users in division with role |
| 4 | `lastLoginAt` | DESC | Active user tracking |

```javascript
db.User.createIndex({ identifier: 1 }, { unique: true });
db.User.createIndex({ email: 1 }, { unique: true });
db.User.createIndex({ role: 1, division: 1 });
db.User.createIndex({ lastLoginAt: -1 });
```

---

### 3. RepositoryDocument Collection

**Purpose**: Document storage with versioning and access control

**Storage**: ~5,000 MB (5-50 GB with base64 encoding)

**⚠️ CRITICAL ISSUE**: Base64 encoding in fileDataUrl field causes scalability problems

#### Schema

```javascript
{
  // Identifiers
  _id:                    ObjectId,
  policyId:               ObjectId,                    // Reference to Policy._id
  
  // File Information
  name:                   String,                      // Filename: "policy-v1.pdf"
  type:                   Enum,                        // "pdf" | "docx" | "xlsx" | "jpg" | "png"
  mimeType:               String,                      // "application/pdf", etc.
  fileSize:               Number,                      // Bytes (validation ≤ 50 MB)
  
  // File Content ⚠️ PROBLEM AREA
  fileDataUrl:            String,                      // Base64 encoded file content
                                                       // ISSUE: 5 MB file = 6.7 MB in DB
                                                       // ISSUE: Slows queries, hits 16MB doc limit
                                                       // ISSUE: Network overhead on download
                                                       // SOLUTION: Refactor to S3/GCS
  
  // Versioning
  version:                Number,                      // 1, 2, 3, etc. (incremental)
  isLatest:               Boolean,                     // Is this the current version?
  
  // Access Control
  owner:                  String,                      // Original uploader identifier
  uploadedBy:             String,                      // User who uploaded
  accessEmails:           [String],                    // Users with access
  
  // Audit Trail
  createdAt:              Date,
  updatedAt:              Date,
  division:               String,                      // Denormalized for indexing
  status:                 String,                      // Denormalized: policy status
}
```

#### Constraints & Validation

```javascript
{
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["policyId", "name", "type", "owner"],
      properties: {
        policyId: { bsonType: "objectId" },
        name: { bsonType: "string", maxLength: 255 },
        type: { enum: ["pdf", "docx", "xlsx", "jpg", "png"] },
        fileSize: { bsonType: "int", minimum: 1, maximum: 52428800 },  // ≤ 50 MB
        version: { bsonType: "int", minimum: 1 },
        isLatest: { bsonType: "bool" }
      }
    }
  }
}
```

#### Indexes

| Index | Fields | Type | Purpose |
|-------|--------|------|---------|
| 1 | `{policyId, createdAt}` | COMPOUND | Find all versions of a document |
| 2 | `createdAt` | DESC | Sort by upload date |
| 3 | `{division, status, createdAt}` | COMPOUND | Filter by division/status |
| 4 | `{owner, uploadedBy}` | COMPOUND | Find docs uploaded by user |
| 5 | `accessEmails` | SPARSE | Find docs user can access |

```javascript
db.RepositoryDocument.createIndex({ policyId: 1, createdAt: -1 });
db.RepositoryDocument.createIndex({ createdAt: -1 });
db.RepositoryDocument.createIndex({ division: 1, status: 1, createdAt: -1 });
db.RepositoryDocument.createIndex({ owner: 1, uploadedBy: 1 });
db.RepositoryDocument.createIndex({ accessEmails: 1 }, { sparse: true });
```

#### ⚠️ Critical Scalability Issue: Base64 File Storage

**Current Problem**:
- Base64 encoding increases file size by ~33% (5 MB file → 6.7 MB in database)
- MongoDB document size limit: 16 MB (some files already close)
- Network overhead: Every query returns entire base64 string
- Slow query performance: Index scans include massive strings

**Recommended Refactoring**:

```javascript
// FUTURE SCHEMA (Post-Refactor to S3/GCS)
{
  _id:                    ObjectId,
  policyId:               ObjectId,
  name:                   String,
  type:                   String,
  mimeType:               String,
  fileSize:               Number,
  
  // Store only reference, not content
  fileKey:                String,                      // S3 key: "policies/POL-2026-001/v1.pdf"
  fileUrl:                String,                      // Pre-signed URL (expires in 1 hour)
  
  version:                Number,
  isLatest:               Boolean,
  
  owner:                  String,
  uploadedBy:             String,
  accessEmails:           [String],
  
  createdAt:              Date,
  updatedAt:              Date,
}
```

**Migration Timeline**: Before production launch (Week 3-4)

---

### 4. ActivityLog Collection

**Purpose**: Comprehensive audit trail of all system activities

**Storage**: ~25 MB (50,000+ documents, auto-deleted after 1 year)

**TTL**: Automatic deletion after 365 days

#### Schema

```javascript
{
  // Identifiers
  _id:                    ObjectId,
  
  // Activity Information
  user:                   String,                      // User identifier
  action:                 String,                      // "create" | "update" | "upload" | "download" | "status"
  type:                   Enum,                        // Activity classification
  
  // Context
  policyTitle:            String,                      // What policy was affected
  policyId:               ObjectId,                    // Reference to Policy
  details:                String,                      // Additional context
  
  // Metadata
  timestamp:              Date,                        // When activity occurred (TTL key)
  ipAddress:              String,                      // User's IP (optional, optional)
  userAgent:              String,                      // Browser info (optional)
}
```

#### Constraints & Validation

```javascript
{
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user", "action", "timestamp"],
      properties: {
        user: { bsonType: "string" },
        action: { enum: ["create", "update", "upload", "download", "status", "publish", "archive"] },
        timestamp: { bsonType: "date" }
      }
    }
  }
}
```

#### Indexes & TTL

| Index | Fields | Type | TTL | Purpose |
|-------|--------|------|-----|---------|
| 1 | `createdAt` | ASC | 365 days | Auto-delete aged records |
| 2 | `user, createdAt` | COMPOUND | None | Find user's activity history |

```javascript
// TTL Index: Auto-delete records older than 1 year
db.ActivityLog.createIndex({ timestamp: 1 }, { expireAfterSeconds: 31536000 });

// Query Index
db.ActivityLog.createIndex({ user: 1, timestamp: -1 });
```

#### Sample Query

```javascript
// Find user's activity in last 7 days
db.ActivityLog.find({
  user: "john.doe@ppp.gov.ph",
  timestamp: { $gte: ISODate("2026-05-11") }
}).sort({ timestamp: -1 }).limit(100);
```

---

### 5. Notification Collection

**Purpose**: Event-triggered notifications for workflow updates

**Storage**: ~30 MB (100,000+ documents, auto-deleted after 30 days)

**TTL**: Automatic deletion after 30 days

#### Schema

```javascript
{
  // Identifiers
  _id:                    ObjectId,
  
  // Content
  policyId:               ObjectId,                    // Which policy
  policyTitle:            String,                      // Policy name (denormalized)
  changeType:             String,                      // "access_granted" | "review_ready" | "approved" | etc.
  message:                String,                      // Notification text
  
  // Recipient
  recipientEmail:         String,                      // Who receives notification
  
  // Status
  read:                   Boolean,                     // Has user read it?
  readAt:                 Date,                        // When read (null if unread)
  
  // Metadata
  timestamp:              Date,                        // When created (TTL key)
}
```

#### Constraints & Validation

```javascript
{
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["policyId", "recipientEmail", "changeType", "timestamp"],
      properties: {
        policyId: { bsonType: "objectId" },
        recipientEmail: { bsonType: "string", pattern: "^[\\w.-]+@[\\w.-]+\\.\\w+$" },
        changeType: { enum: ["access_granted", "review_ready", "approved", "rejected", "published", "archived"] },
        read: { bsonType: "bool" },
        timestamp: { bsonType: "date" }
      }
    }
  }
}
```

#### Indexes & TTL

| Index | Fields | Type | TTL | Purpose |
|-------|--------|------|-----|---------|
| 1 | `timestamp` | ASC | 30 days | Auto-delete aged notifications |
| 2 | `recipientEmail, createdAt` | COMPOUND | None | User's notification inbox |
| 3 | `{read, createdAt}` | COMPOUND | None | Unread notifications |

```javascript
// TTL Index: Auto-delete records older than 30 days
db.Notification.createIndex({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

// Query indexes
db.Notification.createIndex({ recipientEmail: 1, timestamp: -1 });
db.Notification.createIndex({ read: 1, timestamp: -1 });
```

#### ⚠️ N+1 Query Problem

**Current Issue**: Creates N notifications in N separate insertions

```javascript
// INEFFICIENT (N+1 Problem)
for (const email of collaboratorEmails) {
  await Notification.create({ recipientEmail: email, ... });  // N separate inserts
}
```

**Solution**: Use bulk insert

```javascript
// EFFICIENT (Bulk Insert)
const notifications = collaboratorEmails.map(email => ({
  recipientEmail: email,
  policyId: policyId,
  timestamp: new Date(),
  ...
}));
await Notification.insertMany(notifications);  // 1 bulk operation
```

---

### 6. SupportTicket Collection

**Purpose**: Support ticket management

**Storage**: ~1 MB (100-500 documents)

#### Schema

```javascript
{
  // Identifiers
  _id:                    ObjectId,
  ticketId:               String,                      // Unique: "SUPPORT-2026-001"
  
  // Submitter Information
  fullName:               String,
  email:                  String,
  
  // Ticket Details
  subject:                String,
  category:               Enum,                        // "bug" | "feature_request" | "general_inquiry"
  message:                String,
  attachmentUrl:          String,                      // Optional attachment
  
  // Status
  status:                 Enum,                        // "Pending" | "In Review" | "Resolved"
  resolvedAt:             Date,                        // When resolved (null if open)
  resolutionNotes:        String,                      // How it was resolved
  
  // Metadata
  createdAt:              Date,
  updatedAt:              Date,
}
```

---

### 7. VerificationCode Collection

**Purpose**: One-Time Password (OTP) storage for password reset & first login

**Storage**: ~0.06 MB (100-500 documents, auto-deleted after 15 minutes)

**TTL**: Automatic deletion after 15 minutes

#### Schema

```javascript
{
  // Identifiers
  _id:                    ObjectId,
  
  // Code Information
  email:                  String,                      // Who requested the code
  code:                   String,                      // 6-digit numeric code
  purpose:                Enum,                        // "password_reset" | "first_login"
  
  // Status
  used:                   Boolean,                     // Has been used?
  usedAt:                 Date,                        // When used (null if unused)
  
  // Metadata
  expiresAt:              Date,                        // When expires (TTL key)
  createdAt:              Date,
}
```

#### Indexes & TTL

```javascript
// TTL Index: Auto-delete codes older than 15 minutes
db.VerificationCode.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Query index: Find code by email
db.VerificationCode.createIndex({ email: 1 });
```

---

### 8. Item Collection

**Purpose**: Generic extensible storage for future expansion

**Storage**: ~0.5 MB (1,000 documents)

#### Schema

```javascript
{
  _id:                    ObjectId,
  title:                  String,
  description:            String,
  status:                 String,
  owner:                  String,
  createdAt:              Date,
}
```

---

## Relationships & References

### ER Diagram

```
┌──────────────────┐
│      User        │
├──────────────────┤
│ _id (PK)         │
│ identifier       │
│ email            │
│ role             │
│ division         │
└────────┬─────────┘
         │ created/edited
         ▼
┌──────────────────────────────────────────────┐
│             Policy                           │
├──────────────────────────────────────────────┤
│ _id (PK)                                     │
│ policyNumber (UNIQUE)                        │
│ title, type, division                        │
│ createdBy → User.identifier                  │
│ uploadedBy → User.identifier                 │
│ lastEditedBy → User.identifier               │
│ accessEmails → [User.email]                  │
│ approvalChain → [{ email, role, ... }]       │
│ reviewers → [{ email, role, ... }]           │
│ timeline → [{ event, timestamp, ... }]       │
└────────┬───────────────────────────────────┬─┘
         │ references                        │ uploaded
         ▼                                   ▼
┌──────────────────────────────┐   ┌──────────────────────┐
│    ActivityLog               │   │ RepositoryDocument   │
├──────────────────────────────┤   ├──────────────────────┤
│ _id (PK)                     │   │ _id (PK)             │
│ user → User.identifier       │   │ policyId → Policy._id│
│ policyId → Policy._id        │   │ owner → User.id      │
│ action, timestamp (TTL)      │   │ accessEmails []      │
└──────────────────────────────┘   │ fileDataUrl (base64) │
                                   │ version              │
                                   └──────────────────────┘

┌──────────────────────────┐
│    Notification          │
├──────────────────────────┤
│ _id (PK)                 │
│ policyId → Policy._id    │
│ recipientEmail → User    │
│ timestamp (TTL 30 days)  │
└──────────────────────────┘

┌──────────────────────────┐
│   VerificationCode       │
├──────────────────────────┤
│ _id (PK)                 │
│ email → User.email       │
│ code (6-digit OTP)       │
│ expiresAt (TTL 15 min)   │
└──────────────────────────┘

┌──────────────────────────┐
│    SupportTicket         │
├──────────────────────────┤
│ _id (PK)                 │
│ ticketId (UNIQUE)        │
│ email                    │
│ status, message          │
└──────────────────────────┘
```

### Reference Relationships

| From | To | Type | Purpose | Constraint |
|------|----|----|---------|-----------|
| Policy.createdBy | User.identifier | N:1 | Who created | User must exist |
| Policy.accessEmails | User.email | N:M | Collaborators | Denormalized array |
| Policy.approvalChain | User | N:M | Approvers | Denormalized array |
| RepositoryDocument.policyId | Policy._id | N:1 | Which policy | Policy must exist |
| RepositoryDocument.owner | User.identifier | N:1 | Original uploader | User must exist |
| ActivityLog.policyId | Policy._id | N:1 | What changed | Policy may be deleted |
| Notification.policyId | Policy._id | N:1 | About which policy | Policy may be deleted |
| VerificationCode.email | User.email | N:1 | For user | User must exist |

---

## Indexes & Query Optimization

### Index Strategy

**Total Indexes**: 20+

**Principles**:
1. **Index all equality filters** (WHERE clauses)
2. **Index sort fields** when not filtering all results
3. **Compound indexes** for multi-field queries
4. **Sparse indexes** for optional fields with many nulls
5. **TTL indexes** for automatic cleanup

### Complete Index Reference

```javascript
// ============ POLICY COLLECTION ============
db.Policy.createIndex({ policyNumber: 1 }, { unique: true });
db.Policy.createIndex({ createdAt: 1 });
db.Policy.createIndex({ division: 1, status: 1, createdAt: -1 });
db.Policy.createIndex({ createdBy: 1, uploadedBy: 1 });
db.Policy.createIndex({ accessEmails: 1 }, { sparse: true });
db.Policy.createIndex({ workflowState: 1, lastActivityAt: 1 });
db.Policy.createIndex({ escalated: 1, lastActivityAt: 1 });

// ============ USER COLLECTION ============
db.User.createIndex({ identifier: 1 }, { unique: true });
db.User.createIndex({ email: 1 }, { unique: true });
db.User.createIndex({ role: 1, division: 1 });
db.User.createIndex({ lastLoginAt: -1 });

// ============ REPOSITORYDOCUMENT COLLECTION ============
db.RepositoryDocument.createIndex({ policyId: 1, createdAt: -1 });
db.RepositoryDocument.createIndex({ createdAt: -1 });
db.RepositoryDocument.createIndex({ division: 1, status: 1, createdAt: -1 });
db.RepositoryDocument.createIndex({ owner: 1, uploadedBy: 1 });
db.RepositoryDocument.createIndex({ accessEmails: 1 }, { sparse: true });

// ============ ACTIVITYLOG COLLECTION ============
db.ActivityLog.createIndex(
  { timestamp: 1 }, 
  { expireAfterSeconds: 31536000 }  // TTL: 1 year
);
db.ActivityLog.createIndex({ user: 1, timestamp: -1 });

// ============ NOTIFICATION COLLECTION ============
db.Notification.createIndex(
  { timestamp: 1 }, 
  { expireAfterSeconds: 2592000 }  // TTL: 30 days
);
db.Notification.createIndex({ recipientEmail: 1, timestamp: -1 });
db.Notification.createIndex({ read: 1, timestamp: -1 });

// ============ SUPPORTTICKET COLLECTION ============
db.SupportTicket.createIndex({ ticketId: 1 }, { unique: true });
db.SupportTicket.createIndex({ status: 1, createdAt: -1 });

// ============ VERIFICATIONCODE COLLECTION ============
db.VerificationCode.createIndex(
  { expiresAt: 1 }, 
  { expireAfterSeconds: 0 }  // TTL: expires based on expiresAt field
);
db.VerificationCode.createIndex({ email: 1 });

// ============ ITEM COLLECTION ============
db.Item.createIndex({ createdAt: 1 });
```

### Index Monitoring

```javascript
// View all indexes on a collection
db.Policy.getIndexes();

// Check index size
db.Policy.stats().indexSizes;

// Monitor slow queries (slow query log)
db.setProfilingLevel(1, { slowms: 100 });  // Log queries > 100ms

// View slow queries
db.system.profile.find().sort({ ts: -1 }).limit(10);
```

---

## Validation Rules

### Field-Level Validation

#### Policy Collection

```javascript
// Policy Number Format
// Must be: POL-YYYY-###
db.Policy.updateOne(
  { _id: ObjectId("...") },
  { $set: { policyNumber: "POL-2026-001" } }
);

// Workflow State Transitions (Enforced by application logic)
VALID_TRANSITIONS = {
  "Draft": ["Collaborating", "Rejected"],
  "Collaborating": ["For Review", "Draft"],
  "For Review": ["Under Review", "Collaborating"],
  "Under Review": ["Approved", "Returned for Revision", "Rejected"],
  "Approved": ["Published"],
  "Returned for Revision": ["Under Review", "Collaborating"],
  "Rejected": ["Draft"],
  "Published": ["Archived"],
  "Archived": []  // Final state
};

// Date Constraints
createdAt: <= now()
updatedAt: >= createdAt
publishedAt: >= createdAt (if set)
archivedAt: >= publishedAt (if set)
```

#### User Collection

```javascript
// Email Format
pattern: "^[\\w.-]+@[\\w.-]+\\.\\w+$"

// Role & Division Combinations
OIC Director:     division = null
Division Chief:   division ∈ {PRAD, PPDD, PPMED, PPMCAD}
Division Member:  division ∈ {PRAD, PPDD, PPMED, PPMCAD}

// Publishing Permissions
canPublishPolicies = true  ONLY if division = "PPMED"
```

#### RepositoryDocument Collection

```javascript
// File Size Constraints
fileSize: 1 KB to 50 MB (52,428,800 bytes max)

// File Type Validation
type ∈ {pdf, docx, xlsx, jpg, png}
mimeType must match type

// Version Numbering
version: incrementing integer (1, 2, 3, ...)
Only one document per policy can have isLatest = true
```

---

## Example Documents

### Policy Document (Complete Example)

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  policyNumber: "POL-2026-001",
  title: "Acquisition of Software Licenses for Digital Transformation",
  description: "Policy governing the procurement process for software licenses to support the agency's digital transformation initiatives.",
  type: "Administrative Order",
  division: "PPMED",
  
  workflowState: "Under Review",
  status: "active",
  
  createdBy: "maria.santos@ppp.gov.ph",
  uploadedBy: "maria.santos@ppp.gov.ph",
  lastEditedBy: "maria.santos@ppp.gov.ph",
  
  accessEmails: [
    "chief.ppmed@ppp.gov.ph",
    "reviewer1@ppp.gov.ph",
    "reviewer2@ppp.gov.ph"
  ],
  
  approvalChain: [
    {
      _id: ObjectId("507f1f77bcf86cd799439012"),
      email: "chief.ppmed@ppp.gov.ph",
      name: "Roberto Cruz",
      division: "PPMED",
      role: "Division Chief",
      status: "pending",
      approvedAt: null,
      comment: null
    },
    {
      _id: ObjectId("507f1f77bcf86cd799439013"),
      email: "oic.director@ppp.gov.ph",
      name: "Dr. Amanda Lopez",
      division: null,
      role: "OIC Director",
      status: "pending",
      approvedAt: null,
      comment: null
    }
  ],
  
  reviewers: [
    {
      _id: ObjectId("507f1f77bcf86cd799439014"),
      email: "reviewer1@ppp.gov.ph",
      name: "Juan Dela Cruz",
      division: "PPMED",
      role: "Division Member",
      status: "submitted",
      submittedAt: ISODate("2026-05-17T14:30:00Z"),
      reviewComments: "Document looks complete. Recommend for approval."
    },
    {
      _id: ObjectId("507f1f77bcf86cd799439015"),
      email: "reviewer2@ppp.gov.ph",
      name: "Rosa Manila",
      division: "PPMED",
      role: "Division Member",
      status: "pending",
      submittedAt: null,
      reviewComments: null
    }
  ],
  
  workflowEvents: [
    "POLICY_CREATED",
    "ACCESS_GRANTED",
    "DOCUMENT_UPLOADED",
    "REVIEW_READY"
  ],
  
  lastActivityAt: ISODate("2026-05-17T14:30:00Z"),
  escalated: false,
  
  publishedAt: null,
  archivedAt: null,
  
  timeline: [
    {
      _id: ObjectId("507f1f77bcf86cd799439016"),
      event: "created",
      from: null,
      to: "Draft",
      changedBy: "maria.santos@ppp.gov.ph",
      reason: "Initial policy creation",
      timestamp: ISODate("2026-05-15T09:00:00Z")
    },
    {
      _id: ObjectId("507f1f77bcf86cd799439017"),
      event: "status_changed",
      from: "Draft",
      to: "Collaborating",
      changedBy: "maria.santos@ppp.gov.ph",
      reason: "Added collaborators for review",
      timestamp: ISODate("2026-05-15T10:15:00Z")
    },
    {
      _id: ObjectId("507f1f77bcf86cd799439018"),
      event: "status_changed",
      from: "Collaborating",
      to: "For Review",
      changedBy: "maria.santos@ppp.gov.ph",
      reason: "Submitted for review",
      timestamp: ISODate("2026-05-16T11:00:00Z")
    }
  ],
  
  createdAt: ISODate("2026-05-15T09:00:00Z"),
  updatedAt: ISODate("2026-05-17T14:30:00Z"),
  
  version: 1
}
```

### User Document (Complete Example)

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439020"),
  identifier: "maria.santos@ppp.gov.ph",
  email: "maria.santos@ppp.gov.ph",
  name: "Maria Santos",
  
  role: "Division Member",
  division: "PPMED",
  
  password: "$2b$10$YJh0xfVVZWmz1q2K9Lq.a.uJvR9kQ5wZ2xM3K5tB9jC7hE4fL2o0m",  // bcrypt hash
  verified: true,
  
  status: "active",
  firstLogin: false,
  
  canPublishPolicies: true,  // Only because division = PPMED
  
  lastLoginAt: ISODate("2026-05-17T14:30:00Z"),
  lastActivityAt: ISODate("2026-05-17T14:30:00Z"),
  
  createdAt: ISODate("2026-05-01T08:00:00Z"),
  updatedAt: ISODate("2026-05-17T14:30:00Z")
}
```

### RepositoryDocument (Complete Example)

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439030"),
  policyId: ObjectId("507f1f77bcf86cd799439011"),
  
  name: "policy-draft-v1.pdf",
  type: "pdf",
  mimeType: "application/pdf",
  fileSize: 2097152,  // 2 MB
  
  fileDataUrl: "data:application/pdf;base64,JVBERi0xLjQKJeLj...",  // Truncated for brevity
  
  version: 1,
  isLatest: true,
  
  owner: "maria.santos@ppp.gov.ph",
  uploadedBy: "maria.santos@ppp.gov.ph",
  accessEmails: ["chief.ppmed@ppp.gov.ph", "reviewer1@ppp.gov.ph"],
  
  createdAt: ISODate("2026-05-15T09:30:00Z"),
  updatedAt: ISODate("2026-05-15T09:30:00Z"),
  
  division: "PPMED",
  status: "active"
}
```

---

## Data Integrity

### Foreign Key Constraints (Application-Level)

Since MongoDB doesn't support foreign key constraints natively, implement at application level:

```javascript
// When creating/updating Policy.createdBy, verify User exists
const user = await User.findOne({ identifier: createdBy });
if (!user) throw new Error("User does not exist");

// When granting access, verify email corresponds to valid User
const user = await User.findOne({ email: accessEmail });
if (!user) throw new Error("Cannot grant access to non-existent user");

// When creating RepositoryDocument, verify Policy exists
const policy = await Policy.findById(policyId);
if (!policy) throw new Error("Policy does not exist");

// When archiving Policy, cascade to related RepositoryDocuments
await RepositoryDocument.updateMany(
  { policyId: policyId },
  { $set: { status: "archived" } }
);
```

### Orphaned Record Prevention

```javascript
// Periodic cleanup: Find orphaned ActivityLog entries
const orphanedLogs = await db.collection('ActivityLog').find({
  policyId: { $ne: null },
  $expr: {
    $not: {
      $in: [
        "$policyId",
        await Policy.find({}).distinct("_id")
      ]
    }
  }
}).toArray();

// Option: Delete or archive
if (orphanedLogs.length > 0) {
  console.warn(`Found ${orphanedLogs.length} orphaned ActivityLog entries`);
}
```

### Data Consistency Checks

```javascript
// Verify all Notifications reference existing Users
db.Notification.aggregate([
  {
    $lookup: {
      from: "User",
      localField: "recipientEmail",
      foreignField: "email",
      as: "user"
    }
  },
  {
    $match: { user: { $size: 0 } }  // No match found
  }
]);

// Verify RepositoryDocument versions are sequential
db.RepositoryDocument.aggregate([
  { $group: { _id: "$policyId", versions: { $push: "$version" } } },
  { $project: { _id: 1, hasGap: { $ne: [{ $size: "$versions" }, { $max: "$versions" }] } } },
  { $match: { hasGap: true } }
]);
```

---

## Scalability Considerations

### Current Capacity

| Entity | Current Limit | Recommended Scale |
|--------|---------------|--------------------|
| Policies | 10,000 | 100,000 (before base64 fix) |
| Users | 200 | 10,000 |
| Documents | 50,000 | 1,000,000 (post-S3 migration) |
| Activity Logs | 50,000/year | 500,000/year (auto-cleaned) |
| Notifications | 100,000/month | 1,000,000/month (auto-cleaned) |

### Scaling Strategies

#### Phase 1: Initial Launch (Weeks 1-4)
- MongoDB: M2 tier (3 GB storage, 512 MB RAM)
- Max concurrent connections: 10
- Suitable for: ~100-500 active users

#### Phase 2: Growth Phase (Months 2-3)
- MongoDB: M5 tier (10 GB storage, 2 GB RAM)
- Implement Redis caching layer
- Max concurrent connections: 20
- Suitable for: ~500-2,000 active users

#### Phase 3: Enterprise Scale (Months 4+)
- MongoDB: M10+ tier (40+ GB storage, 8+ GB RAM)
- Implement sharding by division
- Dedicated connection pooling
- Max concurrent connections: 50+
- Suitable for: 2,000-10,000+ active users

### Base64 File Storage Refactor (CRITICAL)

**Current Issue**: Base64 encoding in database limits scalability

**Refactor Timeline**: Before Phase 2 scaling

```javascript
// NEW SCHEMA (S3/GCS Based)
{
  _id: ObjectId,
  policyId: ObjectId,
  name: String,
  type: String,
  mimeType: String,
  fileSize: Number,
  
  // AWS S3 or Google Cloud Storage
  fileKey: String,  // "policies/POL-2026-001/v1.pdf"
  fileUrl: String,  // Pre-signed URL (expires in 1 hour)
  
  version: Number,
  isLatest: Boolean,
  
  owner: String,
  uploadedBy: String,
  accessEmails: [String],
  
  createdAt: Date,
  updatedAt: Date,
}
```

**Benefits**:
- Reduces document size by 98%
- Enables unlimited file sizes (S3 limit: 5 TB)
- Improves query performance (no large strings)
- Enables CDN delivery for faster downloads
- Enables server-side encryption at S3 level

---

## Migration Guide

### New Project Setup

```javascript
// 1. Create database
use trackhub-prod;

// 2. Create collections with validation
db.createCollection("Policy", {
  validator: {
    $jsonSchema: { /* See Constraints above */ }
  }
});

db.createCollection("User", {
  validator: {
    $jsonSchema: { /* See Constraints above */ }
  }
});

// ... repeat for all 8 collections

// 3. Create all indexes
db.Policy.createIndex({ policyNumber: 1 }, { unique: true });
// ... repeat for all indexes from "Indexes & Query Optimization" section

// 4. Seed initial data
db.User.insertOne({
  identifier: "admin@ppp.gov.ph",
  email: "admin@ppp.gov.ph",
  name: "System Administrator",
  role: "OIC Director",
  division: null,
  password: "$2b$10$...",  // bcrypt hash
  verified: true,
  status: "active",
  firstLogin: false,
  createdAt: new Date(),
  updatedAt: new Date()
});

// 5. Enable TTL cleanup
db.ActivityLog.createIndex(
  { timestamp: 1 },
  { expireAfterSeconds: 31536000 }
);
```

### Existing System Migration

If migrating from existing system:

```javascript
// 1. Export data from old system
mongoexport --uri "mongodb://old-system" --collection Policy > policy.json

// 2. Transform data (application logic)
const policies = JSON.parse(fs.readFileSync('policy.json'));
const transformedPolicies = policies.map(p => ({
  ...p,
  // Map old field names to new schema
  workflowState: mapOldStateToNewState(p.state),
  timeline: p.history.map(h => ({
    event: h.type,
    from: h.previousState,
    to: h.newState,
    timestamp: h.date,
    ...
  })),
  ...
}));

// 3. Import to new system
mongoimport --uri "mongodb://new-system" --collection Policy < transformed_policy.json

// 4. Verify data integrity
const oldCount = oldDb.Policy.countDocuments();
const newCount = newDb.Policy.countDocuments();
console.assert(oldCount === newCount, "Migration count mismatch");
```

---

## Query Patterns

### Common Queries

#### Find All Policies for Division

```javascript
db.Policy.find({
  division: "PPMED",
  status: { $ne: "archived" }
}).sort({ createdAt: -1 }).limit(20);
```

#### Find Policies Requiring Action (Escalation)

```javascript
db.Policy.find({
  escalated: true,
  workflowState: { $in: ["For Review", "Under Review"] }
}).sort({ lastActivityAt: 1 });
```

#### Find User's Accessible Policies

```javascript
db.Policy.find({
  $or: [
    { createdBy: "maria.santos@ppp.gov.ph" },
    { accessEmails: "maria.santos@ppp.gov.ph" },
    { "approvalChain.email": "maria.santos@ppp.gov.ph" }
  ]
}).sort({ lastActivityAt: -1 });
```

#### Get All Documents for Policy (with versions)

```javascript
db.RepositoryDocument.find({
  policyId: ObjectId("507f1f77bcf86cd799439011")
}).sort({ version: -1 });
```

#### Get Latest Documents Only

```javascript
db.RepositoryDocument.find({
  policyId: ObjectId("507f1f77bcf86cd799439011"),
  isLatest: true
});
```

#### User's Unread Notifications

```javascript
db.Notification.find({
  recipientEmail: "maria.santos@ppp.gov.ph",
  read: false
}).sort({ timestamp: -1 }).limit(50);
```

#### Recent Activity Log

```javascript
db.ActivityLog.find({
  user: "maria.santos@ppp.gov.ph"
}).sort({ timestamp: -1 }).limit(100);
```

---

## Performance Tuning

### Query Optimization

#### Before Optimization
```javascript
// Slow query: 2 second scan
db.Policy.find({ division: "PPMED" }).sort({ createdAt: -1 });
// Explanation: Full collection scan (no index on division)
```

#### After Optimization
```javascript
// Fast query: 50ms
db.Policy.find({ division: "PPMED" }).sort({ createdAt: -1 });
// With index: { division: 1, createdAt: -1 }
```

### Monitoring Commands

```javascript
// Enable profiling for queries > 100ms
db.setProfilingLevel(1, { slowms: 100 });

// View slow queries
db.system.profile.find().sort({ ts: -1 }).limit(10);

// View collection statistics
db.Policy.stats();

// View index statistics
db.Policy.aggregate([ { $indexStats: {} } ]);

// Disable profiling
db.setProfilingLevel(0);
```

### Connection Pool Configuration

```javascript
// In backend/config/db.ts
const client = new MongoClient(mongoUri, {
  maxPoolSize: 10,          // Max connections (set based on tier)
  minPoolSize: 2,           // Min idle connections
  maxIdleTimeMS: 30000,     // Close idle connections after 30s
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  retryReads: true,
});
```

---

## Summary & Checklist

### ✅ Schema Implementation Checklist

- [ ] All 8 collections created with validation rules
- [ ] All 20+ indexes created
- [ ] TTL cleanup enabled for ActivityLog, Notification, VerificationCode
- [ ] Sample data loaded
- [ ] Backup strategy implemented
- [ ] Monitoring configured
- [ ] Slow query logging enabled
- [ ] Connection pooling tuned
- [ ] Orphaned record detection script created
- [ ] Data integrity checks automated

### ⚠️ Known Issues & Roadmap

| Priority | Issue | Status | Timeline |
|----------|-------|--------|----------|
| 🔴 CRITICAL | Base64 file storage (scalability) | Not Started | Week 3-4 (Pre-Launch) |
| 🟡 MEDIUM | N+1 notification query pattern | Not Started | Month 2 |
| 🟢 LOW | Redis caching layer | Not Started | Month 2-3 |
| 🟢 LOW | Sharding for enterprise scale | Not Started | Month 4+ |

### Production Readiness

- ✅ Schema design: COMPLETE
- ✅ Indexes: COMPLETE
- ✅ Validation: COMPLETE
- ✅ Documentation: COMPLETE
- ⏳ Base64 refactoring: PENDING (before production scale)
- ⏳ Performance testing: PENDING (before launch)
- ⏳ Backup/recovery testing: PENDING (before launch)

---

## Appendix: MongoDB Atlas Configuration

### Recommended Settings

```javascript
// Cluster Configuration
Tier: M5+ (for production)
Region: Southeast Asia (closest to users)
Replication: 3-node replica set (default)
Backup: Daily snapshots (7-day retention)

// Network Access
IP Whitelist: [Railway IP range, Your office IP]
Connection String: mongodb+srv://user:pass@cluster.mongodb.net/trackhub-prod

// Advanced Settings
Enable audit logging: YES
Enable encryption at rest: YES (included with M5+)
Enable auto-scaling: YES (storage only, not compute)
```

### Connection String Format

```
mongodb+srv://username:password@cluster0.mongodb.net/trackhub-prod?
  retryWrites=true&
  w=majority&
  maxPoolSize=10&
  minPoolSize=2
```

---

**Document Version**: 1.0  
**Last Reviewed**: May 18, 2026  
**Next Review**: June 18, 2026  
**Owner**: Database Architecture Team
