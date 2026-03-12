# TrackHub Backend API

This backend is aligned with your current frontend pages and data contracts.

## Base URL

- Local: `http://localhost:5000`
- API Prefix: `/api`

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

## Notes

- Default demo users are automatically seeded at startup if user collection is empty.
- Password rules are aligned with frontend requirements:
  - Minimum 10 characters
  - Uppercase, lowercase, number, special character
- For demo parity with your current frontend UX, code request endpoints return `previewCode`.
