import { PrismaClient } from '@prisma/client'

// Single shared Prisma client instance, reused across requests.
export const prisma = new PrismaClient()
