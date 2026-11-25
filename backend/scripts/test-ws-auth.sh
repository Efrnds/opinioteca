#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

NICK="${1:-}"
SENHA="${2:-}"
if [[ -z "$NICK" || -z "$SENHA" ]]; then
  echo "Uso: bash scripts/test-ws-auth.sh <nick> <senha>"
  exit 1
fi

echo "=== SECRET .env ==="
grep '^SECRET_KEY=' .env || true

echo "=== strings no binary (authorized vs authorizad) ==="
strings ./opinioteca-api | grep -E 'authoriz' | sort -u || true

echo "=== login local ==="
RESP=$(curl -sS -X POST "http://127.0.0.1:4668/login" \
  -H "Content-Type: application/json" \
  --data-binary "{\"nick\":\"${NICK}\",\"senha\":\"${SENHA}\"}")
echo "$RESP" | head -c 500
echo

TOKEN=$(printf '%s' "$RESP" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("token") or "")')
if [[ -z "$TOKEN" ]]; then
  echo "FAIL: login nao devolveu token"
  exit 1
fi
echo "TOKEN_LEN=${#TOKEN}"

python3 -c 'import base64,json,sys; t=sys.argv[1].split(".")[1]; t+="="*((4-len(t)%4)%4); print("payload:", json.loads(base64.urlsafe_b64decode(t)))' "$TOKEN"

echo "=== WS local ==="
curl -si --http1.1 --max-time 5 \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Origin: https://opinioteca.prismapp.com.br" \
  "http://127.0.0.1:4668/ws?token=${TOKEN}" | head -20

echo "=== WS publico ==="
curl -si --http1.1 --max-time 5 \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Origin: https://opinioteca.prismapp.com.br" \
  "https://opinioteca.prismapp.com.br/ws?token=${TOKEN}" | head -20
