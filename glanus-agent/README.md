# Glanus Agent

Cross-platform remote monitoring and management (RMM) agent built with Tauri and Rust.

## Features

- **System Monitoring**: CPU, RAM, Disk, Network, Processes
- **Remote Execution**: PowerShell, Bash, Python scripts
- **Auto-Updates**: SHA-256 verified updates with maintenance windows
- **Secure Communication**: Auth tokens in OS keychain, HTTPS only
- **Cross-Platform**: Windows, macOS, Linux

## Architecture

```
Frontend (Tauri Webview)
  └── System Tray UI
Backend (Rust)
  ├── System Monitor (sysinfo)
  ├── HTTP Client (reqwest)
  ├── Script Executor
  ├── Auto-Updater
  └── Heartbeat Loop (60s)
```

## Installation

Download installers from [Releases](https://github.com/your-org/glanus-agent/releases):

- **Windows**: `glanus-agent-{version}.msi`
- **macOS**: `glanus-agent-{version}.pkg`
- **Linux**: `glanus-agent_{version}_amd64.deb`

See [installers/](./installers/) for platform-specific documentation.

## Development

### Prerequisites

- Rust 1.70+
- Node.js 18+ (for Tauri CLI)
- Platform-specific:
  - Windows: Visual Studio Build Tools
  - macOS: Xcode Command Line Tools
  - Linux: build-essential, libgtk-3-dev, libwebkit2gtk-4.0-dev

### Setup

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.sh | sh

# Install Tauri CLI
cargo install tauri-cli --version "^2.0.0"

# Clone repository
git clone https://github.com/your-org/glanus-agent
cd glanus-agent
```

### Build

```bash
cd src-tauri
cargo build
```

### Run

```bash
cargo tauri dev
```

## Configuration

Config location:
- **Windows**: `%APPDATA%\Glanus\config.toml`
- **macOS**: `~/Library/Application Support/Glanus/config.toml`
- **Linux**: `~/.config/glanus/config.toml`

Example:
```toml
[agent]
version = "0.1.0"
workspace_id = "workspace_123"
registered = true

[server]
api_url = "https://api.glanus.com"
heartbeat_interval = 60

[monitoring]
enabled = true
interval = 10

[updates]
enabled = true
check_interval = 86400
auto_install = false
```

## Building Installers

See [installers/](./installers/) directory for platform-specific build scripts.

**Quick start**:
```bash
# Windows
cd installers/windows && .\build.ps1 0.1.0

# macOS
cd installers/macos && ./build.sh 0.1.0

# Linux
cd installers/linux && ./build.sh 0.1.0
```

## API Endpoints

The agent communicates with Glanus backend via:

- `POST /api/agent/register` - Register with workspace
- `POST /api/agent/heartbeat` - Send metrics, receive commands
- `POST /api/agent/command-result` - Report script results
- `POST /api/agent/check-update` - Check for updates

## Security

- Auth tokens stored in OS keychain (Windows Credential Manager, macOS Keychain, Linux Secret Service)
- SHA-256 checksum verification for updates
- HTTPS-only communication
- Optional code signing (Windows, macOS)

## License

MIT

## Support

For issues and questions:
- GitHub Issues: [github.com/your-org/glanus-agent/issues](https://github.com/your-org/glanus-agent/issues)
- Documentation: [docs.glanus.com](https://docs.glanus.com)
- Email: support@glanus.com
