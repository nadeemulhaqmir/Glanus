-- Seed script for AgentVersion table
-- This creates the initial v0.1.0 release for all platforms
-- Run after migration: psql -d glanus -f seed_agent_versions.sql

INSERT INTO "AgentVersion" (
  id,
  version,
  platform,
  "downloadUrl",
  checksum,
  "releaseNotes",
  required,
  status,
  "createdAt",
  "updatedAt"
) VALUES
  -- Windows
  (
    'agent_v0.1.0_windows',
    '0.1.0',
    'WINDOWS',
    'https://github.com/your-org/glanus-agent/releases/download/v0.1.0/glanus-agent-0.1.0.msi',
    'REPLACE_WITH_ACTUAL_SHA256_CHECKSUM',
    E'Initial release\n\n- System monitoring (CPU, RAM, Disk, Network)\n- Remote script execution\n- Auto-updates\n- Windows Service integration',
    false,
    'ACTIVE',
    NOW(),
    NOW()
  ),
  -- macOS
  (
    'agent_v0.1.0_macos',
    '0.1.0',
    'MACOS',
    'https://github.com/your-org/glanus-agent/releases/download/v0.1.0/glanus-agent-0.1.0.pkg',
    'REPLACE_WITH_ACTUAL_SHA256_CHECKSUM',
    E'Initial release\n\n- System monitoring (CPU, RAM, Disk, Network)\n- Remote script execution\n- Auto-updates\n- LaunchAgent integration',
    false,
    'ACTIVE',
    NOW(),
    NOW()
  ),
  -- Linux
  (
    'agent_v0.1.0_linux',
    '0.1.0',
    'LINUX',
    'https://github.com/your-org/glanus-agent/releases/download/v0.1.0/glanus-agent_0.1.0_amd64.deb',
    'REPLACE_WITH_ACTUAL_SHA256_CHECKSUM',
    E'Initial release\n\n- System monitoring (CPU, RAM, Disk, Network)\n- Remote script execution\n- Auto-updates\n- systemd service integration',
    false,
    'ACTIVE',
    NOW(),
    NOW()
  )
ON CONFLICT (version, platform) DO NOTHING;

-- Verify insertion
SELECT version, platform, status FROM "AgentVersion" ORDER BY platform;
