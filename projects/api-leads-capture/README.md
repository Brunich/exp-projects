# Lead Capture API

Fastify API that receives marketing form leads, validates payloads, persists them to a JSON file, and optionally notifies a webhook.

Built for landing pages and small marketing teams that need a lightweight lead inbox without a full CRM.

## Features

- `POST /leads` — public endpoint for form submissions with Zod validation
- Email deduplication on `POST /leads` — duplicate addresses return the existing lead without re-firing webhooks (or upsert name/message when `LEAD_DEDUP_MODE=upsert`)
- Honeypot field check (`website` by default) silently rejects bots with a decoy 201
- Per-IP rate limiting on `POST /leads` (10 requests/minute by default)
- `GET /leads` — list stored leads with optional filters, pagination, and CSV export (API key required)
- `GET /health` — service health check
- JSON file persistence with atomic writes (survives restarts)
- Optional webhook delivery with HMAC signature (`x-webhook-signature`)
- Failed webhook deliveries queued with exponential backoff retries
- Background worker processes the retry queue on an interval
- `GET /webhooks/queue` — inspect pending and dead webhook deliveries (API key required)
- `GET /webhooks/queue?format=csv` — export filtered queue items as CSV (API key required)
- `POST /webhooks/queue/:id/replay` — replay a dead-letter webhook delivery (API key required)
- `POST /webhooks/queue/replay-dead` — replay all dead-letter webhook deliveries (API key required)
- `DELETE /webhooks/queue/dead` — purge dead-letter webhook deliveries by date/source filter (API key required)
- `GET /cron/purge-dead-letters` — scheduled auto-purge of dead letters older than `DEAD_LETTER_RETENTION_DAYS` (CRON_SECRET bearer required)

## Quick start

```bash
cp .env.example .env
npm install
npm run dev
```

Server runs at [http://localhost:3001](http://localhost:3001).

## Environment

| Variable         | Description                                      |
| ---------------- | ------------------------------------------------ |
| `PORT`           | HTTP port (default `3001`)                       |
| `API_KEY`        | Key for `GET /leads` (header `x-api-key`)        |
| `LEADS_FILE`     | Path to JSON leads store (default `data/leads.json`) |
| `WEBHOOK_URL`    | Optional URL notified on each new lead           |
| `WEBHOOK_SECRET` | Optional HMAC secret for webhook signatures      |
| `WEBHOOK_QUEUE_FILE` | Path to webhook retry queue JSON (default `data/webhook-queue.json`) |
| `WEBHOOK_MAX_ATTEMPTS` | Max delivery attempts before marking dead (default `5`) |
| `WEBHOOK_WORKER_INTERVAL_MS` | Retry worker poll interval in ms (default `30000`) |
| `RATE_LIMIT_MAX` | Max `POST /leads` requests per IP per window (default `10`) |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms (default `60000`) |
| `HONEYPOT_FIELD` | Hidden form field name bots should leave empty (default `website`) |
| `LEAD_DEDUP_MODE` | Duplicate email handling: `ignore` (default) or `upsert` |
| `CRON_SECRET` | Bearer token for scheduled cron endpoints |
| `DEAD_LETTER_RETENTION_DAYS` | Auto-purge dead letters older than N days (minimum `7`; unset disables cron purge) |
| `SUPABASE_URL` | Optional Supabase project URL — enables shared Postgres storage for multi-instance deploys |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (required with `SUPABASE_URL`) |
| `SUPABASE_LEADS_TABLE` | Postgres table name for leads (default `leads`) |

## API

### `POST /leads`

No auth required — intended for public forms. Add a hidden honeypot field (leave empty) and rely on rate limiting for abuse control.

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "company": "Acme",
  "message": "Interested in pricing",
  "source": "landing",
  "website": ""
}
```

The `website` field is the default honeypot. If a bot fills it, the API returns `201` with a fake lead id but does not store the submission.

**Rate limit exceeded (`429`)**

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many lead submissions. Try again in 42 seconds."
  }
}
```

`source` accepts `landing`, `referral`, `ads`, or `other` (defaults to `landing`).

**Response `201`** (new lead)

```json
{
  "data": {
    "id": "uuid",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "source": "landing",
    "createdAt": "2026-07-03T12:00:00.000Z"
  }
}
```

**Response `200`** (duplicate email — same lead returned, no webhook)

```json
{
  "data": { "...existing lead fields..." },
  "meta": { "duplicate": true }
}
```

**Response `200`** (duplicate email with `LEAD_DEDUP_MODE=upsert` — lead refreshed, no webhook)

```json
{
  "data": { "...updated lead fields..." },
  "meta": { "duplicate": true, "updated": true }
}
```

Emails are compared case-insensitively (`Jane@Example.com` matches `jane@example.com`).

### `GET /leads`

Requires `x-api-key: <API_KEY>` or `Authorization: Bearer <API_KEY>`.

Optional query parameters:

| Param    | Description                                              |
| -------- | -------------------------------------------------------- |
| `source` | Filter by source (`landing`, `referral`, `ads`, `other`) |
| `q`      | Search name, email, company, or message (case-insensitive) |
| `since`  | Only leads created on or after `YYYY-MM-DD`              |
| `limit`  | Page size (1–100, default `50`)                        |
| `offset` | Skip N matching leads (default `0`)                    |
| `format` | Response format: `json` (default) or `csv`             |

**Response `200`**

```json
{
  "data": [{ "...lead fields..." }],
  "meta": {
    "total": 42,
    "limit": 50,
    "offset": 0
  }
}
```

**CSV export (`format=csv`)**

Returns `text/csv` with a download filename like `leads-2026-07-05.csv`. Filters (`source`, `q`, `since`) still apply, but pagination is ignored so all matching leads are included.

```bash
curl "http://localhost:3001/leads?format=csv&since=2026-07-01" \
  -H "x-api-key: dev-api-key-change-me" \
  -o leads.csv
```

### Webhook payload

When `WEBHOOK_URL` is set, each new lead triggers:

```json
{
  "event": "lead.created",
  "data": { "...lead fields..." }
}
```

If `WEBHOOK_SECRET` is set, the request includes `x-webhook-signature` (HMAC-SHA256 of the JSON body).

When delivery fails, the lead is still stored and the webhook is queued for retry (1 min, 5 min, 15 min, 60 min backoff). After `WEBHOOK_MAX_ATTEMPTS` failures the item is marked dead.

### `GET /webhooks/queue`

Requires API key. Returns queue stats and pending/dead items when `WEBHOOK_URL` is configured.

Optional query filters:

| Param | Description |
| ----- | ----------- |
| `status` | `pending` or `dead` |
| `source` | Lead source: `landing`, `referral`, `ads`, `other` |
| `deadAfter` | ISO datetime — include items with `updatedAt` on or after this time |
| `deadBefore` | ISO datetime — include items with `updatedAt` on or before this time |
| `format` | Response format: `json` (default) or `csv` |

**CSV export (`format=csv`)**

Returns `text/csv` with a download filename like `dead-letters-2026-07-05.csv`. Filters (`status`, `source`, `deadAfter`, `deadBefore`) still apply. Use `status=dead` to export only failed webhook deliveries.

```bash
curl "http://localhost:3001/webhooks/queue?format=csv&status=dead" \
  -H "x-api-key: dev-api-key-change-me" \
  -o dead-letters.csv
```

### `POST /webhooks/queue/:id/replay`

Requires API key. Requeues a dead-letter item for immediate retry and runs the worker once.

**Response `200`**

```json
{
  "data": {
    "item": { "...replayed queue item..." },
    "processResult": {
      "processed": 1,
      "delivered": 1,
      "rescheduled": 0,
      "dead": 0
    }
  }
}
```

Returns `400` if the item is still pending, or `404` if the id is unknown.

### `POST /webhooks/queue/replay-dead`

Requires API key. Requeues dead-letter items for immediate retry and runs the worker once. Accepts the same query filters as `GET /webhooks/queue` to replay a subset (for example, only `ads` leads that failed after a given date).

**Response `200`**

```json
{
  "data": {
    "replayedCount": 2,
    "items": [{ "...replayed queue item..." }],
    "processResult": {
      "processed": 2,
      "delivered": 2,
      "rescheduled": 0,
      "dead": 0
    }
  }
}
```

### `DELETE /webhooks/queue/dead`

Requires API key. Permanently removes dead-letter items from the queue. Accepts the same query filters as `GET /webhooks/queue` (`source`, `deadAfter`, `deadBefore`). Only items with `status=dead` are removed; pending retries are never deleted.

Use `deadBefore` to drop old failures during housekeeping, for example dead letters last updated before the start of the month.

**Response `200`**

```json
{
  "data": {
    "purgedCount": 3,
    "filter": { "deadBefore": "2026-07-01T00:00:00.000Z" },
    "items": [{ "...purged queue item..." }],
    "stats": { "pending": 0, "dead": 1, "total": 1 }
  }
}
```

### `GET /cron/purge-dead-letters`

Requires `Authorization: Bearer <CRON_SECRET>`. Intended for an external scheduler (GitHub Actions, Fly.io cron, system cron) — not the general API key.

When `DEAD_LETTER_RETENTION_DAYS` is set (minimum `7`), permanently removes dead-letter items whose `updatedAt` is on or before the retention cutoff. Pending retries are never deleted. Skips safely when the webhook queue or retention env is not configured.

**Response `200`**

```json
{
  "data": {
    "ok": true,
    "purgedCount": 2,
    "retentionDays": 30,
    "cutoff": "2026-06-06T08:00:00.000Z",
    "items": [{ "...purged queue item..." }],
    "stats": { "pending": 0, "dead": 1, "total": 1 }
  }
}
```

**Skipped run (`retention_not_configured`)**

```json
{
  "data": {
    "ok": true,
    "skipped": "retention_not_configured",
    "purgedCount": 0,
    "retentionDays": null,
    "cutoff": null,
    "items": [],
    "stats": { "pending": 0, "dead": 3, "total": 3 }
  }
}
```

Example daily schedule (03:00 UTC):

```bash
curl -X GET "https://your-api.example.com/cron/purge-dead-letters" \
  -H "Authorization: Bearer $CRON_SECRET"
```

### GitHub Actions scheduler

This repo includes `.github/workflows/api-leads-purge-dead-letters.yml`, which calls the cron endpoint daily at 03:00 UTC (and supports manual runs via **Actions → Purge webhook dead letters → Run workflow**).

Set these repository secrets in GitHub (**Settings → Secrets and variables → Actions**):

| Secret | Description |
| ------ | ----------- |
| `LEADS_API_BASE_URL` | Deployed API origin, e.g. `https://leads-api.example.com` (no trailing slash) |
| `LEADS_CRON_SECRET` | Same value as `CRON_SECRET` on the server |

The workflow skips safely when secrets are not configured, so local-only clones do not fail scheduled runs.

Ensure `DEAD_LETTER_RETENTION_DAYS` is set on the server (minimum `7`) or the cron endpoint returns `skipped: retention_not_configured`.

## Supabase storage (multi-instance)

By default leads are stored in a local JSON file (`LEADS_FILE`). For production deploys with multiple instances (Fly.io, Railway, serverless), set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to use a shared Postgres table instead.

1. Create a Supabase project and run the migration in `supabase/migrations/001_leads.sql` (SQL editor or `supabase db push`).
2. Copy the project URL and **service role** key into `.env`.
3. Restart the API — `createLeadStore()` picks Supabase automatically when both vars are set.

The table includes a generated `email_normalized` column for case-insensitive deduplication. File storage remains the default when Supabase env vars are unset, so local dev and single-node deploys work unchanged.

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_LEADS_TABLE=leads
```

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Start dev server (watch) |
| `npm run build`| Compile TypeScript       |
| `npm run start`| Run compiled server      |
| `npm run test` | Run Vitest unit tests    |
| `npm run lint` | Type-check with `tsc`    |

## Example curl

```bash
curl -X POST http://localhost:3001/leads \
  -H "content-type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com","message":"Hello"}'

curl http://localhost:3001/leads \
  -H "x-api-key: dev-api-key-change-me"

curl "http://localhost:3001/leads?source=landing&q=pricing&limit=20" \
  -H "x-api-key: dev-api-key-change-me"

curl -X POST "http://localhost:3001/webhooks/queue/replay-dead?source=ads&deadAfter=2026-07-01T00:00:00.000Z" \
  -H "x-api-key: dev-api-key-change-me"

curl "http://localhost:3001/webhooks/queue?format=csv&status=dead" \
  -H "x-api-key: dev-api-key-change-me" \
  -o dead-letters.csv

curl -X DELETE "http://localhost:3001/webhooks/queue/dead?deadBefore=2026-07-01T00:00:00.000Z" \
  -H "x-api-key: dev-api-key-change-me"
```

## Next steps

- Webhook queue sync to Supabase for multi-instance retry workers
- Lead stats summary endpoint (`GET /leads/stats`)
