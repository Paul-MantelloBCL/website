#!/usr/bin/env python3
"""
render-badge.py — turn bcl-dns-check JSON into a BCL-branded SVG badge.

Usage:
    bcl-dns-check bluecollarlabs.org --json | render-badge.py > badge.svg
    render-badge.py < dns-posture.json > badge.svg

Reads JSON on stdin, writes SVG on stdout. No deps beyond the stdlib.

Color rules:
    ACCEPTABLE  → volt amber-orange (we own this; we score well)
    CONCERNING  → muted yellow
    CRITICAL    → red
"""
import json
import sys
from datetime import datetime

VOLT = "#ff9800"
STEEL_900 = "#0b0f17"
STEEL_300 = "#94a3b8"
WHITE = "#ffffff"

TIER_COLORS = {
    "ACCEPTABLE": VOLT,
    "CONCERNING": "#eab308",
    "CRITICAL": "#dc2626",
}


def render(payload: dict) -> str:
    domain = payload.get("domain", "?")
    score = payload.get("section_b_score", "?")
    max_score = payload.get("section_b_max", 16)
    tier = payload.get("tier", "UNKNOWN")
    checked_at = payload.get("checked_at", "")
    tier_color = TIER_COLORS.get(tier, STEEL_300)

    if checked_at:
        try:
            dt = datetime.strptime(checked_at, "%Y-%m-%dT%H:%M:%SZ")
            date_str = dt.strftime("%b %d, %Y")
        except ValueError:
            date_str = checked_at
    else:
        date_str = ""

    # Width: fixed at 360, height 88. Two-row layout.
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="360" height="88" viewBox="0 0 360 88" role="img" aria-label="DNS posture {score} of {max_score} {tier}">
  <title>BCL DNS posture audit — {domain}: {score}/{max_score} {tier}</title>
  <rect width="360" height="88" rx="8" fill="{STEEL_900}"/>
  <rect x="0" y="0" width="6" height="88" fill="{tier_color}"/>
  <g font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif">
    <text x="22" y="24" fill="{STEEL_300}" font-size="10" font-weight="700" letter-spacing="1.5">BCL DNS POSTURE AUDIT</text>
    <text x="22" y="52" fill="{WHITE}" font-size="22" font-weight="800">{score}/{max_score}</text>
    <text x="78" y="52" fill="{tier_color}" font-size="14" font-weight="700" letter-spacing="0.5">{tier}</text>
    <text x="22" y="72" fill="{STEEL_300}" font-size="10">{domain} · checked {date_str}</text>
  </g>
</svg>
"""


def main() -> int:
    raw = sys.stdin.read()
    if not raw.strip():
        print("render-badge.py: no JSON on stdin", file=sys.stderr)
        return 1
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"render-badge.py: invalid JSON: {e}", file=sys.stderr)
        return 1
    sys.stdout.write(render(payload))
    return 0


if __name__ == "__main__":
    sys.exit(main())
