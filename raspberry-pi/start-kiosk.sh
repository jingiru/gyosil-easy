#!/usr/bin/env bash
set -euo pipefail

SERVER_URL="${GYOSIL_SERVER_URL:-http://192.168.0.50:3000}"
ROOM="${GYOSIL_ROOM:-classroom-1}"
KIOSK_URL="${SERVER_URL%/}/#/classroom?room=${ROOM}"

if command -v chromium >/dev/null 2>&1; then
  CHROMIUM="$(command -v chromium)"
elif command -v chromium-browser >/dev/null 2>&1; then
  CHROMIUM="$(command -v chromium-browser)"
else
  echo "Chromium을 찾지 못했습니다. sudo apt install chromium 으로 설치해 주세요." >&2
  exit 1
fi

while ! curl --silent --fail --max-time 3 "${SERVER_URL%/}/api/health" >/dev/null; do
  echo "교실이지 서버를 기다리는 중: ${SERVER_URL}"
  sleep 3
done

exec "$CHROMIUM" \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --check-for-update-interval=31536000 \
  --overscroll-history-navigation=0 \
  "$KIOSK_URL"
