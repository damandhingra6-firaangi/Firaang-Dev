#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_ROOT"

# Directories need execute bit for Node.js to traverse; files need read bit.
if [ -d ".next" ]; then
  find .next -type d -exec chmod 755 {} \;
  find .next -type f -exec chmod 644 {} \;
fi

if [ -d "public" ]; then
  find public -type d -exec chmod 755 {} \;
  find public -type f -exec chmod 644 {} \;
fi

chmod 755 server.js || true
chmod 755 app.js || true

echo "Permissions normalized for .next, public, server.js, and app.js"
