#!/bin/bash
# Build Glanus Agent DEB Package for Linux
# Usage: ./build.sh <version>

set -e

VERSION=$1

if [ -z "$VERSION" ]; then
    echo "Error: Version required"
    echo "Usage: ./build.sh <version>"
    exit 1
fi

echo "Building Glanus Agent v$VERSION for Linux..."

# Step 1: Build binary
echo -e "\n[1/4] Building Rust binary..."
cd ../../src-tauri
cargo build --release --target x86_64-unknown-linux-gnu
cd -

# Step 2: Prepare package structure
echo -e "\n[2/4] Preparing package structure..."
BUILD_DIR="./build"
rm -rf "$BUILD_DIR"

mkdir -p "$BUILD_DIR/usr/bin"
mkdir -p "$BUILD_DIR/usr/lib/systemd/system"
mkdir -p "$BUILD_DIR/var/lib/glanus-agent"
mkdir -p "$BUILD_DIR/DEBIAN"

# Step 3: Copy files
echo -e "\n[3/4] Copying files..."

# Binary
cp "../../src-tauri/target/x86_64-unknown-linux-gnu/release/glanus-agent" \
   "$BUILD_DIR/usr/bin/"
chmod 755 "$BUILD_DIR/usr/bin/glanus-agent"

# systemd service
cp glanus-agent.service "$BUILD_DIR/usr/lib/systemd/system/"
chmod 644 "$BUILD_DIR/usr/lib/systemd/system/glanus-agent.service"

# DEBIAN control files
cp DEBIAN/control "$BUILD_DIR/DEBIAN/"
cp DEBIAN/postinst "$BUILD_DIR/DEBIAN/"
cp DEBIAN/prerm "$BUILD_DIR/DEBIAN/"

# Update version in control file
sed -i "s/Version: .*/Version: $VERSION/" "$BUILD_DIR/DEBIAN/control"

# Set permissions for maintainer scripts
chmod 755 "$BUILD_DIR/DEBIAN/postinst"
chmod 755 "$BUILD_DIR/DEBIAN/prerm"

# Step 4: Build DEB package
echo -e "\n[4/4] Building DEB package..."
dpkg-deb --build --root-owner-group "$BUILD_DIR" "glanus-agent_${VERSION}_amd64.deb"

# Cleanup
rm -rf "$BUILD_DIR"

echo -e "\n✓ Build complete!"
echo "Output: glanus-agent_${VERSION}_amd64.deb"

# Show package info
echo -e "\nPackage info:"
dpkg-deb -I "glanus-agent_${VERSION}_amd64.deb"
