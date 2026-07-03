# Client Tracker API Contract

Draft contract for a future backend that will replace the in-memory sample data.

## Base URL

```
https://api.example.com/v1
```

## Authentication

All endpoints require a bearer token issued after login.

```
Authorization: Bearer <access_token>
```

The current web app uses a cookie-based demo session. When integrating a real API, swap `src/lib/auth.ts` for token storage and attach the header on fetch calls.

## Endpoints

### `GET /clients`

Returns the authenticated user's client list.

**Response `200`**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Ana García",
      "company": "Studio Norte",
      "email": "ana@studionorte.com",
      "status": "active",
      "nextFollowUp": "2026-07-05",
      "notes": "Monthly retainer"
    }
  ]
}
```

### `POST /clients`

Creates a client record.

**Request body**

```json
{
  "name": "string (required)",
  "company": "string (required)",
  "email": "string (required, email)",
  "status": "lead | active | negotiating | paused | closed",
  "nextFollowUp": "YYYY-MM-DD (required)",
  "notes": "string (optional)"
}
```

**Response `201`**: created client object.

### `PATCH /clients/:id`

Partial update for status, follow-up date, or notes.

### `DELETE /clients/:id`

Soft-delete or archive a client.

## Validation rules

- `status` must be one of the enum values used in `src/lib/types.ts`.
- `nextFollowUp` must be a valid ISO date string (`YYYY-MM-DD`).
- `email` must be a valid email address.

## Webhook (future)

`POST /webhooks/client-follow-up` could notify external tools (Slack, email) when a follow-up becomes overdue.

## Error shape

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "nextFollowUp must be a future date for active leads"
  }
}
```
