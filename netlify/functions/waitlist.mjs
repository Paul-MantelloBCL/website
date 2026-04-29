// Routes website form submissions into Notion databases.
// Supports two forms by `form-name`:
//   - school-waitlist  -> NOTION_SCHOOL_DB_ID
//   - newsletter       -> NOTION_NEWSLETTER_DB_ID
// Honeypot field `bot-field` must be empty. Redirects to /thanks on success,
// /contact?error=... on failure (so the user always lands somewhere sane).

const NOTION_VERSION = "2022-06-28";
const NOTION_BASE = "https://api.notion.com/v1";

const ALLOWED_TRADES = new Set([
  "Electrical",
  "Plumbing",
  "HVAC",
  "Carpentry / framing",
  "General contracting",
  "Mechanical / auto",
  "Landscaping / hardscape",
  "Roofing",
  "Other",
]);

const TRADE_VALUE_TO_LABEL = {
  electrical: "Electrical",
  plumbing: "Plumbing",
  hvac: "HVAC",
  carpentry: "Carpentry / framing",
  general: "General contracting",
  mechanical: "Mechanical / auto",
  landscaping: "Landscaping / hardscape",
  roofing: "Roofing",
  other: "Other",
};

const ALLOWED_SHOP_SIZES = new Set(["1 (just me)", "2-5", "6-15", "16-50", "50+"]);

const SHOP_SIZE_VALUE_TO_LABEL = {
  "1": "1 (just me)",
  "2-5": "2-5",
  "6-15": "6-15",
  "16-50": "16-50",
  "50+": "50+",
};

function parseBody(event) {
  const ct = (event.headers["content-type"] || event.headers["Content-Type"] || "").toLowerCase();
  if (ct.includes("application/json")) {
    return JSON.parse(event.body || "{}");
  }
  // application/x-www-form-urlencoded
  const params = new URLSearchParams(event.body || "");
  const out = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

function redirect(location, statusCode = 303) {
  return {
    statusCode,
    headers: { Location: location, "Cache-Control": "no-store" },
    body: "",
  };
}

function isValidEmail(s) {
  if (typeof s !== "string") return false;
  if (s.length < 5 || s.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

async function notionCreatePage(databaseId, properties) {
  const res = await fetch(`${NOTION_BASE}/pages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ parent: { database_id: databaseId }, properties }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion ${res.status}: ${text.slice(0, 400)}`);
  }
  return res.json();
}

function buildSchoolProps({ name, email, trade, shopSize, freeSeat, note, source, ip, ua }) {
  const tradeLabel = TRADE_VALUE_TO_LABEL[(trade || "").toLowerCase()] || (ALLOWED_TRADES.has(trade) ? trade : "Other");
  const shopLabel = SHOP_SIZE_VALUE_TO_LABEL[shopSize] || (ALLOWED_SHOP_SIZES.has(shopSize) ? shopSize : null);

  const props = {
    Name: { title: [{ text: { content: name.slice(0, 200) } }] },
    Email: { email },
    Trade: { select: { name: tradeLabel } },
    "Free seat ask": { checkbox: !!freeSeat },
    Status: { select: { name: "New" } },
    Source: { select: { name: source || "/school" } },
    "Submitted at": { date: { start: new Date().toISOString() } },
  };
  if (shopLabel) props["Shop size"] = { select: { name: shopLabel } };
  if (note) props.Note = { rich_text: [{ text: { content: note.slice(0, 1900) } }] };
  if (ip || ua) props["IP / UA"] = { rich_text: [{ text: { content: `${ip || ""} | ${ua || ""}`.slice(0, 1900) } }] };
  return props;
}

function buildNewsletterProps({ email, source, ip, ua }) {
  return {
    Email: { title: [{ text: { content: email } }] },
    Status: { select: { name: "Subscribed" } },
    Source: { select: { name: source || "/index footer" } },
    "Submitted at": { date: { start: new Date().toISOString() } },
    "IP / UA": { rich_text: [{ text: { content: `${ip || ""} | ${ua || ""}`.slice(0, 1900) } }] },
  };
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let body;
  try {
    body = parseBody(event);
  } catch {
    return redirect("/contact?error=bad-request");
  }

  // Honeypot: silently accept and redirect (don't reveal it's a trap)
  if (body["bot-field"]) {
    return redirect("/thanks");
  }

  const formName = body["form-name"];
  const email = (body.email || "").trim().toLowerCase();
  const ip = event.headers["x-forwarded-for"] || event.headers["client-ip"] || "";
  const ua = event.headers["user-agent"] || "";

  if (!isValidEmail(email)) {
    return redirect("/contact?error=invalid-email");
  }

  try {
    if (formName === "school-waitlist") {
      const dbId = process.env.NOTION_SCHOOL_DB_ID;
      if (!dbId || !process.env.NOTION_TOKEN) throw new Error("missing env");
      const name = (body.name || "").trim();
      if (!name) return redirect("/contact?error=name-required");

      const freeSeatRaw = body.free_seat ?? body.needs_subsidy;
      const props = buildSchoolProps({
        name,
        email,
        trade: body.trade,
        shopSize: body.shop_size,
        freeSeat: freeSeatRaw === "yes" || freeSeatRaw === "on" || freeSeatRaw === "true",
        note: body.note ?? body.biggest_question,
        source: body.source || "/school",
        ip,
        ua,
      });
      await notionCreatePage(dbId, props);
      return redirect("/thanks");
    }

    if (formName === "newsletter") {
      const dbId = process.env.NOTION_NEWSLETTER_DB_ID;
      if (!dbId || !process.env.NOTION_TOKEN) throw new Error("missing env");
      const props = buildNewsletterProps({ email, source: body.source || "/index footer", ip, ua });
      await notionCreatePage(dbId, props);
      return redirect("/thanks");
    }

    return redirect("/contact?error=unknown-form");
  } catch (err) {
    console.error("waitlist function error:", err.message);
    return redirect("/contact?error=server");
  }
}
