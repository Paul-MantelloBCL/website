// Routes website form submissions into Notion databases.
// Supports five forms by `form-name`:
//   - school-waitlist       -> NOTION_SCHOOL_DB_ID
//   - cohort-2026-waitlist  -> NOTION_SCHOOL_DB_ID (same DB; Source disambiguates)
//   - newsletter            -> NOTION_NEWSLETTER_DB_ID
//   - audit-request         -> NOTION_AUDIT_DB_ID
//   - app-waitlist          -> NOTION_APP_WAITLIST_DB_ID
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

const ALLOWED_REDIRECTS = new Set([
  "/thanks",
  "/defense-pack",
]);

function pickRedirect(raw, fallback = "/thanks") {
  if (typeof raw !== "string") return fallback;
  return ALLOWED_REDIRECTS.has(raw) ? raw : fallback;
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

const AP_TEAM_SIZE_LABELS = {
  "owner-only": "1 (owner does it)",
  "1-dedicated": "1 dedicated",
  "2-3": "2-3",
  "4-10": "4-10",
  "10+": "10+",
};

const AUDIT_SOURCE_ALLOWED = new Set(["/defend", "/defense-pack", "/resources", "/audit-request"]);

function truthy(v) {
  return v === "yes" || v === "on" || v === "true" || v === true;
}

function buildAuditProps({ shopName, email, trade, apTeamSize, has2fa, hasCallback, hasTraining, hasIrPlan, dateWindow, notes, source, ip, ua }) {
  const tradeLabel = TRADE_VALUE_TO_LABEL[(trade || "").toLowerCase()] || (ALLOWED_TRADES.has(trade) ? trade : "Other");
  const apLabel = AP_TEAM_SIZE_LABELS[apTeamSize] || null;
  const sourceLabel = AUDIT_SOURCE_ALLOWED.has(source) ? source : "/audit-request";

  const props = {
    "Shop name": { title: [{ text: { content: shopName.slice(0, 200) } }] },
    Email: { email },
    Trade: { select: { name: tradeLabel } },
    "Has 2FA on email": { checkbox: !!has2fa },
    "Has callback policy for wires/ACH": { checkbox: !!hasCallback },
    "Has phishing training in last 12mo": { checkbox: !!hasTraining },
    "Has incident response plan": { checkbox: !!hasIrPlan },
    Status: { select: { name: "New" } },
    Source: { select: { name: sourceLabel } },
    "Submitted at": { date: { start: new Date().toISOString() } },
  };
  if (apLabel) props["AP team size"] = { select: { name: apLabel } };
  if (dateWindow) props["Date window"] = { rich_text: [{ text: { content: dateWindow.slice(0, 1900) } }] };
  if (notes) props.Notes = { rich_text: [{ text: { content: notes.slice(0, 1900) } }] };
  if (ip || ua) props["IP / UA"] = { rich_text: [{ text: { content: `${ip || ""} | ${ua || ""}`.slice(0, 1900) } }] };
  return props;
}

const APP_WAITLIST_TRADES = new Set([
  "Electrician", "Plumber", "HVAC", "Mechanic", "Body Shop", "Welder",
  "Carpenter", "Painter", "GC / Builder",
  "Chef / Cook", "Cosmetologist", "Stylist", "Barber", "Esthetician",
  "Roofer", "Landscaper", "Other",
]);

const APP_WAITLIST_TRADE_NORMALIZE = {
  electrician: "Electrician",
  plumber: "Plumber",
  hvac: "HVAC",
  mechanic: "Mechanic",
  bodyshop: "Body Shop",
  "body shop": "Body Shop",
  welder: "Welder",
  carpenter: "Carpenter",
  painter: "Painter",
  gc: "GC / Builder",
  builder: "GC / Builder",
  chef: "Chef / Cook",
  cook: "Chef / Cook",
  cosmetologist: "Cosmetologist",
  stylist: "Stylist",
  barber: "Barber",
  esthetician: "Esthetician",
  roofer: "Roofer",
  landscaper: "Landscaper",
  other: "Other",
};

const APP_WAITLIST_ROLES = new Set(["Apprentice", "Journeyman", "Owner", "Other"]);
const APP_WAITLIST_ROLE_NORMALIZE = {
  apprentice: "Apprentice",
  journeyman: "Journeyman",
  owner: "Owner",
  other: "Other",
};

const APP_WAITLIST_PLATFORMS = new Set(["iOS", "Android", "Either"]);
const APP_WAITLIST_PLATFORM_NORMALIZE = {
  ios: "iOS",
  android: "Android",
  either: "Either",
};

const APP_WAITLIST_SOURCES = new Set([
  "tsbsi_nj collab", "IG", "Web direct", "Referral", "Other",
]);

function buildAppWaitlistProps({ name, email, trade, role, platform, stateRegion, note, source }) {
  const tradeLabel = APP_WAITLIST_TRADE_NORMALIZE[(trade || "").toLowerCase()]
    || (APP_WAITLIST_TRADES.has(trade) ? trade : "Other");
  const roleLabel = APP_WAITLIST_ROLE_NORMALIZE[(role || "").toLowerCase()]
    || (APP_WAITLIST_ROLES.has(role) ? role : null);
  const platformLabel = APP_WAITLIST_PLATFORM_NORMALIZE[(platform || "").toLowerCase()]
    || (APP_WAITLIST_PLATFORMS.has(platform) ? platform : "Either");
  const sourceLabel = APP_WAITLIST_SOURCES.has(source) ? source : "Web direct";

  const props = {
    Name: { title: [{ text: { content: name.slice(0, 200) } }] },
    Email: { email },
    Trade: { select: { name: tradeLabel } },
    Platform: { select: { name: platformLabel } },
    Source: { select: { name: sourceLabel } },
    Status: { select: { name: "New" } },
    "Submitted at": { date: { start: new Date().toISOString() } },
  };
  if (roleLabel) props.Role = { select: { name: roleLabel } };
  if (stateRegion) props.State = { rich_text: [{ text: { content: stateRegion.slice(0, 60) } }] };
  if (note) props.Note = { rich_text: [{ text: { content: note.slice(0, 1900) } }] };
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
    if (formName === "school-waitlist" || formName === "cohort-2026-waitlist") {
      const dbId = process.env.NOTION_SCHOOL_DB_ID;
      if (!dbId || !process.env.NOTION_TOKEN) throw new Error("missing env");
      const name = (body.name || "").trim();
      if (!name) return redirect("/contact?error=name-required");

      const freeSeatRaw = body.free_seat ?? body.needs_subsidy;

      const noteParts = [];
      const baseNote = body.note ?? body.biggest_question ?? "";
      if (baseNote) noteParts.push(baseNote);
      if (formName === "cohort-2026-waitlist") {
        if (body.years) noteParts.push(`Years: ${body.years}`);
        if (body.role) noteParts.push(`Role: ${body.role}`);
        if (body.success_signal) noteParts.push(`Week-4 success: ${body.success_signal}`);
      }

      const sourceDefault = formName === "cohort-2026-waitlist" ? "/cohort-2026" : "/school";

      const props = buildSchoolProps({
        name,
        email,
        trade: body.trade,
        shopSize: body.shop_size,
        freeSeat: freeSeatRaw === "yes" || freeSeatRaw === "on" || freeSeatRaw === "true",
        note: noteParts.join(" · ") || null,
        source: body.source || sourceDefault,
        ip,
        ua,
      });
      await notionCreatePage(dbId, props);
      return redirect("/thanks");
    }

    if (formName === "audit-request") {
      const dbId = process.env.NOTION_AUDIT_DB_ID;
      if (!dbId || !process.env.NOTION_TOKEN) throw new Error("missing env");
      const shopName = (body.shop_name || "").trim();
      if (!shopName) return redirect("/contact?error=shop-name-required");
      const dateWindow = (body.date_window || "").trim();
      if (!dateWindow) return redirect("/contact?error=date-window-required");

      const props = buildAuditProps({
        shopName,
        email,
        trade: body.trade,
        apTeamSize: body.ap_team_size,
        has2fa: truthy(body.has_2fa),
        hasCallback: truthy(body.has_callback_policy),
        hasTraining: truthy(body.has_training),
        hasIrPlan: truthy(body.has_ir_plan),
        dateWindow,
        notes: body.notes,
        source: body.source || "/audit-request",
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
      return redirect(pickRedirect(body.redirect));
    }

    if (formName === "app-waitlist") {
      const dbId = process.env.NOTION_APP_WAITLIST_DB_ID;
      if (!dbId || !process.env.NOTION_TOKEN) throw new Error("missing env");
      const name = (body.name || "").trim();
      if (!name) return redirect("/contact?error=name-required");

      const props = buildAppWaitlistProps({
        name,
        email,
        trade: body.trade,
        role: body.role,
        platform: body.platform,
        stateRegion: body.state,
        note: body.note,
        source: body.source || "Web direct",
      });
      await notionCreatePage(dbId, props);
      return redirect("/thanks");
    }

    return redirect("/contact?error=unknown-form");
  } catch (err) {
    console.error("waitlist function error:", err.message);
    return redirect("/contact?error=server");
  }
}
