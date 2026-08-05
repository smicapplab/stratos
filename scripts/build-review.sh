#!/usr/bin/env bash
set -e
echo "==> Running Stratos Production Build..."
cd "$(dirname "$0")/.."
npm run build
echo "✅ Build Review Completed Successfully."
