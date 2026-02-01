/**
 * 单个用户 API
 * GET: 获取用户详情
 * PUT: 更新用户信息
 * DELETE: 删除用户
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  authenticate, 
  errorResponse, 
  successResponse, 
  logAudit 
} from '@/lib/middleware'

// 获取用户详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request)
    if (!auth.success) {
      return auth.response!
    }

    const currentUser = auth.user!
    const { id: userId } = await params

    // 只有超级管理员或用户本人可以查看详情
    if (currentUser.role !== 'SUPER_ADMIN' && currentUser.userId !== userId) {
      return errorResponse('无权访问该用户信息', 403)
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            projects: true,
            deployments: true,
            auditLogs: true
          }
        }
      }
    })

    if (!user) {
      return errorResponse('用户不存在', 404)
    }

    return successResponse(user)
  } catch (error) {
    console.error('获取用户详情失败:', error)
    return errorResponse('获取用户详情失败', 500)
  }
}

// 更新用户信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request)
    if (!auth.success) {
      return auth.response!
    }

    const currentUser = auth.user!
    const { id: userId } = await params

    const body = await request.json()
    const { role, isActive, name, avatar } = body

    // 权限检查
    const isSuperAdmin = currentUser.role === 'SUPER_ADMIN'
    const isSelf = currentUser.userId === userId

    // 修改角色和状态需要超级管理员权限
    if ((role !== undefined || isActive !== undefined) && !isSuperAdmin) {
      return errorResponse('无权修改用户角色或状态', 403)
    }

    // 修改其他信息需要是本人或管理员
    if (!isSelf && !isSuperAdmin) {
      return errorResponse('无权修改该用户信息', 403)
    }

    // 不能修改自己的角色和状态
    if (isSelf && (role !== undefined || isActive !== undefined)) {
      return errorResponse('不能修改自己的角色或状态', 400)
    }

    // 验证角色
    if (role !== undefined) {
      const validRoles = ['SUPER_ADMIN', 'PROJECT_OWNER', 'DEVELOPER', 'VIEWER']
      if (!validRoles.includes(role)) {
        return errorResponse('无效的角色', 400)
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
        ...(name !== undefined && { name }),
        ...(avatar !== undefined && { avatar })
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        avatar: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true
      }
    })

    // 记录审计日志
    await logAudit({
      userId: currentUser.userId,
      action: 'update_user',
      resource: `user:${userId}`,
      details: { updates: body },
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return successResponse(user)
  } catch (error) {
    console.error('更新用户信息失败:', error)
    return errorResponse('更新用户信息失败', 500)
  }
}

// 删除用户
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request)
    if (!auth.success) {
      return auth.response!
    }

    const currentUser = auth.user!
    const { id: userId } = await params

    // 只有超级管理员可以删除用户
    if (currentUser.role !== 'SUPER_ADMIN') {
      return errorResponse('无权删除用户', 403)
    }

    // 不能删除自己
    if (currentUser.userId === userId) {
      return errorResponse('不能删除自己', 400)
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return errorResponse('用户不存在', 404)
    }

    // 删除用户（注意：由于外键约束，需要先处理关联数据）
    await prisma.user.delete({
      where: { id: userId }
    })

    // 记录审计日志
    await logAudit({
      userId: currentUser.userId,
      action: 'delete_user',
      resource: `user:${userId}`,
      details: { username: user.username, email: user.email },
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return successResponse({ message: '用户已删除' })
  } catch (error) {
    console.error('删除用户失败:', error)
    return errorResponse('删除用户失败', 500)
  }
}
