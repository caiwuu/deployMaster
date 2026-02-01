/**
 * 获取当前用户信息 API
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticate, errorResponse, successResponse } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    // 验证身份
    const auth = await authenticate(request)
    if (!auth.success) {
      return auth.response!
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.user!.userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true
      }
    })

    if (!user) {
      return errorResponse('用户不存在', 404)
    }

    return successResponse(user)
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return errorResponse('获取用户信息失败', 500)
  }
}
