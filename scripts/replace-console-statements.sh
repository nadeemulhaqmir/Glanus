#!/bin/bash

# Batch replacementscript for console statements
# This script will replace console statements in all remaining files

echo "🔄 Batch replacing console statements..."

# Create backup directory
mkdir -p .console-replacement-backup

# Files that still need updates (based on grep results)
FILES=(
  "app/api/assets/bulk/assign/route.ts"
  "app/api/assets/bulk/delete/route.ts"
  "app/api/assets/export/route.ts"
  "app/api/ai/auto-categorize/route.ts"
  "app/api/remote/sessions/route.ts"
  "app/api/remote/sessions/[id]/route.ts"  
  "lib/generateQRCode.ts"
  "lib/webrtc/client.ts"
  "lib/websocket/server.ts"
  "app/assets/page.tsx"
  "app/assets/[id]/page.tsx"
  "app/assets/new/physical/page.tsx"
  "app/assets/new/digital/page.tsx"
  "app/dashboard/page.tsx"
  "app/remote/page.tsx"
  "app/remote/[id]/page.tsx"
  "components/remote/RemoteDesktopViewer.tsx"
  "components/remote/QuickConnectButton.tsx"
)

echo "Files to process: ${#FILES[@]}"

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  Processing: $file"
    cp "$file" ".console-replacement-backup/$(basename $file).backup"
  fi
done

echo ""
echo "✅ Backup complete in .console-replacement-backup/"
echo "Ready for manual import addition and console.error replacement"
