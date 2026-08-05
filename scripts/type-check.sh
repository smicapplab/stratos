#!/usr/bin/env bash
set -e
echo "==> Running Stratos TypeScript & Svelte Check..."
cd "$(dirname "$0")/.."
npm run check
echo "✅ Type Check Completed Successfully."
