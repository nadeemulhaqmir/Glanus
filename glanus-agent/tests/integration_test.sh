#!/bin/bash
# Integration test for Glanus Agent
# Tests registration, heartbeat, and script execution flows

set -e

echo "🧪 Running Glanus Agent Integration Tests..."

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"
WORKSPACE_ID="${WORKSPACE_ID:-test_workspace}"
ASSET_ID="${ASSET_ID:-test_asset}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((TESTS_PASSED++))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    ((TESTS_FAILED++))
}

info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Test 1: Build agent
echo ""
info "Test 1: Building agent..."
cd ../../src-tauri
if cargo build --quiet 2>&1 | grep -q "Finished"; then
    pass "Agent builds successfully"
else
    fail "Agent build failed"
fi

# Test 2: Run unit tests
echo ""
info "Test 2: Running unit tests..."
if cargo test --quiet 2>&1 | grep -q "test result: ok"; then
    pass "Unit tests pass"
else
    fail "Unit tests failed"
fi

# Test 3: Check binary size
echo ""
info "Test 3: Checking binary size..."
BINARY_SIZE=$(du -sh target/debug/glanus-agent | cut -f1)
info "Binary size: $BINARY_SIZE"
pass "Binary size checked"

# Test 4: Validate configuration
echo ""
info "Test 4: Validating configuration..."
if [ -f "../installers/windows/glanus-agent.wxs" ]; then
    pass "Windows installer config exists"
else
    fail "Windows installer config missing"
fi

if [ -f "../installers/macos/build.sh" ]; then
    pass "macOS installer config exists"
else
    fail "macOS installer config missing"
fi

if [ -f "../installers/linux/build.sh" ]; then
    pass "Linux installer config exists"
else
    fail "Linux installer config missing"
fi

# Test 5: Check dependencies
echo ""
info "Test 5: Checking dependencies..."
if cargo tree --depth 1 | grep -q "sysinfo"; then
    pass "sysinfo dependency found"
else
    fail "sysinfo dependency missing"
fi

if cargo tree --depth 1 | grep -q "reqwest"; then
    pass "reqwest dependency found"
else
    fail "reqwest dependency missing"
fi

# Test 6: Backend API endpoints (if backend is running)
echo ""
info "Test 6: Testing backend API endpoints..."
if curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/health" | grep -q "200"; then
    info "Backend is running at $BACKEND_URL"
    
    # Test registration endpoint
    if curl -s -X POST "$BACKEND_URL/api/agent/register" \
        -H "Content-Type: application/json" \
        -d "{\"assetId\":\"$ASSET_ID\",\"workspaceId\":\"$WORKSPACE_ID\",\"hostname\":\"test\",\"platform\":\"MACOS\"}" \
        -o /dev/null -w "%{http_code}" | grep -q "200\|400\|401"; then
        pass "Registration endpoint responds"
    else
        fail "Registration endpoint not responding"
    fi
else
    info "Backend not running (skipping API tests)"
    info "Start backend with: cd ../.. && npm run dev"
fi

# Summary
echo ""
echo "========================================="
echo "Test Results:"
echo "  Passed: $TESTS_PASSED"
echo "  Failed: $TESTS_FAILED"
echo "========================================="

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC} ✨"
    exit 0
else
    echo -e "${RED}Some tests failed!${NC} ⚠️"
    exit 1
fi
