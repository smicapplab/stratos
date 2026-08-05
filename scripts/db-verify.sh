#!/usr/bin/env bash
set -e
echo "==> Verifying Stratos Drizzle Migrations & Schema..."
cd "$(dirname "$0")/.."
npx drizzle-kit check
echo "✅ Database Verification Completed."
