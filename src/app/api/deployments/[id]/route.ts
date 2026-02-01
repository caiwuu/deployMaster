/**
 * 单个部署 API
 * GET: 获取部署详情
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  authenticate,
  errorResponse,
  successResponse,
  checkProjectPermission
} from '@/lib/middleware'

// 获取部署详情
export async function GET(
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

    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
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
            repoUrl: true,
            workspace: true
          }
        },
        workflow: {
          select: {
            id: true,
            name: true,
            description: true,
            commands: {
              orderBy: {
                sequence: 'asc'
              }
            }
          }
        },
        approval: {
          include: {
            requester: {
              select: {
                id: true,
                username: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (!deployment) {
      return errorResponse('部署记录不存在', 404)
    }

    // 检查权限
    const hasPermission = user.role === 'SUPER_ADMIN' ||
      await checkProjectPermission(user.userId, deployment.projectId, ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'])

    if (!hasPermission) {
      return errorResponse('无权访问该部署', 403)
    }

    // 获取当前用户在项目中的角色，用于前端权限控制
    const currentUserMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: deployment.projectId,
          userId: user.userId
        }
      },
      select: {
        role: true
      }
    })
    const currentUserProjectRole = currentUserMember?.role || null

    return successResponse({
      ...deployment,
      currentUserRole: currentUserProjectRole // 添加当前用户在项目中的角色
    })
  } catch (error) {
    console.error('获取部署详情失败:', error)
    return errorResponse('获取部署详情失败', 500)
  }
}
