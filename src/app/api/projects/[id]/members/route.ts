/**
 * 项目成员 API
 * POST: 添加成员
 * DELETE: 移除成员
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  authenticate, 
  errorResponse, 
  successResponse, 
  logAudit,
  checkProjectPermission 
} from '@/lib/middleware'

// 添加成员
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request)
    if (!auth.success) {
      return auth.response!
    }

    const user = auth.user!
    const { id: projectId } = await params

    // 检查权限（只有 OWNER 和 ADMIN 可以添加成员）
    const hasPermission = user.role === 'SUPER_ADMIN' || 
      await checkProjectPermission(user.userId, projectId, ['OWNER', 'ADMIN'])

    if (!hasPermission) {
      return errorResponse('无权添加项目成员', 403)
    }

    const body = await request.json()
    const { userId, role = 'MEMBER' } = body

    if (!userId) {
      return errorResponse('用户ID不能为空', 400)
    }

    // 检查用户是否存在
    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!targetUser) {
      return errorResponse('用户不存在', 404)
    }

    // 检查成员是否已存在
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      }
    })

    if (existingMember) {
      return errorResponse('该用户已是项目成员', 400)
    }

    // 添加成员
    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId,
        role
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            avatar: true,
            role: true
          }
        }
      }
    })

    // 记录审计日志
    await logAudit({
      userId: user.userId,
      action: 'add_project_member',
      resource: `project:${projectId}`,
      details: { targetUserId: userId, role },
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return successResponse(member)
  } catch (error) {
    console.error('添加项目成员失败:', error)
    return errorResponse('添加项目成员失败', 500)
  }
}

// 删除成员
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request)
    if (!auth.success) {
      return auth.response!
    }

    const user = auth.user!
    const { id: projectId } = await params

    // 检查权限（只有 OWNER 和 ADMIN 可以删除成员）
    const hasPermission = user.role === 'SUPER_ADMIN' || 
      await checkProjectPermission(user.userId, projectId, ['OWNER', 'ADMIN'])

    if (!hasPermission) {
      return errorResponse('无权删除项目成员', 403)
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return errorResponse('用户ID不能为空', 400)
    }

    // 检查成员是否存在
    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      },
      include: {
        user: {
          select: {
            username: true,
            name: true
          }
        }
      }
    })

    if (!member) {
      return errorResponse('成员不存在', 404)
    }

    // 不能删除项目所有者
    if (member.role === 'OWNER') {
      return errorResponse('不能删除项目所有者', 400)
    }

    // 删除成员
    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      }
    })

    // 记录审计日志
    await logAudit({
      userId: user.userId,
      action: 'remove_project_member',
      resource: `project:${projectId}`,
      details: { targetUserId: userId, removedUserName: member.user.name || member.user.username },
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return successResponse({ message: '成员已删除' })
  } catch (error) {
    console.error('删除项目成员失败:', error)
    return errorResponse('删除项目成员失败', 500)
  }
}
