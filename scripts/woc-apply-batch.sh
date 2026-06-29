#!/usr/bin/env bash
# =====================================================================
# WoC port runner: dry-run validator → apply chosen batch → post-check.
# Stops on the first failing step. Requires psql + PG* env vars (or DATABASE_URL).
#
# Usage:
#   scripts/woc-apply-batch.sh 0          # batch 0
#   scripts/woc-apply-batch.sh 1          # batch 1
#   scripts/woc-apply-batch.sh 0 --dry    # dry-run only, no apply
# =====================================================================
set -euo pipefail

BATCH="${1:-}"
MODE="${2:-apply}"
DIR="$(cd "$(dirname "$0")/.." && pwd)/db/manual-migrations"

if [[ -z "$BATCH" ]]; then
  echo "usage: $0 <batch-number> [--dry]" >&2
  exit 2
fi

VALIDATOR="$DIR/20260624_woc_dryrun_validator.sql"
case "$BATCH" in
  0) APPLY="$DIR/20260624_woc_batch0_quickwins.sql"
     POST="$DIR/20260624_woc_batch0_postcheck.sql" ;;
  1) APPLY="$DIR/20260624_woc_batch1_foundation.sql"
     POST="$DIR/20260624_woc_batch1_postcheck.sql" ;;
  *) echo "unknown batch: $BATCH" >&2; exit 2 ;;
esac

if [[ -z "${PGHOST:-}" && -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: set PGHOST/PGUSER/PGDATABASE/PGPASSWORD or DATABASE_URL" >&2
  exit 3
fi

PSQL=(psql -v ON_ERROR_STOP=1 --single-transaction)
[[ -n "${DATABASE_URL:-}" ]] && PSQL+=("$DATABASE_URL")

echo "==> [1/3] dry-run validator: $VALIDATOR"
"${PSQL[@]}" -f "$VALIDATOR"

if [[ "$MODE" == "--dry" ]]; then
  echo "==> dry-run only; stopping."; exit 0
fi

if [[ ! -f "$APPLY" ]]; then
  echo "ERROR: missing apply file $APPLY" >&2; exit 4
fi

echo "==> [2/3] applying batch $BATCH: $APPLY"
"${PSQL[@]}" -f "$APPLY"

if [[ -f "$POST" ]]; then
  echo "==> [3/3] post-check: $POST"
  "${PSQL[@]}" -f "$POST"
else
  echo "==> [3/3] no post-check file for batch $BATCH (skipping)"
fi

echo "==> batch $BATCH complete."
