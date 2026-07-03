# Lead Capture API

Fastify API that receives marketing form leads, validates payloads, persists them to a JSON file, and optionally notifies a webhook.

Built for landing pages and small marketing teams that need a lightweight lead inbox without a full CRM.

## Features

- `POST /leads` — public endpoint for form submissions with Zod validation
- `GET /leads` — list stored leads (API key required)
- `GET /health` — service health check
- JSON file persistence with atomic writes (survives restarts)
- Optional webhook delivery with HMAC signature (`x-webhook-signature`)

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

## API

### `POST /leads`

No auth required — intended for public forms protected by rate limiting at the edge.

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "company": "Acme",
  "message": "Interested in pricing",
  "source": "landing"
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

### Webhook payload

When `WEBHOOK_URL` is set, each new lead triggers:

```json
{
  "event": "lead.created",
  "data": { "...lead fields..." }
}
```

If `WEBHOOK_SECRET` is set, the request includes `x-webhook-signature` (HMAC-SHA256 of the JSON body).

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
```

## Next steps

- Add rate limiting and honeypot field validation
- Retry failed webhook deliveries with a queue
- Optional Supabase sync for multi-instance deploys
