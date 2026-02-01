/**
 * 取消部署 API
 * POST: 取消正在进行或等待中的部署
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

// 取消部署
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
    const { id: deploymentId } = await params

    // 获取部署记录
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId }
    })

    if (!deployment) {
      return errorResponse('部署记录不存在', 404)
    }

    // 只能取消等待中或运行中的部署
    const cancellableStatuses = ['PENDING', 'WAITING_APPROVAL', 'RUNNING']
    if (!cancellableStatuses.includes(deployment.status)) {
      return errorResponse('该部署不能被取消', 400)
    }

    // 检查权限（只有创建者或管理员可以取消）
    const isCreator = deployment.userId === user.userId
    const isAdmin = user.role === 'SUPER_ADMIN' || 
      await checkProjectPermission(user.userId, deployment.projectId, ['OWNER', 'ADMIN'])

    if (!isCreator && !isAdmin) {
      return errorResponse('无权取消该部署', 403)
    }

    // 更新部署状态并释放workspace锁
    const updatedDeployment = await prisma.$transaction(async (tx) => {
      // 更新部署状态
      const updated = await tx.deployment.update({
        where: { id: deploymentId },
        data: {
          status: 'CANCELLED',
          completedAt: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true
            }
          },
          project: {
            select: {
              id: true,
              name: true,
              workspace: true
            }
          },
          workflow: {
            select: {
              id: true,
              name: true,
              description: true
            }
          }
        }
      })

      // 释放workspace锁
      await tx.workspaceLock.deleteMany({
        where: {
          projectId: deployment.projectId,
          deploymentId: deploymentId
        }
      })

      return updated
    })

    // 记录审计日志
    await logAudit({
      userId: user.userId,
      action: 'cancel_deployment',
      resource: `deployment:${deploymentId}`,
      details: { 
        projectId: deployment.projectId,
        workflowId: deployment.workflowId
      },
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return successResponse({ 
      deployment: updatedDeployment,
      message: '部署已取消'
    })
  } catch (error) {
    console.error('取消部署失败:', error)
    return errorResponse('取消部署失败', 500)
  }
}
