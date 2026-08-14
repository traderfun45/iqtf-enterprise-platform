#!/data/data/com.termux/files/usr/bin/bash

cd "$HOME/iqtf-enterprise" || exit 1

export PORT=4100
export API_PORT=4100

exec npm run api:start:prod
