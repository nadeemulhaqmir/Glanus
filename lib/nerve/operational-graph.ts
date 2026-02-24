/**
 * NERVE — Operational Graph
 * 
 * In-memory graph representation of infrastructure topology built from
 * existing AssetRelationship, AgentConnection, and WorkspaceMember data.
 * 
 * Provides: blast radius analysis, dependency chains, health scoring,
 * and graph traversal for the topology visualization.
 */

import { prisma } from '@/lib/db';

// ─── Types ───────────────────────────────────────────────

export interface GraphNode {
    id: string;
    type: 'asset' | 'agent' | 'user';
    label: string;
    status: string;
    health: number; // 0-100
    metadata: Record<string, unknown>;
}

export interface GraphEdge {
    source: string;
    target: string;
    type: string; // e.g. DEPENDS_ON, CONNECTS_TO, MANAGED_BY
    label: string;
}

export interface OperationalGraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
    summary: {
        totalNodes: number;
        totalEdges: number;
        healthyNodes: number;
        degradedNodes: number;
        criticalNodes: number;
    };
}

// ─── Health Computation ──────────────────────────────────

function computeAgentHealth(agent: {
    status: string;
    cpuUsage: number | null;
    ramUsage: number | null;
    diskUsage: number | null;
}): number {
    if (agent.status !== 'ONLINE') return 0;

    let score = 100;
    const cpu = agent.cpuUsage ?? 0;
    const ram = agent.ramUsage ?? 0;
    const disk = agent.diskUsage ?? 0;

    // CPU penalties
    if (cpu > 90) score -= 30;
    else if (cpu > 75) score -= 15;
    else if (cpu > 60) score -= 5;

    // RAM penalties
    if (ram > 90) score -= 25;
    else if (ram > 75) score -= 10;
    else if (ram > 60) score -= 5;

    // Disk penalties
    if (disk > 95) score -= 30;
    else if (disk > 85) score -= 15;
    else if (disk > 70) score -= 5;

    return Math.max(0, score);
}

function computeAssetHealth(
    asset: { status: string },
    agentHealth: number | null,
): number {
    if (asset.status === 'RETIRED' || asset.status === 'DISPOSED') return 0;
    if (asset.status === 'MAINTENANCE') return 40;

    // If connected to an agent, factor in agent health
    if (agentHealth !== null) {
        return agentHealth;
    }

    // Assets without agents — use status-based heuristic
    if (asset.status === 'AVAILABLE' || asset.status === 'IN_USE') return 85;
    return 60;
}

// ─── Graph Builder ───────────────────────────────────────

export async function buildOperationalGraph(workspaceId: string): Promise<OperationalGraphData> {
    // Fetch all relevant data in parallel
    const [assets, agents, relationships, members] = await Promise.all([
        prisma.asset.findMany({
            where: { workspaceId, deletedAt: null },
            select: {
                id: true,
                name: true,
                status: true,
                assetType: true,
                manufacturer: true,
                model: true,
            },
        }),
        prisma.agentConnection.findMany({
            where: { workspaceId },
            select: {
                id: true,
                assetId: true,
                hostname: true,
                status: true,
                cpuUsage: true,
                ramUsage: true,
                diskUsage: true,
            },
        }),
        prisma.assetRelationship.findMany({
            where: {
                OR: [
                    { parentAsset: { workspaceId } },
                    { childAsset: { workspaceId } },
                ],
            },
            select: {
                id: true,
                parentAssetId: true,
                childAssetId: true,
                relationshipType: true,
            },
        }),
        prisma.workspaceMember.findMany({
            where: { workspaceId },
            select: {
                userId: true,
                role: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        }),
    ]);

    // Build agent lookup by assetId
    const agentByAsset = new Map(
        agents.map(a => [a.assetId, a])
    );

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // ── Asset nodes ──
    for (const asset of assets) {
        const agent = agentByAsset.get(asset.id);
        const agentHealth = agent ? computeAgentHealth(agent) : null;
        const health = computeAssetHealth(asset, agentHealth);

        nodes.push({
            id: asset.id,
            type: 'asset',
            label: asset.name,
            status: agent?.status || asset.status,
            health,
            metadata: {
                assetType: asset.assetType,
                manufacturer: asset.manufacturer,
                model: asset.model,
                hasAgent: !!agent,
                hostname: agent?.hostname,
            },
        });

        // Agent → Asset edge
        if (agent) {
            nodes.push({
                id: agent.id,
                type: 'agent',
                label: agent.hostname || 'Agent',
                status: agent.status,
                health: computeAgentHealth(agent),
                metadata: {
                    cpuUsage: agent.cpuUsage,
                    ramUsage: agent.ramUsage,
                    diskUsage: agent.diskUsage,
                    hostname: agent.hostname,
                },
            });

            edges.push({
                source: agent.id,
                target: asset.id,
                type: 'MONITORS',
                label: 'monitors',
            });
        }
    }

    // ── Relationship edges ──
    for (const rel of relationships) {
        edges.push({
            source: rel.parentAssetId,
            target: rel.childAssetId,
            type: rel.relationshipType,
            label: rel.relationshipType.toLowerCase().replace(/_/g, ' '),
        });
    }

    // ── User nodes (optional, for larger workspaces) ──
    if (members.length <= 20) {
        for (const member of members) {
            nodes.push({
                id: member.user.id,
                type: 'user',
                label: member.user.name || member.user.email,
                status: 'active',
                health: 100,
                metadata: { role: member.role },
            });
        }
    }

    // ── Summary ──
    const assetNodes = nodes.filter(n => n.type === 'asset');
    const summary = {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        healthyNodes: assetNodes.filter(n => n.health >= 80).length,
        degradedNodes: assetNodes.filter(n => n.health >= 40 && n.health < 80).length,
        criticalNodes: assetNodes.filter(n => n.health < 40).length,
    };

    return { nodes, edges, summary };
}

// ─── Graph Queries ───────────────────────────────────────

/**
 * Get blast radius — all nodes transitively reachable from a starting node
 */
export function getBlastRadius(
    graph: OperationalGraphData,
    nodeId: string,
): string[] {
    const visited = new Set<string>();
    const queue = [nodeId];

    while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);

        // Find outgoing edges (both directions)
        for (const edge of graph.edges) {
            if (edge.source === current && !visited.has(edge.target)) {
                queue.push(edge.target);
            }
            if (edge.target === current && !visited.has(edge.source)) {
                queue.push(edge.source);
            }
        }
    }

    visited.delete(nodeId); // Don't include the starting node
    return Array.from(visited);
}

/**
 * Get dependency chain — upstream dependencies of a node
 */
export function getDependencyChain(
    graph: OperationalGraphData,
    nodeId: string,
): string[] {
    const visited = new Set<string>();
    const queue = [nodeId];

    while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);

        // Only follow edges where this node is the child/target (upstream)
        for (const edge of graph.edges) {
            if (edge.target === current && !visited.has(edge.source)) {
                queue.push(edge.source);
            }
        }
    }

    visited.delete(nodeId);
    return Array.from(visited);
}
