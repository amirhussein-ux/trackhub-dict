# TrackHub Backend API

This backend is aligned with your current frontend pages and data contracts.

## Base URL

- Local: `http://localhost:5000`
- API Prefix: `/api`

## Environment Variables

Required server-side values:

- `MONGODB_URL`
- `AUTH_SESSION_SECRET` (or `SESSION_SECRET`)
- `SEED_ADMIN_PASSWORD`
- `SEED_DIVISION_CHIEF_PASSWORD`
- `SEED_DIVISION_MEMBER_PASSWORD`

Optional server-side values:

- `PORT` (default `5000`)
- `FRONTEND_URL` (default `http://localhost:8080`)
- `SUPPORT_EMAIL` (Gmail address that receives support concerns)
- `SUPPORT_EMAIL_PASSWORD` (Gmail App Password for SMTP delivery)

Use `.env.example` as the template and keep real `.env` files out of source control.

## Abuse Protection

The backend enforces in-memory request throttling to reduce brute force, bot scraping, and automated endpoint abuse.

- Global API limiter on `/api`
- Auth limiter on `/api/auth` plus stricter login limiter on `POST /api/auth/login`
- Read limiter (`GET`) and creation limiter (`POST`) on protected resource endpoints
- Reserved strict limiter for AI generation paths: `/api/ai` and `/api/generate`

These limits are intentionally conservative defaults for local and small deployments.

## Health

- `GET /api/health`

## Auth (matches Forgot Password and First Login pages)

- `POST /api/auth/login`
- `POST /api/auth/forgot-password/request-code`
- `POST /api/auth/forgot-password/verify-code`
- `POST /api/auth/forgot-password/reset`
- `POST /api/auth/first-login/request-code`
- `POST /api/auth/first-login/verify-code`
- `POST /api/auth/first-login/complete`

## Policies (matches Policy Tracker, Timeline, Reports, Dashboard)

- `POST /api/policies`
- `GET /api/policies`
- `GET /api/policies/:id`
- `PUT /api/policies/:id`
- `DELETE /api/policies/:id`

Supported query params for `GET /api/policies`:
- `division`
- `status`
- `type`
- `search`
- `includeArchived=true|false`

## Documents (matches Document Repository and Archive)

- `POST /api/documents`
- `GET /api/documents`
- `PUT /api/documents/:id`
- `DELETE /api/documents/:id`

Supported query params for `GET /api/documents`:
- `division`
- `type`
- `category`
- `status`
- `policyId`
- `search`

## Activity Logs (matches Activity Log and Dashboard recent activity)

- `POST /api/activities`
- `GET /api/activities`

## Notifications

- `POST /api/notifications`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`

## Contact & Support

- `POST /api/support/contact`

Multipart form fields:
- `fullName`
- `email`
- `department` (optional)
- `subject`
- `category`
- `message`
- `attachment` (optional)

Attachment rules:
- Max size: `5 MB`
- Allowed types: `pdf`, `docx`, `png`, `jpg`

## Notes

- Default demo users are automatically seeded at startup if user collection is empty.
- Password rules are aligned with frontend requirements:
  - Minimum 10 characters
  - Uppercase, lowercase, number, special character
