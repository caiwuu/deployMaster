/**
 * 登录 API
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateAccessToken, generateRefreshToken } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // 验证必填字段
    if (!email || !password) {
      return errorResponse('邮箱和密码不能为空', 400)
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return errorResponse('邮箱或密码错误', 401)
    }

    // 验证密码
    const isValidPassword = await verifyPassword(password, user.password)

    if (!isValidPassword) {
      return errorResponse('邮箱或密码错误', 401)
    }

    // 检查用户是否被禁用
    if (!user.isActive) {
      return errorResponse('账号已被禁用', 403)
    }

    // 生成 Token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    }

    const accessToken = generateAccessToken(tokenPayload)
    const refreshToken = generateRefreshToken(tokenPayload)

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        avatar: user.avatar,
        role: user.role
      },
      accessToken,
      refreshToken
    })
  } catch (error) {
    console.error('登录失败:', error)
    return errorResponse('登录失败，请稍后重试', 500)
  }
}
