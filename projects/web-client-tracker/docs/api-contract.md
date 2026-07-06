# Client Tracker API Contract

Implemented by the Next.js app at `/api/clients`. Requires an active session cookie from the demo login.

## Base URL

```
http://localhost:3000/api
```

In production, use your deployed app URL with the same path prefix.

## Authentication

All endpoints require a valid session cookie (`fct_session`) set after login.

Unauthenticated requests return `401`:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Login required"
  }
}
```

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

**Response `201`**: `{ "data": { ...created client } }`

### `PATCH /clients/:id`

Partial update for client fields, or archive/restore via action.

**Update body** — same shape as `POST /clients`.

**Archive body**

```json
{ "action": "archive" }
```

**Restore body**

```json
{ "action": "restore" }
```

**Response `200`**: `{ "data": { ...updated client } }`

### `PATCH /clients/bulk`

Archive or restore multiple clients in one request.

**Request body**

```json
{
  "action": "archive",
  "ids": ["uuid-1", "uuid-2"]
}
```

`action` must be `archive` or `restore`. `ids` must be a non-empty array of client UUIDs.

**Response `200`**

```json
{
  "data": {
    "updated": [{ "...client fields..." }],
    "notFound": ["missing-uuid"]
  }
}
```

### `DELETE /clients/:id`

Permanently removes a client (typically from the archived list).

**Response `200`**: `{ "data": { "id": "uuid" } }`

### `GET /clients/:id/activity`

Returns the activity timeline for a client (notes, reminders, status changes). Newest entries first.

**Response `200`**

```json
{
  "data": {
    "clientId": "uuid",
    "timeline": [
      {
        "id": "uuid",
        "type": "note",
        "text": "Call summary — waiting on contract",
        "createdAt": "2026-07-06T14:30:00.000Z"
      },
      {
        "id": "uuid",
        "type": "reminder_sent",
        "text": "Follow-up reminder email sent",
        "createdAt": "2026-07-05T12:00:00.000Z"
      }
    ]
  }
}
```

Activity types: `note`, `reminder_sent`, `status_changed`, `follow_up_changed`, `created`, `archived`, `restored`.

Legacy clients with only `lastReminderAt` (no stored reminder activities) include a synthetic `reminder_sent` entry in the timeline.

### `POST /clients/:id/activity`

Adds a standalone note to the client activity timeline.

**Request body**

```json
{
  "text": "string (required, max 2000 chars)"
}
```

**Response `201`**: same shape as `GET /clients/:id/activity` with the updated timeline.

### `GET /clients/export?scope=archived`

Downloads archived clients as a CSV file.

**Query params**

- `scope` — must be `archived`

**Response `200`**

- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="archived-clients-YYYY-MM-DD.csv"`

Columns: `id`, `name`, `company`, `email`, `status`, `next_follow_up`, `notes`, `archived_at`.

Returns a header-only CSV when no archived clients exist.

### `GET /clients/reminders`

Returns follow-up reminder email drafts for overdue active clients.

**Response `200`**

```json
{
  "data": {
    "drafts": [
      {
        "clientId": "uuid",
        "to": "client@example.com",
        "clientName": "Marco Ruiz",
        "company": "Ruiz Logistics",
        "subject": "Following up — Ruiz Logistics",
        "body": "Hi Marco,\n\n...",
        "mailto": "mailto:client%40example.com?subject=...",
        "daysOverdue": 3,
        "lastReminderAt": "2026-07-01"
      }
    ],
    "smtpConfigured": false,
    "overdueCount": 1
  }
}
```

### `POST /clients/reminders`

Sends follow-up reminders for overdue clients when SMTP env vars are set.

**Request body (optional)**

```json
{
  "ids": ["uuid-1", "uuid-2"]
}
```

Omit `ids` to send to all overdue clients. Successful sends update `lastReminderAt` on each client.

**Response `200`** (SMTP configured)

```json
{
  "data": {
    "results": [
      { "clientId": "uuid", "to": "client@example.com", "sent": true }
    ],
    "sentCount": 1,
    "failedCount": 0
  }
}
```

**Response `503`** when SMTP is not configured (includes draft payloads in `data.drafts`).

## Validation rules

- `status` must be one of the enum values used in `src/lib/types.ts`.
- `nextFollowUp` must be a valid ISO date string (`YYYY-MM-DD`).
- `email` must be a valid email address.

## Persistence

Clients are stored in a JSON file on disk (`CLIENTS_FILE`, default `data/clients.json`). The file is created with sample data on first run.

## Webhook (future)

`POST /webhooks/client-follow-up` could notify external tools (Slack) when a follow-up becomes overdue.

## Error shape

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid client data",
    "fields": {
      "email": "Enter a valid email address"
    }
  }
}
```
