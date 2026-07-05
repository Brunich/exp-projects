# Service Quote Builder

Next.js app for local service providers to build client-ready quotes from reusable service templates.

## Features

- Landing page with product overview
- Service templates (cleaning, lawn care, plumbing, painting)
- Custom template editor with local storage (create, edit, delete, duplicate your own job packages)
- Search and category filter on the custom templates page
- Quote builder with editable line items, tax rate, and validity date
- Auto-generated quote numbers (`Q-YYYY-NNNN`) with editable issue date
- Live subtotal, tax, and total calculations
- One-click PDF download for completed quotes (client, title, and line items required)
- Branded PDF export with optional logo upload and business name override
- Print-ready preview (browser print for quick copies)
- Draft auto-save in browser local storage while editing
- Explicit save to a local quote library with resume/edit from home
- Delete saved quotes from the home list or while editing (with confirmation)

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
    quote-pdf.ts      # PDF filename, validation, and generation
    brand-settings.ts # Logo upload validation and local branding storage
    quote-storage.ts  # Local storage parse/save helpers
    use-quote-draft.ts
```

## Local storage

| Key | Purpose |
| --- | ------- |
| `service-quotes:draft` | In-progress draft (auto-saved) |
| `service-quotes:saved` | Saved quote library |
| `service-quotes:brand` | Logo and business name for PDF exports |
| `service-quotes:custom-templates` | User-created service templates |

Saved quotes stay on the current browser/device. Use **Save quote** in the builder to add or update the library. The home page lists saved quotes; click one to resume editing, use **PDF** to download a copy, or **Delete** to remove a quote from this device.

## PDF export

**Download PDF** is enabled when a quote has a client name, project title, valid-until date, and at least one line item with a description and quantity. PDFs use your uploaded logo and business name from the quote builder (or `NEXT_PUBLIC_BUSINESS_NAME` as a fallback).

## Environment

| Variable                   | Description                          |
| -------------------------- | ------------------------------------ |
| `NEXT_PUBLIC_APP_URL`      | Public app URL                       |
| `NEXT_PUBLIC_BUSINESS_NAME`| Business name shown on quote preview |

## Custom templates

Open **Templates** from the home page or quote builder to create job packages with your own line items. Custom templates appear alongside built-in ones when starting a quote.

## Next steps

- Cloud sync API for multi-device access
