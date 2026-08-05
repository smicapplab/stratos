#!/bin/bash

# Stratos Security & Leak Detection Audit
# Enforces rules defined in .agents/AGENTS.md

echo "Running Security Audit..."
EXIT_CODE=0

# 1. Secret Isolation Check
echo "Checking for raw process.env usage..."
if grep -rn "process.env" src/lib src/routes | grep -v "setup-triggers.ts" | grep -v "seed.ts"; then
  echo "❌ ERROR: process.env found! All environment variables must parse strictly via SvelteKit's \$env/dynamic/private or \$env/static/private modules."
  EXIT_CODE=1
else
  echo "✅ Secret Isolation Check passed"
fi

# 2. Hardcoded Tokens Check
echo "Checking for potential hardcoded tokens or secrets..."
# Look for common token patterns, excluding standard imports/exports
if grep -rnEi "(Bearer\s+[a-zA-Z0-9_\-\.]{30,}|api_key\s*=\s*['\"][a-zA-Z0-9_\-\.]{15,}['\"]|secret\s*=\s*['\"][a-zA-Z0-9_\-\.]{15,}['\"])" src/lib src/routes; then
  echo "❌ ERROR: Potential hardcoded secret or token found."
  EXIT_CODE=1
else
  echo "✅ Hardcoded Tokens Check passed"
fi

# 3. Group Data Leak Detection (Basic Heuristic)
echo "Checking for unscoped database operations..."
# Any service file performing db operations should ideally check for 'groupId' or belong to a whitelist (like auth/lucia.ts).
for file in $(find src/lib/server/services src/routes -type f -name "*.ts" 2>/dev/null); do
  if grep -qE "db\.(select|update|delete|insert)" "$file"; then
    # If the file uses DB, it should reference groupId, unless it's a specific auth file 
    if ! grep -q "groupId" "$file" && ! grep -q "public" "$file"; then
      # We just warn because some global system queries might legitimately not need groupId
      echo "⚠️ WARNING: $file performs database operations but does not reference 'groupId'. Verify that queries are explicitly scoped to avoid data leaks."
    fi
  fi
done
echo "✅ Group Data Scope Check completed"

if [ $EXIT_CODE -eq 1 ]; then
  echo "❌ Security Audit Failed!"
  exit $EXIT_CODE
fi

echo "🎉 Security Audit completed successfully."
exit 0
