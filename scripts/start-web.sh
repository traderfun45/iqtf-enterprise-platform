#!/data/data/com.termux/files/usr/bin/bash

cd "$HOME/iqtf-dashboard" || exit 1

export PORT=3100

exec npm start
