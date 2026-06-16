#!/bin/bash

echo "[ShareLink Cleaner] Starting periodic share link cleanup service..."

CLEAN_INTERVAL=${SHARE_LINK_CLEAN_INTERVAL:-3600}

while true; do
    echo "[ShareLink Cleaner] [$(date '+%Y-%m-%d %H:%M:%S')] Running cleanup..."
    cd /var/www/html && php think clean:share-links
    echo "[ShareLink Cleaner] [$(date '+%Y-%m-%d %H:%M:%S')] Sleeping for ${CLEAN_INTERVAL} seconds..."
    sleep $CLEAN_INTERVAL
done
