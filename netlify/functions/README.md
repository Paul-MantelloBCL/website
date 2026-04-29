# Netlify Functions

## `waitlist.mjs`

Routes website form POSTs into Notion databases.

| Form name (`form-name`) | Notion DB env var |
| --- | --- |
| `school-waitlist` | `NOTION_SCHOOL_DB_ID` |
| `newsletter` | `NOTION_NEWSLETTER_DB_ID` |

### Required env vars (Netlify dashboard → Site settings → Environment variables)

- `NOTION_TOKEN` — internal integration token with access to BOTH databases
- `NOTION_SCHOOL_DB_ID` — school waitlist database id
- `NOTION_NEWSLETTER_DB_ID` — newsletter database id

### Notion integration access

The integration must be explicitly invited to each database (Notion API doesn't auto-grant). On each DB page → `…` menu → **Connections** → add the integration that owns `NOTION_TOKEN`.

### Behavior

- POST only. GET / other methods → 405.
- Honeypot field `bot-field` must be empty. Bots that fill it get redirected to `/thanks` silently.
- Email validated by regex + length.
- School form requires `name`, `email`, `trade`. `shop_size`, `needs_subsidy`, `biggest_question` are optional.
- Newsletter form requires `email` only.
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
