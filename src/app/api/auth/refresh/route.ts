/**
 * 刷新 Token API
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyRefreshToken, generateAccessToken, generateRefreshToken } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { refreshToken } = body

    if (!refreshToken) {
      return errorResponse('刷新令牌不能为空', 400)
    }

    // 验证刷新令牌
    const payload = verifyRefreshToken(refreshToken)

    if (!payload) {
      return errorResponse('无效或过期的刷新令牌', 401)
    }

    // 验证用户是否存在且活跃
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    })

    if (!user || !user.isActive) {
      return errorResponse('用户不存在或已被禁用', 401)
    }

    // 生成新的 Token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    }

    const newAccessToken = generateAccessToken(tokenPayload)
    const newRefreshToken = generateRefreshToken(tokenPayload)

    return successResponse({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    })
  } catch (error) {
    console.error('刷新令牌失败:', error)
    return errorResponse('刷新令牌失败，请重新登录', 500)
  }
}
