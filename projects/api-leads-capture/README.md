# Lead Capture API

Fastify API that receives marketing form leads, validates payloads, persists them to a JSON file, and optionally notifies a webhook.

Built for landing pages and small marketing teams that need a lightweight lead inbox without a full CRM.

## Features

- `POST /leads` — public endpoint for form submissions with Zod validation
- Honeypot field check (`website` by default) silently rejects bots with a decoy 201
- Per-IP rate limiting on `POST /leads` (10 requests/minute by default)
- `GET /leads` — list stored leads with optional filters and pagination (API key required)
- `GET /health` — service health check
- JSON file persistence with atomic writes (survives restarts)
- Optional webhook delivery with HMAC signature (`x-webhook-signature`)
- Failed webhook deliveries queued with exponential backoff retries
- Background worker processes the retry queue on an interval
- `GET /webhooks/queue` — inspect pending and dead webhook deliveries (API key required)
- `POST /webhooks/queue/:id/replay` — replay a dead-letter webhook delivery (API key required)
- `POST /webhooks/queue/replay-dead` — replay all dead-letter webhook deliveries (API key required)

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

**Response `201`**

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
```

## Next steps

- Optional Supabase sync for multi-instance deploys
- Export leads as CSV from the list endpoint
