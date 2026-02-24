# Generate SHA-256 checksums for installers
# Run this after building installers to get checksums for seeding database

echo "Generating SHA-256 checksums for Glanus Agent installers..."
echo ""

# Windows
if [ -f "../glanus-agent/installers/windows/glanus-agent-0.1.0.msi" ]; then
    echo "Windows (MSI):"
    shasum -a 256 ../glanus-agent/installers/windows/glanus-agent-0.1.0.msi
    echo ""
fi

# macOS
if [ -f "../glanus-agent/installers/macos/glanus-agent-0.1.0.pkg" ]; then
    echo "macOS (PKG):"
    shasum -a 256 ../glanus-agent/installers/macos/glanus-agent-0.1.0.pkg
    echo ""
fi

# Linux
if [ -f "../glanus-agent/installers/linux/glanus-agent_0.1.0_amd64.deb" ]; then
    echo "Linux (DEB):"
    shasum -a 256 ../glanus-agent/installers/linux/glanus-agent_0.1.0_amd64.deb
    echo ""
fi

echo "✓ Copy these checksums to prisma/seeds/seed_agent_versions.sql"
