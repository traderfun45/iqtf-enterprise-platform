#!/data/data/com.termux/files/usr/bin/bash

IMG="$HOME/storage/shared/Download/cme/vol2vol2.jpg"
OUT="$HOME/iqtf-enterprise/cme_fast"

mkdir -p "$OUT"

echo "=== CME FAST OCR ==="
echo "Image: $IMG"
echo

# 1) grayscale + contrast
magick "$IMG" \
  -colorspace Gray \
  -contrast-stretch 2%x2% \
  "$OUT/gray.png"

# 2) threshold
magick "$OUT/gray.png" \
  -threshold 55% \
  "$OUT/thresh.png"

echo "=== TESSERACT GRAY ==="
time tesseract "$OUT/gray.png" stdout \
  --psm 11 \
  -c tessedit_char_whitelist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-' \
  2>/dev/null

echo
echo "=== TESSERACT THRESHOLD ==="
time tesseract "$OUT/thresh.png" stdout \
  --psm 11 \
  -c tessedit_char_whitelist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-' \
  2>/dev/null
