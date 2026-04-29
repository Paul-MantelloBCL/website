#!/usr/bin/env bash
# netlify-hook.sh — refresh the DNS-posture badge for a domain.
#
# Runs bcl-dns-check, pipes JSON to render-badge.py, writes:
#   <out-dir>/dns-posture.svg
#   <out-dir>/dns-posture.json
#
# Designed to be safe to call as a Netlify prebuild step OR locally before
# a commit. If `dig` is missing (Netlify image variance), the script exits 0
# and leaves whatever badge is already on disk — the build keeps going.
#
# Usage:
#   netlify-hook.sh                                   # defaults to bluecollarlabs.org → website/public/
#   netlify-hook.sh <domain> <out-dir>                # explicit
#
# Exit:
#   0  badge written, OR fallback (dig missing / DNS lookup failed)
#   1  invocation error (bad args, render script broken)

set -uo pipefail

DOMAIN="${1:-bluecollarlabs.org}"
OUT_DIR="${2:-}"

HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

# Vendored copy: scripts live in website/scripts/, public is one level up.
# Source of truth lives at workspace/tools/bcl-dns-check/ — keep these in sync.
if [[ -z "$OUT_DIR" ]]; then
  OUT_DIR="$(cd -- "$HERE/../public" 2>/dev/null && pwd || true)"
fi

if [[ -z "$OUT_DIR" || ! -d "$OUT_DIR" ]]; then
  echo "netlify-hook.sh: out-dir not found: ${OUT_DIR:-(unset)}" >&2
  exit 1
fi

if ! command -v dig >/dev/null 2>&1; then
  echo "netlify-hook.sh: dig not in PATH — keeping existing badge"
  exit 0
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "netlify-hook.sh: python3 not in PATH — keeping existing badge"
  exit 0
fi

JSON_TMP="$(mktemp -t bcl-dns-XXXXXX.json)"
trap 'rm -f "$JSON_TMP"' EXIT

# bcl-dns-check returns 0/1/2 by tier — all are "successful" for our purposes.
"$HERE/bcl-dns-check" "$DOMAIN" --json > "$JSON_TMP"
DIG_EXIT=$?

if [[ ! -s "$JSON_TMP" ]]; then
  echo "netlify-hook.sh: bcl-dns-check produced no output (exit $DIG_EXIT) — keeping existing badge"
  exit 0
fi

if ! python3 "$HERE/render-badge.py" < "$JSON_TMP" > "$OUT_DIR/dns-posture.svg"; then
  echo "netlify-hook.sh: render-badge.py failed — leaving previous badge intact"
  rm -f "$OUT_DIR/dns-posture.svg.tmp" 2>/dev/null
  exit 1
fi

cp "$JSON_TMP" "$OUT_DIR/dns-posture.json"

SCORE=$(python3 -c "import json,sys;d=json.load(open('$JSON_TMP'));print(f\"{d['section_b_score']}/{d['section_b_max']} {d['tier']}\")")
echo "netlify-hook.sh: $DOMAIN → $SCORE → $OUT_DIR/dns-posture.svg"
exit 0
