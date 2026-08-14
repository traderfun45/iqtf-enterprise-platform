#!/data/data/com.termux/files/usr/bin/bash

echo "================================"
echo " IQTF ENTERPRISE STATUS"
echo "================================"

echo
echo "[API PROCESS]"
ps -ef | grep 'node dist/index.js' | grep -v grep || echo "API PROCESS NOT FOUND"

echo
echo "[WEB PROCESS]"
ps -ef | grep 'next-server' | grep -v grep || echo "WEB PROCESS NOT FOUND"

echo
echo "[API HEALTH]"
curl -s -o /dev/null \
  -w "HTTP=%{http_code} TOTAL=%{time_total}s\n" \
  http://127.0.0.1:4100/health

echo
echo "[WEB HEALTH]"
curl -s -o /dev/null \
  -w "HTTP=%{http_code} TOTAL=%{time_total}s\n" \
  http://127.0.0.1:3100/

echo
echo "================================"
