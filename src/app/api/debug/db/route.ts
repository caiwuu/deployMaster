/**
 * 调试API - 检查数据库状态
 */

import { prisma } from '@/lib/prisma'
import { successResponse } from '@/lib/middleware'

export async function GET() {
  try {
    // 查询所有用户
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      }
    })

    // 获取数据库连接信息
    const dbInfo = {
      DATABASE_URL: process.env.DATABASE_URL,
      NODE_ENV: process.env.NODE_ENV,
      userCount: users.length,
      users: users,
    }

    return successResponse(dbInfo)
  } catch (error: any) {
    return successResponse({
      error: error.message,
      stack: error.stack,
    })
  }
}
