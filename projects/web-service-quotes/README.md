# Service Quote Builder

Next.js app for local service providers to build client-ready quotes from reusable service templates.

## Features

- Landing page with product overview
- Service templates (cleaning, lawn care, plumbing, painting)
- Quote builder with editable line items, tax rate, and validity date
- Live subtotal, tax, and total calculations
- Print-ready preview (save as PDF via browser print)

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
    quotes/new/     # Quote builder page
  components/       # QuoteBuilder, QuotePreview, ServiceTemplatePicker
  lib/
    templates.ts    # Service template catalog
    quote.ts        # Totals and formatting helpers
```

## Environment

| Variable                   | Description                          |
| -------------------------- | ------------------------------------ |
| `NEXT_PUBLIC_APP_URL`      | Public app URL                       |
| `NEXT_PUBLIC_BUSINESS_NAME`| Business name shown on quote preview |

## Next steps

- Persist quotes to local storage or API
- Custom template editor for each business
- Branded PDF export with logo upload
