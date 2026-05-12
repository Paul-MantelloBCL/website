// Year-1 commitments. Source of truth for the public progress meters on
// /commitments. Numbers update here when reality changes — the page reads
// directly so no template edits are needed to bump a count.
//
// Goal accuracy beats optimistic projection. If a number isn't real yet, it
// stays at zero. "current === target" only when the milestone is fully shipped.

export type Pillar = 'Build' | 'Teach' | 'Defend' | 'Infrastructure';

export interface Commitment {
  pillar: Pillar;
  title: string;
  target: number;
  current: number;
  unit: string;
  summary: string;
  // Optional supporting note that appears under the progress bar. Use for
  // explaining what the count actually measures, named partner status, etc.
  note?: string;
}

export const commitments: Commitment[] = [
  {
    pillar: 'Build',
    title: 'Contractors using BUILD tools',
    target: 50,
    current: 0,
    unit: 'contractors',
    summary: 'Working tradespeople actively using a BCL-built tool — truck inventory, jobsite assistant, prompt packs — in production on a job, not just trialing.',
    note: 'Counter goes live with the Founding-25 cohort + BCL App rollout.',
  },
  {
    pillar: 'Teach',
    title: 'Tradespeople certified in applied AI',
    target: 100,
    current: 0,
    unit: 'certified',
    summary: 'Apprentices and journeymen who finish the four-week cohort and pass the applied-AI certification. Verifiable per cert through the public /verify lookup.',
    note: 'First Founding-25 cohort seats the first 25; subsequent cohorts close the rest of the 100.',
  },
  {
    pillar: 'Defend',
    title: 'Shops hardened via DEFEND audits',
    target: 10,
    current: 0,
    unit: 'shops',
    summary: 'Free, consent-based phishing audits for working trade shops. Each finished audit becomes an anonymized case study — same five-control rubric we run on ourselves.',
    note: 'Live counter mirrored on the audit-progress page. Owner controls the narrative on every published case study.',
  },
  {
    pillar: 'Infrastructure',
    title: 'First earned-revenue + grant cycle complete',
    target: 1,
    current: 0,
    unit: 'milestone',
    summary: 'IRS-approved 501(c)(3) (EIN 42-1853577) reporting both an earned-revenue milestone and a first-cycle grant reporting close. The mixed-funding model in operation, not on paper.',
    note: 'OpenAI, Anthropic, and Goodstack nonprofit programs approved May 2026; first earned revenue follows the cohort launch.',
  },
];

export const totalTargets = commitments.reduce((sum, c) => sum + c.target, 0);
export const totalCurrent = commitments.reduce((sum, c) => sum + c.current, 0);

export function percent(c: Commitment): number {
  if (c.target === 0) return 0;
  return Math.min(100, Math.round((c.current / c.target) * 100));
}
