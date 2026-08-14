#!/data/data/com.termux/files/usr/bin/bash

API_URL="http://127.0.0.1:4100/health"
WEB_URL="http://127.0.0.1:3100/"

API_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  --max-time 5 "$API_URL")

WEB_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  --max-time 5 "$WEB_URL")

echo "================================"
echo " IQTF HEALTH CHECK"
echo " $(date)"
echo "================================"

if [ "$API_CODE" = "200" ]; then
  echo "API  : OK ($API_CODE)"
else
  echo "API  : FAIL ($API_CODE)"
fi

if [ "$WEB_CODE" = "200" ]; then
  echo "WEB  : OK ($WEB_CODE)"
else
  echo "WEB  : FAIL ($WEB_CODE)"
fi

if [ "$API_CODE" = "200" ] && [ "$WEB_CODE" = "200" ]; then
  echo "STATUS: HEALTHY"
  exit 0
else
  echo "STATUS: UNHEALTHY"
  exit 1
fi
