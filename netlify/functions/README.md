# Netlify Functions

## `waitlist.mjs`

Routes website form POSTs into Notion databases.

| Form name (`form-name`) | Notion DB env var |
| --- | --- |
| `school-waitlist` | `NOTION_SCHOOL_DB_ID` |
| `newsletter` | `NOTION_NEWSLETTER_DB_ID` |
| `audit-request` | `NOTION_AUDIT_DB_ID` |

### Required env vars (Netlify dashboard → Site settings → Environment variables)

- `NOTION_TOKEN` — internal integration token with access to ALL three databases
- `NOTION_SCHOOL_DB_ID` — school waitlist database id
- `NOTION_NEWSLETTER_DB_ID` — newsletter database id
- `NOTION_AUDIT_DB_ID` — phishing-audit-requests database id (`3553aa22-6e2f-81cd-8b06-d3b50d55368f`)

### Notion integration access

The integration must be explicitly invited to each database (Notion API doesn't auto-grant). On each DB page → `…` menu → **Connections** → add the integration that owns `NOTION_TOKEN`.

### Behavior

- POST only. GET / other methods → 405.
- Honeypot field `bot-field` must be empty. Bots that fill it get redirected to `/thanks` silently.
- Email validated by regex + length.
- School form requires `name`, `email`, `trade`. `shop_size`, `needs_subsidy`, `biggest_question` are optional.
- Newsletter form requires `email` only.
- Audit-request form requires `shop_name`, `email`, `trade`, `ap_team_size`, `date_window`. The four `has_*` checkboxes and `notes` are optional.
- Success → 303 redirect to `/thanks`.
- Failure → 303 redirect to `/contact?error=<reason>`.

### Local test

```bash
npx netlify dev    # starts site on http://localhost:8888 with functions
# In another shell:
curl -X POST http://localhost:8888/.netlify/functions/waitlist \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "form-name=newsletter&email=test@example.com&source=local-test"
# Expect: 303 redirect to /thanks. Check the Newsletter DB in Notion.
```

## `newsletter-welcome.mjs` (scheduled)

Runs every 10 minutes via `export const config = { schedule: "*/10 * * * *" }`.
Polls the Newsletter DB for rows with `Status = "Subscribed"` and an empty
`Welcomed at` date, sends a welcome email via Resend, then stamps `Welcomed at`.

### Required env vars (in addition to the waitlist ones)

- `RESEND_API_KEY` — from [resend.com](https://resend.com) after you verify the
  `bluecollarlabs.org` sending domain (DKIM/SPF/Return-Path DNS records).
- `WELCOME_FROM` — optional. Defaults to `BCL <support@bluecollarlabs.org>`.
  Whatever you set must be a verified Resend sender or sends will 403.

### Required Notion DB columns (already added to Newsletter signups)

| Property | Type |
| --- | --- |
| `Welcomed at` | Date |
| `Welcome error` | Rich text |

### Behavior

- If `RESEND_API_KEY` is unset, the function returns 200 with
  `{"skipped":"RESEND_API_KEY not set"}` and does nothing — safe to deploy
  before you've finished Resend setup.
- Each scheduled run processes up to 25 oldest pending rows.
- On send failure, writes the error string to `Welcome error` and leaves
  `Welcomed at` empty so the next run retries.
- Invalid email formats get marked with a `Welcome error` and stamped only via
  the error column (no retry).

### Manual test (after deploy)

```bash
# Trigger the scheduled function on demand (Netlify CLI):
npx netlify functions:invoke newsletter-welcome --no-identity
```
