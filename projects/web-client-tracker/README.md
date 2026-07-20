# Freelancer Client Tracker

Mini CRM for freelancers to track clients, pipeline status, and next follow-up dates.

## Features

- Demo auth stub with cookie session
- Protected `/clients` dashboard
- Dashboard stats panel with active total, overdue follow-up count, due-this-week count, and pipeline status breakdown; click overdue or due-this-week cards to filter the table
- REST API (`/api/clients`) with JSON file persistence
- Client table with status badges and follow-up urgency labels
- Follow-up urgency badges on table rows (today, tomorrow, overdue)
- Overdue follow-up alert banner
- Email reminder drafts with mailto links and optional SMTP bulk send
- Slack or generic webhook notifications for overdue follow-up digests
- Daily cron job to auto-send overdue reminders when SMTP is configured
- Status filter (lead, active, negotiating, paused, closed)
- Search by client name or company with overdue-only and due-this-week quick filters
- Keyboard shortcuts: `/` or `Ctrl+K` to focus search, `Esc` to clear or reset filters, `N` to add a client, `T` to open the activity timeline for the first visible row
- Add and edit clients with form validation
- Archive clients with restore and permanent delete
- Active / archived tabs with confirmation dialogs
- Bulk archive and restore with row selection
- Export archived clients as CSV download
- Per-client activity timeline (notes, reminder history, status changes)

## Quick start

```bash
cp .env.example .env
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo login

| Field    | Value                 |
| -------- | --------------------- |
| Email    | `demo@freelancer.dev` |
| Password | `demo123`             |

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Start dev server         |
| `npm run build`| Production build         |
| `npm run start`| Start production server  |
| `npm run test` | Run unit tests (Vitest)  |
| `npm run lint` | ESLint                   |

## Project structure

```
src/
  app/
    api/clients/   # CRUD API routes (session-protected)
    clients/       # Protected client list
    login/         # Auth stub login page
    api/auth/      # Login/logout route handlers
  components/      # UI components
  lib/
    server/        # File-backed ClientStore
docs/
  api-contract.md  # API reference (implemented by /api/clients)
data/
  clients.json     # Local persistence (gitignored, auto-created)
```

## Environment

| Variable              | Description                                      |
| --------------------- | ------------------------------------------------ |
| `NEXT_PUBLIC_APP_URL` | Public app URL for redirects                     |
| `CLIENTS_FILE`        | Path to JSON client store (default `data/clients.json`) |
| `SMTP_HOST`           | SMTP host for server-sent reminders (optional)          |
| `SMTP_PORT`           | SMTP port (default `587`)                               |
| `SMTP_USER`           | SMTP username                                           |
| `SMTP_PASS`           | SMTP password                                           |
| `SMTP_FROM`           | From address for sent reminders                         |
| `CRON_SECRET`         | Bearer token for `/api/cron/reminders` (set in Vercel for cron auth) |
| `REMINDER_CRON_SENDER_EMAIL` | Reply-from email used by the daily cron job      |
| `REMINDER_CRON_SENDER_NAME`  | Display name for cron-sent reminders (optional)  |
| `OVERDUE_WEBHOOK_URL`        | Slack incoming webhook or generic URL for overdue digests |
| `OVERDUE_WEBHOOK_SECRET`     | Optional HMAC secret sent as `x-webhook-signature` |

## API

All `/api/clients` routes require an active session cookie (log in first).

- `GET /api/clients` — list clients
- `POST /api/clients` — create client
- `PATCH /api/clients/:id` — update, archive (`{ "action": "archive" }`), or restore (`{ "action": "restore" }`)
- `GET /api/clients/:id/activity` — client activity timeline
- `POST /api/clients/:id/activity` — add a timeline note (`{ "text": "..." }`)
- `PATCH /api/clients/bulk` — archive or restore multiple clients (`{ "action": "archive" | "restore", "ids": ["uuid", ...] }`)
- `DELETE /api/clients/:id` — permanent delete
- `GET /api/clients/export?scope=archived` — download archived clients as CSV
- `GET /api/clients/reminders` — list overdue follow-up email drafts
- `POST /api/clients/reminders` — send reminders via SMTP when configured
- `POST /api/clients/reminders/webhook` — push overdue digest to Slack/webhook
- `GET /api/cron/reminders` — daily scheduled send (requires `Authorization: Bearer <CRON_SECRET>`)

See `docs/api-contract.md` for request/response shapes.

## Scheduled reminders

When SMTP and cron env vars are set, Vercel runs `GET /api/cron/reminders` every day at 09:00 UTC (`vercel.json`). The job sends reminders for overdue clients who have not already been reminded today. When `OVERDUE_WEBHOOK_URL` is set, the cron also posts a digest of all overdue clients to Slack (auto-detected) or a generic webhook — even if SMTP is not configured.

Required for cron:

1. All SMTP variables above
2. `CRON_SECRET` — Vercel sends this as a bearer token automatically
3. `REMINDER_CRON_SENDER_EMAIL` — shown as the reply-to sender in reminder emails

## Deploy (Vercel)

1. Import the `projects/web-client-tracker` directory in Vercel.
2. Set `NEXT_PUBLIC_APP_URL` to your production URL.
3. Set `CRON_SECRET`, SMTP vars, and `REMINDER_CRON_SENDER_EMAIL` for automated reminders.
4. For persistent storage on Vercel, mount a volume or swap `CLIENTS_FILE` for a hosted database.

## Next steps

- Replace file store with Supabase or Postgres for multi-instance deploys
- Quote status workflow integration with `web-service-quotes`
