#!/usr/bin/env bash
# Loads the Supabase stand-in and every migration, in order, into a database.
# Usage: supabase/tests/load_schema.sh <database>   (uses the usual PG* env vars)
set -euo pipefail
db="$1"
dir="$(cd "$(dirname "$0")/.." && pwd)"
args=(-v ON_ERROR_STOP=1 -q -d "$db" -f "$dir/tests/stub_supabase.sql")
for f in "$dir"/migrations/*.sql; do args+=(-f "$f"); done
psql "${args[@]}"
