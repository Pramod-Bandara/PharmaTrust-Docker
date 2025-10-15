#!/bin/bash
set -eu

echo "🔍 Verifying package-lock.json files..."
echo ""

SERVICES=("auth" "blockchain" "iot" "medicine" "mobile-gateway")
MISSING=0
FOUND=0

for service in "${SERVICES[@]}"; do
  if [ -f "services/$service/package-lock.json" ]; then
    echo "✅ $service: lockfile exists"
    FOUND=$((FOUND + 1))
  else
    echo "❌ $service: lockfile MISSING"
    MISSING=$((MISSING + 1))
  fi
done

# Check web frontend
if [ -f "web/package-lock.json" ]; then
  echo "✅ web: lockfile exists"
  FOUND=$((FOUND + 1))
else
  echo "❌ web: lockfile MISSING"
  MISSING=$((MISSING + 1))
fi

# Check mobile app (if exists)
if [ -d "mobile" ]; then
  if [ -f "mobile/package-lock.json" ]; then
    echo "✅ mobile: lockfile exists"
    FOUND=$((FOUND + 1))
  else
    echo "❌ mobile: lockfile MISSING"
    MISSING=$((MISSING + 1))
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary: $FOUND found, $MISSING missing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $MISSING -gt 0 ]; then
  echo ""
  echo "⚠️  $MISSING lockfile(s) missing!"
  echo ""
  echo "To fix this issue, run:"
  echo "  ./scripts/generate-lockfiles.sh"
  echo ""
  echo "Or manually generate for each missing service:"
  echo "  cd services/<service-name>"
  echo "  npm install --package-lock-only"
  echo "  cd ../.."
  exit 1
else
  echo ""
  echo "✅ All lockfiles present! Ready to build."
  exit 0
fi
