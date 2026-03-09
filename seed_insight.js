const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const workspace = await prisma.workspace.findFirst({ select: { id: true } });
  if (!workspace) return console.log('No workspace found');
  
  await prisma.aIInsight.create({
    data: {
      workspaceId: workspace.id,
      type: 'CAPACITY_FORECAST',
      severity: 'CRITICAL',
      title: 'Capacity Burn - CPU',
      description: 'Oracle expects CPU exhaustion in ~2 hours.',
      confidence: 0.95,
      metadata: { recommendations: ['Review CPU resource consumption immediately.', 'Consider upgrading allocations.'] }
    }
  });
  console.log('AI Insight seeded.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
