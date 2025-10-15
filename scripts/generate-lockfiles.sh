#!/bin/bash
set -e

echo "📦 Generating missing package-lock.json files..."
echo ""

SERVICES=("auth" "blockchain" "iot" "medicine" "mobile-gateway")
GENERATED=0
SKIPPED=0

# Function to generate lockfile for a directory
generate_lockfile() {
  local dir=$1
  local name=$2

  if [ ! -f "$dir/package-lock.json" ]; then
    echo "🔨 Generating lockfile for $name..."
    cd "$dir"

    # Check if package.json exists
    if [ ! -f "package.json" ]; then
      echo "   ⚠️  Warning: package.json not found in $dir"
      cd - > /dev/null
      return 1
    fi

    # Generate lockfile only (don't install node_modules)
    if ! npm ci --package-lock-only; then
      echo "   ❌ Error: npm ci --package-lock-only failed in $dir"
      cd - > /dev/null
      return 1
    fi

    if [ -f "package-lock.json" ]; then
      echo "   ✅ Lockfile created successfully"
      GENERATED=$((GENERATED + 1))
    else
      echo "   ❌ Failed to create lockfile"
    fi

    cd - > /dev/null
  else
    echo "⏭️  Skipping $name (lockfile already exists)"
    SKIPPED=$((SKIPPED + 1))
  fi
}

# Generate lockfiles for services
for service in "${SERVICES[@]}"; do
  generate_lockfile "services/$service" "$service"
done

# Generate lockfile for web frontend
generate_lockfile "web" "web"

# Generate lockfile for mobile app (if exists)
if [ -d "mobile" ]; then
  generate_lockfile "mobile" "mobile"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary: $GENERATED generated, $SKIPPED skipped"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $GENERATED -gt 0 ]; then
  echo ""
  echo "✅ Lockfiles generated successfully!"
  echo ""
  echo "Next steps:"
  echo "  1. Commit the new lockfiles: git add */package-lock.json"
  echo "  2. Build Docker images: docker compose build"
  echo "  3. Start services: docker compose up -d"
else
  echo ""
  echo "ℹ️  No lockfiles needed to be generated."
fi

exit 0
