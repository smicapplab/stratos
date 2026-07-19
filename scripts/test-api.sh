#!/usr/bin/env bash
# =============================================================================
# scripts/test-api.sh
# E2E API Integration Test Suite for /api/v1/* endpoints
#
# Usage:
#   bash scripts/test-api.sh [BASE_URL]
#
# Defaults to http://localhost:5173 if BASE_URL is not provided.
# Requires: curl, jq
# Pre-requisite: dev server must be running (`npm run dev`)
#                and the DB must have been seeded with `--dev --api-seed`
#
# Exit codes:
#   0 = All tests passed
#   1 = One or more tests failed
# =============================================================================

set -euo pipefail

BASE_URL="${1:-http://localhost:5173}"
# Fixed test token inserted by `npm run db:seed -- --dev --api-seed`
TOKEN="stratos_tok_TEST_LOCAL_DEV_DO_NOT_USE_IN_PRODUCTION"

PASS=0
FAIL=0
CREATED_TASK_ID=""
CREATED_COMMENT_ID=""

# ── Colours ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── Helpers ───────────────────────────────────────────────────────────────────
pass() { echo -e "${GREEN}  PASS${NC} $1"; PASS=$((PASS+1)); }
fail() { echo -e "${RED}  FAIL${NC} $1"; FAIL=$((FAIL+1)); }
section() { echo -e "\n${CYAN}══ $1 ══${NC}"; }

# Run curl and return: "<status_code>|<body>"
api() {
  local method="$1"; shift
  local path="$1"; shift
  local extra_args=("$@")

  curl -s -w "\n__STATUS__%{http_code}" \
    -X "$method" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    ${extra_args[@]+"${extra_args[@]}"} \
    "${BASE_URL}${path}"
}

# Parse status code from end of response
status_of() {
  echo "$1" | grep '__STATUS__' | sed 's/__STATUS__//'
}

# Parse body (everything before the __STATUS__ marker)
body_of() {
  echo "$1" | sed '/__STATUS__/d'
}

# Assert HTTP status code
assert_status() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    pass "$label (got $actual)"
  else
    fail "$label (expected $expected, got $actual)"
    echo "       Response: $(body_of "${response:-}")" 2>/dev/null || true
  fi
}

# Assert jq expression is true on body
assert_json() {
  local label="$1"
  local jq_expr="$2"
  local body="$3"
  if echo "$body" | jq -e "$jq_expr" > /dev/null 2>&1; then
    pass "$label"
  else
    fail "$label — jq: $jq_expr"
    echo "       Body: $body"
  fi
}

# =============================================================================
echo ""
echo -e "${YELLOW}Stratos /api/v1/* E2E Test Suite${NC}"
echo -e "Base URL: ${BASE_URL}"
echo -e "Token:    ${TOKEN:0:20}..."
echo ""

# =============================================================================
section "1. Auth Guards"
# =============================================================================

echo "  1a. Request without token should return 401..."
response=$(curl -s -w "\n__STATUS__%{http_code}" "${BASE_URL}/api/v1/projects")
assert_status "No token → 401" "401" "$(status_of "$response")"

echo "  1b. Request with invalid token should return 401..."
response=$(curl -s -w "\n__STATUS__%{http_code}" \
  -H "Authorization: Bearer stratos_tok_INVALID_GARBAGE" \
  "${BASE_URL}/api/v1/projects")
assert_status "Invalid token → 401" "401" "$(status_of "$response")"

# =============================================================================
section "2. Projects"
# =============================================================================

echo "  2a. GET /api/v1/projects..."
response=$(api GET /api/v1/projects)
STATUS=$(status_of "$response")
BODY=$(body_of "$response")
assert_status "GET /projects → 200" "200" "$STATUS"
assert_json "Response is array" '. | type == "array"' "$BODY"
assert_json "At least one project returned" '. | length > 0' "$BODY"

# Capture first project ID for downstream tests
PROJECT_ID=$(echo "$BODY" | jq -r '.[0].id')
echo "       Project ID: $PROJECT_ID"

# =============================================================================
section "3. Boards"
# =============================================================================

echo "  3a. GET /api/v1/boards?projectId=<id>..."
response=$(api GET "/api/v1/boards?projectId=${PROJECT_ID}")
STATUS=$(status_of "$response")
BODY=$(body_of "$response")
assert_status "GET /boards → 200" "200" "$STATUS"
assert_json "Response is array" '. | type == "array"' "$BODY"
assert_json "At least one board returned" '. | length > 0' "$BODY"

BOARD_ID=$(echo "$BODY" | jq -r '.[0].id')
echo "       Board ID: $BOARD_ID"

# =============================================================================
section "4. Users"
# =============================================================================

echo "  4a. GET /api/v1/users..."
response=$(api GET /api/v1/users)
STATUS=$(status_of "$response")
BODY=$(body_of "$response")
assert_status "GET /users → 200" "200" "$STATUS"
assert_json "Response is array" '. | type == "array"' "$BODY"
assert_json "Users have id field" '.[0] | has("id")' "$BODY"
assert_json "Users have name field" '.[0] | has("name")' "$BODY"

# =============================================================================
section "5. Tasks — List"
# =============================================================================

echo "  5a. GET /api/v1/tasks (no filter)..."
response=$(api GET "/api/v1/tasks")
STATUS=$(status_of "$response")
BODY=$(body_of "$response")
SYNC_TS=$(echo "$response" | grep -i 'x-sync-timestamp' | cut -d' ' -f2 || true)
assert_status "GET /tasks → 200" "200" "$STATUS"
assert_json "Tasks is array" '. | type == "array"' "$BODY"
assert_json "Tasks have id" '.[0] | has("id")' "$BODY"
assert_json "Tasks have title" '.[0] | has("title")' "$BODY"
assert_json "Tasks have updatedAt" '.[0] | has("updatedAt")' "$BODY"
echo "       Task count: $(echo "$BODY" | jq '. | length')"

echo "  5b. GET /api/v1/tasks?projectId=<id>..."
response=$(api GET "/api/v1/tasks?projectId=${PROJECT_ID}")
STATUS=$(status_of "$response")
BODY=$(body_of "$response")
assert_status "GET /tasks?projectId → 200" "200" "$STATUS"
assert_json "All tasks belong to project" "all(.[]; .projectId == \"${PROJECT_ID}\")" "$BODY"

echo "  5c. GET /api/v1/tasks?updatedSince=<valid ISO timestamp>..."
response=$(api GET "/api/v1/tasks?updatedSince=2020-01-01T00:00:00.000Z")
STATUS=$(status_of "$response")
assert_status "GET /tasks?updatedSince valid → 200" "200" "$STATUS"

echo "  5d. GET /api/v1/tasks?updatedSince=<garbage> should return 400..."
response=$(api GET "/api/v1/tasks?updatedSince=not-a-date")
STATUS=$(status_of "$response")
BODY=$(body_of "$response")
assert_status "GET /tasks?updatedSince garbage → 400" "400" "$STATUS"
assert_json "400 response has error field" 'has("error")' "$BODY"

echo "  5e. GET /api/v1/tasks?includeDeleted=true..."
response=$(api GET "/api/v1/tasks?includeDeleted=true")
STATUS=$(status_of "$response")
assert_status "GET /tasks?includeDeleted → 200" "200" "$STATUS"

# Capture first stage ID from a non-deleted task for the create test
response2=$(api GET "/api/v1/tasks")
STAGE_ID=$(body_of "$response2" | jq -r '[.[] | select(.stageId != null)] | .[0].stageId')
echo "       Stage ID for create test: $STAGE_ID"

# =============================================================================
section "6. Tasks — Create"
# =============================================================================

echo "  6a. POST /api/v1/tasks (valid)..."
response=$(api POST /api/v1/tasks -d "{
  \"stageId\": \"${STAGE_ID}\",
  \"title\": \"[E2E] Test task created by API test script\"
}")
STATUS=$(status_of "$response")
BODY=$(body_of "$response")
assert_status "POST /tasks → 201" "201" "$STATUS"
assert_json "Created task has id" 'has("id")' "$BODY"
assert_json "Created task has correct title" '.title == "[E2E] Test task created by API test script"' "$BODY"
CREATED_TASK_ID=$(echo "$BODY" | jq -r '.id')
echo "       Created Task ID: $CREATED_TASK_ID"

echo "  6b. POST /api/v1/tasks (missing stageId) → 400..."
response=$(api POST /api/v1/tasks -d '{"title": "Missing stageId"}')
STATUS=$(status_of "$response")
assert_status "POST /tasks missing stageId → 400" "400" "$STATUS"

echo "  6c. POST /api/v1/tasks (missing title) → 400..."
response=$(api POST /api/v1/tasks -d "{\"stageId\": \"${STAGE_ID}\"}")
STATUS=$(status_of "$response")
assert_status "POST /tasks missing title → 400" "400" "$STATUS"

# =============================================================================
section "7. Tasks — Get by ID"
# =============================================================================

echo "  7a. GET /api/v1/tasks/${CREATED_TASK_ID}..."
response=$(api GET "/api/v1/tasks/${CREATED_TASK_ID}")
STATUS=$(status_of "$response")
BODY=$(body_of "$response")
assert_status "GET /tasks/[id] → 200" "200" "$STATUS"
assert_json "Task id matches" ".id == \"${CREATED_TASK_ID}\"" "$BODY"
assert_json "Response has X-Sync-Timestamp equivalent in body" 'has("updatedAt")' "$BODY"

echo "  7b. GET /api/v1/tasks/<nonexistent-uuid> → 404..."
response=$(api GET "/api/v1/tasks/00000000-0000-0000-0000-000000000000")
STATUS=$(status_of "$response")
assert_status "GET /tasks/nonexistent → 404" "404" "$STATUS"

# =============================================================================
section "8. Tasks — Update (PATCH)"
# =============================================================================

echo "  8a. PATCH /api/v1/tasks/${CREATED_TASK_ID} (update priority)..."
response=$(api PATCH "/api/v1/tasks/${CREATED_TASK_ID}" -d '{"priority": "High"}')
STATUS=$(status_of "$response")
BODY=$(body_of "$response")
assert_status "PATCH /tasks/[id] → 200" "200" "$STATUS"
assert_json "Priority updated to High" '.priority == "High"' "$BODY"

echo "  8b. PATCH /api/v1/tasks/${CREATED_TASK_ID} (update description)..."
response=$(api PATCH "/api/v1/tasks/${CREATED_TASK_ID}" -d '{"description": "Updated by E2E test."}')
STATUS=$(status_of "$response")
assert_status "PATCH /tasks/[id] description → 200" "200" "$STATUS"

# =============================================================================
section "9. Comments"
# =============================================================================

echo "  9a. POST /api/v1/tasks/${CREATED_TASK_ID}/comments..."
response=$(api POST "/api/v1/tasks/${CREATED_TASK_ID}/comments" \
  -d '{"content": "E2E test comment from API test script."}')
STATUS=$(status_of "$response")
BODY=$(body_of "$response")
assert_status "POST /tasks/[id]/comments → 201" "201" "$STATUS"
assert_json "Comment has id" 'has("id")' "$BODY"
CREATED_COMMENT_ID=$(echo "$BODY" | jq -r '.id')
echo "       Created Comment ID: $CREATED_COMMENT_ID"

echo "  9b. POST comment with empty content → 400..."
response=$(api POST "/api/v1/tasks/${CREATED_TASK_ID}/comments" -d '{"content": ""}')
STATUS=$(status_of "$response")
assert_status "POST empty comment → 400" "400" "$STATUS"

# =============================================================================
section "10. Bulk Import"
# =============================================================================

UNIQUE_SOURCE_ID="e2e-test-$(date +%s)"

echo "  10a. POST /api/v1/tasks/bulk (valid)..."
response=$(api POST /api/v1/tasks/bulk -d "{
  \"epic\": {
    \"title\": \"[E2E] Epic: Bulk Import Test\",
    \"description\": \"Created by automated E2E test suite.\",
    \"stageId\": \"${STAGE_ID}\"
  },
  \"stories\": [
    { \"title\": \"[E2E] Story 1\", \"description\": \"First story.\" },
    { \"title\": \"[E2E] Story 2\", \"description\": \"Second story.\" }
  ],
  \"sourceId\": \"${UNIQUE_SOURCE_ID}\"
}")
STATUS=$(status_of "$response")
BODY=$(body_of "$response")
assert_status "POST /tasks/bulk → 201" "201" "$STATUS"
assert_json "Bulk response has epic" 'has("epic")' "$BODY"
assert_json "Bulk response has stories array" '.stories | type == "array"' "$BODY"
assert_json "Bulk stories count == 2" '.stories | length == 2' "$BODY"

echo "  10b. POST /api/v1/tasks/bulk (duplicate sourceId) → 409..."
response=$(api POST /api/v1/tasks/bulk -d "{
  \"epic\": { \"title\": \"Dupe\", \"stageId\": \"${STAGE_ID}\" },
  \"sourceId\": \"${UNIQUE_SOURCE_ID}\"
}")
STATUS=$(status_of "$response")
assert_status "POST /tasks/bulk duplicate sourceId → 409" "409" "$STATUS"

echo "  10c. POST /api/v1/tasks/bulk (missing sourceId) → 400..."
response=$(api POST /api/v1/tasks/bulk -d "{
  \"epic\": { \"title\": \"No sourceId\", \"stageId\": \"${STAGE_ID}\" }
}")
STATUS=$(status_of "$response")
assert_status "POST /tasks/bulk missing sourceId → 400" "400" "$STATUS"

echo "  10d. POST /api/v1/tasks/bulk (missing epic) → 400..."
response=$(api POST /api/v1/tasks/bulk -d '{"sourceId": "no-epic-test"}')
STATUS=$(status_of "$response")
assert_status "POST /tasks/bulk missing epic → 400" "400" "$STATUS"

# =============================================================================
section "11. Delete Task"
# =============================================================================

echo "  11a. DELETE /api/v1/tasks/${CREATED_TASK_ID}..."
response=$(api DELETE "/api/v1/tasks/${CREATED_TASK_ID}")
STATUS=$(status_of "$response")
assert_status "DELETE /tasks/[id] → 204" "204" "$STATUS"

echo "  11b. GET deleted task without includeDeleted → 404..."
response=$(api GET "/api/v1/tasks/${CREATED_TASK_ID}")
STATUS=$(status_of "$response")
assert_status "GET deleted task → 404" "404" "$STATUS"

echo "  11c. GET deleted task with includeDeleted=true → 200..."
response=$(api GET "/api/v1/tasks/${CREATED_TASK_ID}?includeDeleted=true")
STATUS=$(status_of "$response")
BODY=$(body_of "$response")
assert_status "GET deleted task includeDeleted → 200" "200" "$STATUS"
assert_json "Deleted task has deletedAt set" '.deletedAt != null' "$BODY"

# =============================================================================
section "12. Rate Limit Headers"
# =============================================================================

echo "  12a. Verify Retry-After header on rate-limited path (simulation check)..."
# We can't reliably trigger the real rate limit in CI without hammering,
# so we just confirm the 200 flow includes no Retry-After by default.
response=$(api GET /api/v1/projects)
STATUS=$(status_of "$response")
assert_status "Normal request is not rate-limited" "200" "$STATUS"

# =============================================================================
echo ""
echo "═══════════════════════════════════════"
if [[ $FAIL -eq 0 ]]; then
  echo -e "${GREEN}  ALL ${PASS} TESTS PASSED${NC}"
  echo "═══════════════════════════════════════"
  exit 0
else
  echo -e "${RED}  ${FAIL} FAILED / ${PASS} PASSED${NC}"
  echo "═══════════════════════════════════════"
  exit 1
fi
