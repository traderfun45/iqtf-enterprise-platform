#!/data/data/com.termux/files/usr/bin/bash

cd "$HOME/iqtf-enterprise" || exit 1

LOG="$HOME/iqtf-enterprise/logs/health.log"

API_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  --max-time 5 \
  http://127.0.0.1:4100/health)

WEB_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  --max-time 5 \
  http://127.0.0.1:3100/)

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S %z')

if [ "$API_CODE" = "200" ] && [ "$WEB_CODE" = "200" ]; then
  echo "$TIMESTAMP HEALTHY API=$API_CODE WEB=$WEB_CODE" >> "$LOG"
  exit 0
else
  echo "$TIMESTAMP UNHEALTHY API=$API_CODE WEB=$WEB_CODE" >> "$LOG"
  exit 1
fi
