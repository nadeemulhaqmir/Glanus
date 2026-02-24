# Glanus Agent - Linux Installer

This directory contains the Debian package (DEB) configuration.

## Prerequisites

- Rust toolchain
- `dpkg-deb` (pre-installed on Debian/Ubuntu)
- Build essentials

## Building

```bash
chmod +x build.sh
./build.sh 0.1.0
```

This will:
1. Build binary for x86_64-unknown-linux-gnu
2. Prepare package structure
3. Copy binary and systemd service
4. Build DEB with dpkg-deb

## Output

`glanus-agent_{version}_amd64.deb`

## Installation

**Ubuntu/Debian**:
```bash
sudo dpkg -i glanus-agent_0.1.0_amd64.deb
```

**Verify installation**:
```bash
systemctl status glanus-agent
```

## Features

- Installs to `/usr/bin/glanus-agent`
- Creates systemd service (auto-start)
- Stores config in `/var/lib/glanus-agent/`
- Logs to systemd journal

## Uninstall

```bash
sudo apt remove glanus-agent
```

Or:

```bash
sudo dpkg -r glanus-agent
```

## Viewing Logs

```bash
journalctl -u glanus-agent -f
```

## Service Control

```bash
# Start
sudo systemctl start glanus-agent

# Stop
sudo systemctl stop glanus-agent

# Restart
sudo systemctl restart glanus-agent

# Status
sudo systemctl status glanus-agent
```

## Supported Distributions

- Ubuntu 20.04+
- Debian 11+
- Linux Mint 20+

For other distributions (Fedora, Arch), you may need to:
1. Extract the binary from the DEB
2. Manually install the systemd service
3. Or build from source
