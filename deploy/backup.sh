#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.production}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${1:-$ROOT/backups/reliveit-$STAMP}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

mkdir -p "$OUT"
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$ROOT/docker-compose.prod.yml")

"${COMPOSE[@]}" exec -T postgres pg_dump -U reliveit reliveit >"$OUT/postgres.sql"
"${COMPOSE[@]}" exec -T backend tar -C /data -cf - uploads >"$OUT/uploads.tar"

echo "Wrote $OUT"
