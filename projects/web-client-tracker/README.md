# Freelancer Client Tracker

Mini CRM for freelancers to track clients, pipeline status, and next follow-up dates.

## Features

- Demo auth stub with cookie session
- Protected `/clients` dashboard
- Client table with status badges and follow-up urgency
- Overdue follow-up alert banner
- Status filter (lead, active, negotiating, paused, closed)
- Add and edit clients with form validation
- Client list persisted in browser localStorage

## Quick start

```bash
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
    clients/     # Protected client list
    login/       # Auth stub login page
    api/auth/    # Login/logout route handlers
  components/    # UI components
  lib/           # Types, sample data, auth helpers
docs/
  api-contract.md  # Future backend integration contract
```

## Deploy (Vercel)

1. Import the `projects/web-client-tracker` directory in Vercel.
2. Set `NEXT_PUBLIC_APP_URL` to your production URL.
3. Deploy — no extra build settings required.

## Next steps

- Replace localStorage with API calls (see `docs/api-contract.md`)
- Add client delete/archive action
- Persist sessions with a real auth provider
