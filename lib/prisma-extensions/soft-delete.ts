/**
 * Prisma Soft-Delete Extension
 * 
 * Automatically filters out soft-deleted Assets (where deletedAt is not null)
 * from findMany, findFirst, and count queries unless explicitly overridden.
 */

import { Prisma } from '@prisma/client';

/**
 * Prisma extension that adds soft-delete filtering to Asset queries.
 * 
 * Usage: Apply to the Prisma client in lib/db.ts:
 *   const prisma = new PrismaClient().$extends(softDeleteExtension);
 * 
 * To include soft-deleted assets, pass `deletedAt: { not: null }` in your where clause
 * or use `prisma.asset.findMany({ where: { deletedAt: undefined } })`.
 */
export const softDeleteExtension = Prisma.defineExtension({
    name: 'soft-delete',
    query: {
        asset: {
            async findMany({ args, query }) {
                // Only add filter if deletedAt is not already specified
                if (!args.where?.deletedAt) {
                    args.where = { ...args.where, deletedAt: null };
                }
                return query(args);
            },
            async findFirst({ args, query }) {
                if (!args.where?.deletedAt) {
                    args.where = { ...args.where, deletedAt: null };
                }
                return query(args);
            },
            async count({ args, query }) {
                if (!args.where?.deletedAt) {
                    args.where = { ...args.where, deletedAt: null };
                }
                return query(args);
            },
        },
    },
});
