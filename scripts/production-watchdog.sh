#!/data/data/com.termux/files/usr/bin/bash

BASE="$HOME/iqtf-enterprise"
LOG="$BASE/logs"
HEALTH_LOG="$LOG/health.log"
LOCK="$LOG/watchdog.lock"

mkdir -p "$LOG"

# Prevent overlapping watchdog instances
if [ -f "$LOCK" ]; then
  OLD_PID=$(cat "$LOCK" 2>/dev/null || true)

  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "WATCHDOG ALREADY RUNNING PID=$OLD_PID"
    exit 0
  fi
fi

echo "$$" > "$LOCK"

cleanup() {
  rm -f "$LOCK"
}

trap cleanup EXIT

API_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  --max-time 5 \
  http://127.0.0.1:4100/health)

WEB_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  --max-time 5 \
  http://127.0.0.1:3100/)

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S %z')

if [ "$API_CODE" = "200" ] && [ "$WEB_CODE" = "200" ]; then
  echo "$TIMESTAMP WATCHDOG HEALTHY API=$API_CODE WEB=$WEB_CODE" >> "$HEALTH_LOG"
  exit 0
fi

echo "$TIMESTAMP WATCHDOG UNHEALTHY API=$API_CODE WEB=$WEB_CODE" >> "$HEALTH_LOG"

echo "WATCHDOG: attempting production restart"

"$BASE/scripts/restart-production.sh" \
  >> "$LOG/restart.log" 2>&1

RESULT=$?

if [ "$RESULT" = "0" ]; then
  echo "$TIMESTAMP WATCHDOG RECOVERY_SUCCESS" >> "$HEALTH_LOG"
else
  echo "$TIMESTAMP WATCHDOG RECOVERY_FAILED" >> "$HEALTH_LOG"
fi

exit "$RESULT"
