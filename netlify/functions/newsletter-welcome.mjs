// Scheduled function: sends a welcome email to brand-new newsletter subscribers.
//
// Runs every 10 minutes (see netlify.toml schedule). Polls the Notion
// Newsletter DB for rows where Status="Subscribed" and "Welcomed at" is empty,
// sends a short welcome email via Resend, then stamps "Welcomed at".
//
// On Resend failure, writes the error message into the "Welcome error" rich_text
// column so we can see what went wrong without re-sending.
//
// Required env vars (Netlify dashboard):
//   NOTION_TOKEN              - same token already used by waitlist.mjs
//   NOTION_NEWSLETTER_DB_ID   - 3513aa22-6e2f-812f-9844-e651d23d9a85
//   RESEND_API_KEY            - from resend.com after domain verification
//   WELCOME_FROM              - e.g. "BCL <support@bluecollarlabs.org>"
//                               (defaults below if unset, but must be a verified
//                                Resend sender or the API will reject)

const NOTION_VERSION = "2022-06-28";
const NOTION_BASE = "https://api.notion.com/v1";
const RESEND_BASE = "https://api.resend.com";
const BATCH_LIMIT = 25;

const DEFAULT_FROM = "BCL <support@bluecollarlabs.org>";

const SUBJECT = "Welcome to Blue Collar Labs";

function welcomeText(email) {
  return [
    `Hey,`,
    ``,
    `You're on the BCL list. We send the practical stuff: AI workflows for tradesmen, scam-defense drills for small shops, and early access to new modules.`,
    ``,
    `While you're here, three things worth grabbing:`,
    `- Free Defense Pack (phishing teardown + 60-min incident plan): https://bluecollarlabs.org/defense-pack`,
    `- First 10 prompts every tradesman should save: https://bluecollarlabs.org/prompts`,
    `- Founding Cohort 2026 (limited seats, with subsidies): https://bluecollarlabs.org/cohort-2026`,
    ``,
    `Reply to this email if you want a free seat or have a question. A real human reads every reply.`,
    ``,
    `- Paul`,
    `Blue Collar Labs Academy`,
    `https://bluecollarlabs.org`,
    ``,
    `---`,
    `You're receiving this because you signed up at bluecollarlabs.org with ${email}. Reply "unsubscribe" and we'll remove you.`,
  ].join("\n");
}

function welcomeHtml(email) {
  const safe = String(email).replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]));
  return `<!doctype html>
<html><body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#111;background:#fff;line-height:1.5;">
<div style="max-width:560px;margin:0 auto;">
  <p>Hey,</p>
  <p>You're on the BCL list. We send the practical stuff: AI workflows for tradesmen, scam-defense drills for small shops, and early access to new modules.</p>
  <p>While you're here, three things worth grabbing:</p>
  <ul>
    <li><a href="https://bluecollarlabs.org/defense-pack" style="color:#0a4d8c;">Free Defense Pack</a> &mdash; phishing teardown + 60-min incident plan</li>
    <li><a href="https://bluecollarlabs.org/prompts" style="color:#0a4d8c;">First 10 prompts</a> every tradesman should save</li>
    <li><a href="https://bluecollarlabs.org/cohort-2026" style="color:#0a4d8c;">Founding Cohort 2026</a> &mdash; limited seats, subsidies available</li>
  </ul>
  <p>Reply to this email if you want a free seat or have a question. A real human reads every reply.</p>
  <p>&mdash; Paul<br/>Blue Collar Labs Academy<br/><a href="https://bluecollarlabs.org" style="color:#0a4d8c;">bluecollarlabs.org</a></p>
  <hr style="border:none;border-top:1px solid #ddd;margin:24px 0;"/>
  <p style="font-size:12px;color:#666;">You're receiving this because you signed up at bluecollarlabs.org with ${safe}. Reply "unsubscribe" and we'll remove you.</p>
</div>
</body></html>`;
}

async function notionQueryPending(dbId, token) {
  const res = await fetch(`${NOTION_BASE}/databases/${dbId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      page_size: BATCH_LIMIT,
      filter: {
        and: [
          { property: "Status", select: { equals: "Subscribed" } },
          { property: "Welcomed at", date: { is_empty: true } },
        ],
      },
      sorts: [{ property: "Submitted at", direction: "ascending" }],
    }),
  });
  if (!res.ok) throw new Error(`Notion query ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).results || [];
}

async function notionPatchPage(pageId, properties, token) {
  const res = await fetch(`${NOTION_BASE}/pages/${pageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ properties }),
  });
  if (!res.ok) throw new Error(`Notion patch ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

async function resendSend({ from, to, subject, text, html, apiKey }) {
  const res = await fetch(`${RESEND_BASE}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text, html }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Resend ${res.status}: ${body.slice(0, 300)}`);
  return body;
}

function emailFromRow(row) {
  const t = row.properties?.Email?.title;
  if (!Array.isArray(t) || !t.length) return null;
  return (t[0].plain_text || "").trim().toLowerCase();
}

function isValidEmail(s) {
  if (typeof s !== "string") return false;
  if (s.length < 5 || s.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function handler() {
  const notionToken = process.env.NOTION_TOKEN;
  const dbId = process.env.NOTION_NEWSLETTER_DB_ID;
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.WELCOME_FROM || DEFAULT_FROM;

  if (!notionToken || !dbId) {
    return { statusCode: 500, body: JSON.stringify({ error: "missing NOTION env" }) };
  }
  if (!resendKey) {
    return { statusCode: 200, body: JSON.stringify({ skipped: "RESEND_API_KEY not set" }) };
  }

  let rows;
  try {
    rows = await notionQueryPending(dbId, notionToken);
  } catch (e) {
    console.error("query failed:", e.message);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const errors = [];

  for (const row of rows) {
    const email = emailFromRow(row);
    if (!isValidEmail(email)) {
      skipped++;
      try {
        await notionPatchPage(
          row.id,
          {
            "Welcome error": { rich_text: [{ text: { content: "invalid email format" } }] },
          },
          notionToken,
        );
      } catch {}
      continue;
    }

    try {
      await resendSend({
        from,
        to: email,
        subject: SUBJECT,
        text: welcomeText(email),
        html: welcomeHtml(email),
        apiKey: resendKey,
      });
      await notionPatchPage(
        row.id,
        {
          "Welcomed at": { date: { start: new Date().toISOString() } },
          "Welcome error": { rich_text: [] },
        },
        notionToken,
      );
      sent++;
    } catch (e) {
      failed++;
      errors.push(`${email}: ${e.message}`);
      try {
        await notionPatchPage(
          row.id,
          {
            "Welcome error": { rich_text: [{ text: { content: e.message.slice(0, 1900) } }] },
          },
          notionToken,
        );
      } catch {}
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ checked: rows.length, sent, failed, skipped, errors }),
  };
}

export const config = { schedule: "*/10 * * * *" };
