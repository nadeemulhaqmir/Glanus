// Migration to add AgentVersion table for tracking releases
// Run: npx prisma migrate dev --name add_agent_versions

model AgentVersion {
  id String @id @default(cuid())
  version String // e.g., "0.1.0"
  platform String // WINDOWS, MACOS, LINUX
  downloadUrl String // URL to installer
  checksum String // SHA-256 checksum
  releaseNotes String? @db.Text
  required Boolean @default(false) // If true, update is mandatory
  status String @default("ACTIVE") // ACTIVE, DEPRECATED, BETA
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([version, platform])
  @@index([platform, status])
}

// Add this model to your schema.prisma file
