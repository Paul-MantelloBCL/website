// /now — single broadcast surface for what BCL is focused on right now.
// Derek Sivers convention: https://nownownow.com — 4000+ sites use it.
//
// Update this file weekly. The page just renders what's here.

export type Pillar = 'Build' | 'Teach' | 'Defend' | 'Infrastructure';

export interface NowItem {
  pillar: Pillar;
  title: string;
  body: string;
}

export const lastUpdated = '2026-05-12';

export const headline =
  "Founding-25 cohort recruiting, public site getting harder to mis-read, audit pipeline accepting applications.";

export const focusNow: NowItem[] = [
  {
    pillar: 'Teach',
    title: 'Founding-25 cohort recruitment',
    body: 'Filling the first AI-Ready Tradesman cohort. Inbound from /school + /cohort-2026 + the Skool community. Goal: hit 25 paid seats before the cohort start date.',
  },
  {
    pillar: 'Defend',
    title: 'Free phishing audit pipeline live',
    body: 'Accepting applications through /audit-request. First ten Founding-shop slots are free. Each closed audit gets a published case-study debrief to power the lead engine.',
  },
  {
    pillar: 'Infrastructure',
    title: 'Site reads as a real 501(c)(3)',
    body: 'Iterating the public site so donors, press, and grant officers can verify everything in under sixty seconds — /trust, /donate, /commitments, /changelog, /faq, /press, /start-here all shipped this week.',
  },
];

export const onPause: NowItem[] = [
  {
    pillar: 'Build',
    title: 'BCL App MVP — coming-soon mode',
    body: 'Expo app in workspace/bcl-app with Supabase + /chat Edge Function live. Paused on shipping a public install link until first cohort feedback shapes the v1 surface.',
  },
  {
    pillar: 'Infrastructure',
    title: 'NVIDIA Inception reapplication',
    body: 'Denied April 2026 due to 501(c)(3) status. Path forward is NVIDIA AI for Social Good / Foundation — not Inception. No reapplication planned.',
  },
];

export const nextUp: NowItem[] = [
  {
    pillar: 'Teach',
    title: 'Cohort 1 launch',
    body: 'Once Founding-25 fills, transition from sales to instruction. Weekly live sessions plus async Skool drops.',
  },
  {
    pillar: 'Build',
    title: 'Truck Inventory v0.1',
    body: 'Pilot the inventory tool with the first cohort of shop owners willing to try it on real trucks. Direct feedback loop drives the v1 build.',
  },
  {
    pillar: 'Defend',
    title: 'First three published audit case studies',
    body: "Anonymized walk-throughs of the first three completed audits. Same playbook the Mac App Store reviews use — public proof drives the next ten applications.",
  },
];
