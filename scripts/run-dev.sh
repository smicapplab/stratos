#!/usr/bin/env bash
set -e

# 1. Ensure .env exists & load variables
if [ ! -f .env ]; then
  if [ -f .env.sample ]; then
    echo "⚠️ .env file not found! Copying from .env.sample..."
    cp .env.sample .env
  else
    echo "⚠️ .env file not found! Creating default .env..."
    touch .env
  fi
fi

# Load variables from .env if present
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs) 2>/dev/null || true
fi

# Configurable Port and Host for EC2 Standalone Server
PORT="${PORT:-5180}"
HOST="${HOST:-0.0.0.0}"

echo "=========================================="
echo " Starting Stratos Dev Server on EC2"
echo " Host: ${HOST} | Port: ${PORT}"
echo "=========================================="

# 2. Check local Redis / Valkey connection
echo "🔍 Checking local Redis service..."
if command -v redis-cli &> /dev/null; then
  if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Local Redis is active and responding."
  else
    echo "⚠️ Warning: Local Redis (redis-cli ping) failed. Ensure redis-server is running locally on port 6379."
  fi
else
  echo "ℹ️ redis-cli not found in PATH; skipping ping check."
fi

# 3. Synchronize Database Schema with Supabase / Postgres
echo "🔄 Verifying Supabase Database Schema..."
npx drizzle-kit push

# 4. Launch SvelteKit Dev Server on custom port
echo "🚀 Launching SvelteKit Dev Server on ${HOST}:${PORT}..."
export PORT="${PORT}"
npx vite dev --host "${HOST}" --port "${PORT}"
