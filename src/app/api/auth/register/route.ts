/**
 * 注册 API
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateAccessToken, generateRefreshToken } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, username, password, name } = body

    // 验证必填字段
    if (!email || !username || !password) {
      return errorResponse('邮箱、用户名和密码不能为空', 400)
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return errorResponse('邮箱格式不正确', 400)
    }

    // 验证密码强度
    if (password.length < 6) {
      return errorResponse('密码长度至少为 6 位', 400)
    }

    // 检查邮箱是否已存在
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUserByEmail) {
      return errorResponse('该邮箱已被注册', 400)
    }

    // 检查用户名是否已存在
    const existingUserByUsername = await prisma.user.findUnique({
      where: { username }
    })

    if (existingUserByUsername) {
      return errorResponse('该用户名已被使用', 400)
    }

    // 加密密码
    const hashedPassword = await hashPassword(password)

    // 创建用户
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        name: name || username,
        role: 'DEVELOPER', // 默认角色为开发者
        lastLoginAt: new Date()
      }
    })

    // 生成 Token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    }

    const accessToken = generateAccessToken(tokenPayload)
    const refreshToken = generateRefreshToken(tokenPayload)

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
    }, 201)
  } catch (error) {
    console.error('注册失败:', error)
    return errorResponse('注册失败，请稍后重试', 500)
  }
}
