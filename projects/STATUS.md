# Project Status

Last updated: 2026-07-06

| Project | Type | Status | Notes |
|---|---|---|---|
| web-client-tracker | web | in_progress | Auth stub, REST API with JSON persistence, client CRUD, archive/restore/delete, bulk archive/restore, filters, search by name/company, overdue-only quick filter, overdue alerts, CSV export, email reminder drafts with mailto + SMTP bulk send, Slack/webhook overdue digests, daily Vercel cron for auto-reminders, per-client activity timeline (notes + reminder history) |
| api-leads-capture | backend | in_progress | Fastify POST/GET leads, Zod validation, API key auth, JSON persistence, list filters and pagination, CSV export, email deduplication with optional upsert mode, webhook notify with retry queue, dead-letter replay, dead-letter CSV export, dead-letter purge by date, scheduled cron auto-purge via `GET /cron/purge-dead-letters`, GitHub Actions daily purge workflow, honeypot + rate limiting |
| web-service-quotes | web | in_progress | Landing page, service templates, custom template editor, search/category filter, quote builder with quote number + issue date, status tracking (draft/sent/accepted), live totals, print preview, draft auto-save, saved quote library with status filters, PDF download with logo upload, quote expiration reminders and expired-quote banner, follow-up email drafts for expired sent quotes |
