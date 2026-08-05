#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

POSTGRES_CONTAINER="stratos-postgres"
REDIS_CONTAINER="stratos-redis"

echo "========================================="
echo " Booting Stratos Local Environment..."
echo "========================================="

# Function to check and start a Docker container
start_container() {
  local name=$1
  local run_command=$2

  # Check if container is currently running
  if [ "$(docker ps -q -f name=^/${name}$)" ]; then
    echo "✅ [${name}] is already running."
  # Check if container exists but is stopped
  elif [ "$(docker ps -aq -f status=exited -f name=^/${name}$)" ]; then
    echo "🔄 [${name}] exists but is stopped. Starting it now..."
    docker start ${name}
  # Container doesn't exist, create and run it
  else
    echo "🚀 [${name}] not found. Creating and starting container..."
    eval "$run_command"
  fi
}

# 1. Start Postgres (Port 5432)
# Using standard postgres:15-alpine image.
start_container \
  "$POSTGRES_CONTAINER" \
  "docker run --name $POSTGRES_CONTAINER \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=password \
    -e POSTGRES_DB=stratos \
    -p 5432:5432 \
    -d postgres:15-alpine"

# 2. Start Redis (Port 6379)
# Using standard redis:7-alpine image.
start_container \
  "$REDIS_CONTAINER" \
  "docker run --name $REDIS_CONTAINER \
    -p 6379:6379 \
    -d redis:7-alpine"

echo "========================================="
echo "🎉 Environment is ready!"
echo "Postgres URL: postgresql://postgres:password@localhost:5432/stratos"
echo "Redis URL:    redis://localhost:6379"
echo "========================================="
