# Freelancer Client Tracker

Mini CRM for freelancers to track clients, pipeline status, and next follow-up dates.

## Features

- Demo auth stub with cookie session
- Protected `/clients` dashboard
- REST API (`/api/clients`) with JSON file persistence
- Client table with status badges and follow-up urgency
- Overdue follow-up alert banner
- Status filter (lead, active, negotiating, paused, closed)
- Add and edit clients with form validation
- Archive clients with restore and permanent delete
- Active / archived tabs with confirmation dialogs
- Export archived clients as CSV download

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

## API

All `/api/clients` routes require an active session cookie (log in first).

- `GET /api/clients` — list clients
- `POST /api/clients` — create client
- `PATCH /api/clients/:id` — update, archive (`{ "action": "archive" }`), or restore (`{ "action": "restore" }`)
- `DELETE /api/clients/:id` — permanent delete
- `GET /api/clients/export?scope=archived` — download archived clients as CSV

See `docs/api-contract.md` for request/response shapes.

## Deploy (Vercel)

1. Import the `projects/web-client-tracker` directory in Vercel.
2. Set `NEXT_PUBLIC_APP_URL` to your production URL.
3. For persistent storage on Vercel, mount a volume or swap `CLIENTS_FILE` for a hosted database.

## Next steps

- Add bulk archive actions
- Replace file store with Supabase or Postgres for multi-instance deploys
- Email reminders for overdue follow-ups
