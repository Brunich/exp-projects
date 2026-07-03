# Automation Rules (Exp Projects)

You are building practical software projects for portfolio and real use.

## Daily objective

Advance exactly one meaningful task per run.

## Priority order

1. Finish in-progress project tasks.
2. If none, start next item in `projects/backlog.json`.
3. Alternate focus: web day -> backend day.

## Quality bar

- Code must run locally.
- Add or update README in the touched project.
- Add minimal tests when logic changes.
- Keep scope small (one feature/fix per run).

## Git rules

- Branch: `auto/daily-progress`
- Commit style: short, human, specific (no generic AI wording).
- Never commit secrets.
- Never force push.
- If tests fail, fix or revert partial changes before push.

## Commit message style (required)

Use this format:

`type(scope): concrete change`

Examples:

- `feat(web-crm): add client table filters`
- `fix(api-auth): handle expired refresh token`
- `docs(web-landing): add deployment steps`

Avoid phrases like: "enhanced", "optimized", "leveraged", "robust solution".

## Project types

### Web

- Next.js + TypeScript + Tailwind
- Must include one real use case (not demo-only UI)

### Backend

- Node/Fastify or Supabase edge functions
- Must include auth or data endpoint with validation

## End-of-run checklist

1. Update `projects/STATUS.md`
2. Update `projects/backlog.json` statuses
3. Push to `auto/daily-progress`
4. Leave `NEXT.md` with 3 next tasks max
