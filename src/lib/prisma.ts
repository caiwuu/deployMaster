/**
 * Prisma Client 单例
 * 避免在开发环境中创建多个 Prisma Client 实例
 */

import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// 测试数据库连接
if (process.env.NODE_ENV === 'development') {
  prisma.$connect().then(async () => {
    const count = await prisma.user.count()
    console.log('✅ Prisma 数据库已连接，用户数:', count)
  }).catch((e) => {
    console.error('❌ Prisma 数据库连接失败:', e)
  })
}

export default prisma
