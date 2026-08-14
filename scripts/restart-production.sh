#!/data/data/com.termux/files/usr/bin/bash

set -u

BASE="$HOME/iqtf-enterprise"
LOG="$BASE/logs"

API_PID_FILE="$LOG/api.pid"
WEB_PID_FILE="$LOG/web.pid"

echo "================================"
echo " IQTF PRODUCTION RESTART"
echo "================================"

stop_pid() {
  local name="$1"
  local pid="$2"

  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    echo "Stopping $name PID=$pid"
    kill "$pid"
  fi
}

API_PID=$(ps -ef | awk '/node dist\/index.js/ && !/awk/ {print $2; exit}')
WEB_PID=$(ps -ef | awk '/next-server/ && !/awk/ {print $2; exit}')

stop_pid "API" "${API_PID:-}"
stop_pid "WEB" "${WEB_PID:-}"

sleep 2

echo
echo "Starting API..."

cd "$HOME/iqtf-enterprise" || exit 1

PORT=4100 API_PORT=4100 \
nohup npm run api:start:prod \
> "$LOG/api.log" 2>&1 &

API_LAUNCH_PID=$!
echo "$API_LAUNCH_PID" > "$API_PID_FILE"

echo "API launcher PID=$API_LAUNCH_PID"

echo
echo "Waiting for API..."

for i in 1 2 3 4 5 6 7 8 9 10
do
  API_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 2 \
    http://127.0.0.1:4100/health)

  if [ "$API_CODE" = "200" ]; then
    echo "API READY HTTP=200"
    break
  fi

  sleep 1
done

echo
echo "Starting WEB..."

cd "$HOME/iqtf-dashboard" || exit 1

PORT=3100 \
nohup npm start \
> "$LOG/web.log" 2>&1 &

WEB_LAUNCH_PID=$!
echo "$WEB_LAUNCH_PID" > "$WEB_PID_FILE"

echo "WEB launcher PID=$WEB_LAUNCH_PID"

echo
echo "Waiting for WEB..."

for i in 1 2 3 4 5 6 7 8 9 10
do
  WEB_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 2 \
    http://127.0.0.1:3100/

  )

  if [ "$WEB_CODE" = "200" ]; then
    echo "WEB READY HTTP=200"
    break
  fi

  sleep 1
done

echo
echo "===== FINAL HEALTH ====="

"$BASE/scripts/health-check.sh"

RESULT=$?

echo
echo "================================"

if [ "$RESULT" = "0" ]; then
  echo " PRODUCTION RESTART SUCCESS"
else
  echo " PRODUCTION RESTART FAILED"
fi

echo "================================"

exit "$RESULT"
