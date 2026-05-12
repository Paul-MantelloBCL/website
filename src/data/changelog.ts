// Public changelog. Audited-in-public: every shipped item lands here, grouped
// by week. Each entry should answer (a) what shipped, (b) which pillar it
// serves, and (c) where to find it. Newest week first; newest entry first
// within a week. Keep summaries one sentence.

export type Pillar = 'Build' | 'Teach' | 'Defend' | 'Infrastructure';

export interface ChangelogEntry {
  title: string;
  pillar: Pillar;
  summary: string;
  href?: string;
}

export interface ChangelogWeek {
  label: string;        // e.g. "Week of May 12, 2026"
  iso: string;          // ISO date of the Monday of the week, for sorting + machine consumption
  entries: ChangelogEntry[];
}

export const weeks: ChangelogWeek[] = [
  {
    label: 'Week of May 12, 2026',
    iso: '2026-05-11',
    entries: [
      {
        title: '/start-here archetype router',
        pillar: 'Infrastructure',
        summary: 'Four front-door cards (apprentice, shop owner, press, donor) route first-time visitors to the right destination in one click. Currently on a review branch — ships to main alongside this changelog.',
      },
      {
        title: '/changelog page (this page)',
        pillar: 'Infrastructure',
        summary: 'Public weekly progress log. Grant reviewers, donors, and cohort prospects see momentum in one URL instead of scrolling commits.',
        href: '/changelog',
      },
    ],
  },
  {
    label: 'Week of May 5, 2026',
    iso: '2026-05-04',
    entries: [
      {
        title: 'OpenAI + Anthropic + Goodstack nonprofit credits approved',
        pillar: 'Infrastructure',
        summary: 'All three nonprofit-program applications cleared the same week — covers most of Year-1 inference costs.',
      },
      {
        title: 'BCL App — Founding-25 cohort waitlist',
        pillar: 'Build',
        summary: 'Mobile companion app moved from concept to live waitlist. Founding-25 framing aligned with cohort scarcity.',
        href: '/app-waitlist',
      },
      {
        title: 'Trade-specific Defense Pack landing pages',
        pillar: 'Defend',
        summary: 'Per-trade conversion pages live for electrical, plumbing, HVAC, GC — each tuned for the shop owner who searched for that trade.',
      },
    ],
  },
  {
    label: 'Week of April 28, 2026',
    iso: '2026-04-27',
    entries: [
      {
        title: '501(c)(3) determination letter received',
        pillar: 'Infrastructure',
        summary: 'IRS approved tax-exempt status on April 29. EIN 42-1853577. Footer + every donation surface now reflects the IRS-determined posture.',
      },
      {
        title: 'Phishing-audit intake at /audit-request',
        pillar: 'Defend',
        summary: 'Two-minute, five-field intake form. Submissions land in a Notion DB and get auto-scored for risk; reviews open 80% pre-done.',
      },
      {
        title: '/audits public progress page',
        pillar: 'Defend',
        summary: 'Live 0/10 case-study counter. Anchors the Year-1 audit commitment with a visible meter that updates every deploy.',
      },
    ],
  },
  {
    label: 'Week of April 21, 2026',
    iso: '2026-04-20',
    entries: [
      {
        title: 'Founding Cohort 2026 landing page',
        pillar: 'Teach',
        summary: 'Turned the 4-week curriculum into a saleable page. Founding-class pricing + apprentice scholarship language live.',
      },
      {
        title: 'BCL Small-Shop Defense Pack v0.1',
        pillar: 'Defend',
        summary: 'Three real phishing teardowns + a 60-minute incident plan, print-ready. Lead magnet for the audit funnel.',
      },
      {
        title: 'First 10 prompts every tradesman should have saved',
        pillar: 'Teach',
        summary: 'Week-1 cohort drop shipped as a public 12-slide IG/TikTok carousel + 10 standalone prompt pages anyone can copy.',
        href: '/prompts',
      },
    ],
  },
  {
    label: 'Week of April 14, 2026',
    iso: '2026-04-13',
    entries: [
      {
        title: 'Cert verification at /verify',
        pillar: 'Teach',
        summary: 'One-click public lookup for any AI-Ready Tradesman cert. Closes the hiring-side trust loop before a single cert is issued.',
      },
      {
        title: '/resources hub',
        pillar: 'Infrastructure',
        summary: 'Public home for the free downloads (10-prompts, Defense Pack, expense-BCL template). One URL, one set of expectations.',
      },
      {
        title: 'Per-page OG cards (1200×630)',
        pillar: 'Infrastructure',
        summary: 'Every shared link now has a tuned preview. Auto-sync hooked to content collections so new prompts + blog posts never ship without a card.',
      },
    ],
  },
  {
    label: 'Week of April 7, 2026',
    iso: '2026-04-06',
    entries: [
      {
        title: 'bluecollarlabs.org launched',
        pillar: 'Infrastructure',
        summary: 'First public site live. Built-by-tradesmen framing, three-pillar BUILD/TEACH/DEFEND structure, donation rail wired.',
        href: '/',
      },
      {
        title: '/about + Year-1 commitments',
        pillar: 'Infrastructure',
        summary: 'Mission, founder, four Year-1 targets (50 contractors, 100 trained, 10 audits, first earned-revenue + grant cycle).',
        href: '/about',
      },
    ],
  },
];

export const totalEntries = weeks.reduce((sum, w) => sum + w.entries.length, 0);
export const weekCount = weeks.length;

export const pillarColors: Record<Pillar, string> = {
  Build: 'text-volt-500',
  Teach: 'text-volt-500',
  Defend: 'text-volt-500',
  Infrastructure: 'text-steel-300',
};
