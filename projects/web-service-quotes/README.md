# Service Quote Builder

Next.js app for local service providers to build client-ready quotes from reusable service templates.

## Features

- Landing page with product overview
- Service templates (cleaning, lawn care, plumbing, painting)
- Quote builder with editable line items, tax rate, and validity date
- Live subtotal, tax, and total calculations
- Print-ready preview (save as PDF via browser print)
- Draft auto-save in browser local storage while editing
- Explicit save to a local quote library with resume/edit from home

## Quick start

```bash
cp .env.example .env
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **New quote**.

## Scripts

| Command         | Description             |
| --------------- | ----------------------- |
| `npm run dev`   | Start dev server        |
| `npm run build` | Production build        |
| `npm run start` | Start production server |
| `npm run test`  | Run unit tests (Vitest) |
| `npm run lint`  | ESLint                  |

## Project structure

```
src/
  app/
    quotes/new/       # New quote (resume draft or ?fresh=1)
    quotes/[id]/      # Edit a saved quote
  components/         # QuoteBuilder, QuotePreview, SavedQuotesList
  lib/
    templates.ts      # Service template catalog
    quote.ts          # Totals and formatting helpers
    quote-storage.ts  # Local storage parse/save helpers
    use-quote-draft.ts
```

## Local storage

| Key | Purpose |
| --- | ------- |
| `service-quotes:draft` | In-progress draft (auto-saved) |
| `service-quotes:saved` | Saved quote library |

Saved quotes stay on the current browser/device. Use **Save quote** in the builder to add or update the library. The home page lists saved quotes; click one to resume editing.

## Environment

| Variable                   | Description                          |
| -------------------------- | ------------------------------------ |
| `NEXT_PUBLIC_APP_URL`      | Public app URL                       |
| `NEXT_PUBLIC_BUSINESS_NAME`| Business name shown on quote preview |

## Next steps

- Branded PDF export with logo upload
- Custom template editor for each business
- Cloud sync API for multi-device access
