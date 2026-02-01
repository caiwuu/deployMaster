/**
 * 手动执行部署 API
 * POST: 手动触发部署执行
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  authenticate, 
  errorResponse, 
  successResponse,
  checkProjectPermission 
} from '@/lib/middleware'
import { triggerDeployment } from '@/lib/executor'

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

    // 检查权限
    const hasPermission = user.role === 'SUPER_ADMIN' || 
      await checkProjectPermission(user.userId, deployment.projectId, ['OWNER', 'ADMIN', 'MEMBER'])

    if (!hasPermission) {
      return errorResponse('无权执行该部署', 403)
    }

    // 检查状态
    if (deployment.status === 'RUNNING') {
      return errorResponse('部署正在执行中', 400)
    }

    if (deployment.status === 'SUCCESS') {
      return errorResponse('部署已经成功完成', 400)
    }

    // 检查workspace锁
    const existingLock = await prisma.workspaceLock.findUnique({
      where: { projectId: deployment.projectId }
    })

    if (existingLock && existingLock.deploymentId !== deploymentId) {
      return errorResponse('该项目的workspace正在执行其他部署', 409)
    }

    // 如果没有锁，创建锁
    if (!existingLock) {
      await prisma.workspaceLock.create({
        data: {
          projectId: deployment.projectId,
          deploymentId
        }
      })
    }

    // 触发执行
    triggerDeployment(deploymentId)

    return successResponse({ 
      message: '部署已开始执行',
      deploymentId 
    })
  } catch (error) {
    console.error('触发部署执行失败:', error)
    return errorResponse('触发部署执行失败', 500)
  }
}
