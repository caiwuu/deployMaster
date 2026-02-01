/**
 * 部署管理 API
 * GET: 获取部署列表
 * POST: 创建新部署
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

// 获取部署列表
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (!auth.success) {
      return auth.response!
    }

    const user = auth.user!
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const workflowId = searchParams.get('workflowId')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    const where: any = {}

    // 过滤条件
    if (projectId) {
      where.projectId = projectId
      
      // 检查项目权限
      const hasPermission = user.role === 'SUPER_ADMIN' || 
        await checkProjectPermission(user.userId, projectId, ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'])
      
      if (!hasPermission) {
        return errorResponse('无权访问该项目的部署', 403)
      }
    } else if (user.role !== 'SUPER_ADMIN') {
      // 普通用户只能看到自己参与的项目的部署
      const projectMembers = await prisma.projectMember.findMany({
        where: { userId: user.userId },
        select: { projectId: true }
      })
      where.projectId = { in: projectMembers.map(pm => pm.projectId) }
    }

    if (workflowId) {
      where.workflowId = workflowId
    }

    if (status) {
      where.status = status
    }

    // 时间筛选
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

    const [deployments, total] = await Promise.all([
      prisma.deployment.findMany({
        where,
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
          },
          approval: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.deployment.count({ where })
    ])

    return successResponse({
      deployments,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    })
  } catch (error) {
    console.error('获取部署列表失败:', error)
    return errorResponse('获取部署列表失败', 500)
  }
}

// 创建新部署
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (!auth.success) {
      return auth.response!
    }

    const user = auth.user!
    const body = await request.json()
    const { 
      projectId, 
      workflowId,
      branch
    } = body

    // 验证必填字段
    if (!projectId || !workflowId) {
      return errorResponse('项目和工作流不能为空', 400)
    }

    // 检查项目权限
    const hasPermission = user.role === 'SUPER_ADMIN' || 
      await checkProjectPermission(user.userId, projectId, ['OWNER', 'ADMIN', 'MEMBER'])

    if (!hasPermission) {
      return errorResponse('无权在该项目中创建部署', 403)
    }

    // 检查项目是否存在并获取workspace
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return errorResponse('项目不存在', 404)
    }

    if (!project.workspace) {
      return errorResponse('项目未配置workspace', 400)
    }

    // 检查工作流是否存在
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        commands: {
          orderBy: {
            sequence: 'asc'
          }
        }
      }
    })

    if (!workflow || workflow.projectId !== projectId) {
      return errorResponse('工作流不存在或不属于该项目', 400)
    }

    if (!workflow.commands || workflow.commands.length === 0) {
      return errorResponse('工作流未配置任何命令', 400)
    }

    // 检查workspace锁：同一个workspace只能同时运行一个工作流
    const existingLock = await prisma.workspaceLock.findUnique({
      where: { projectId },
      include: {
        project: {
          select: {
            name: true
          }
        }
      }
    })

    if (existingLock) {
      return errorResponse(`该项目的workspace正在执行其他部署（部署ID: ${existingLock.deploymentId}），请稍后再试`, 409)
    }

    // 检查是否需要审批
    let status = 'PENDING'
    let approval = null

    if (workflow.requireApproval) {
      // 如果是 PROJECT_OWNER 或 SUPER_ADMIN，自动审批
      if (user.role === 'SUPER_ADMIN') {
        status = 'APPROVED'
      } else {
        const isOwner = await checkProjectPermission(user.userId, projectId, ['OWNER'])
        status = isOwner ? 'APPROVED' : 'WAITING_APPROVAL'
      }
    }

    // 创建部署记录和workspace锁
    const deployment = await prisma.$transaction(async (tx) => {
      // 创建部署记录
      const newDeployment = await tx.deployment.create({
        data: {
          projectId,
          workflowId,
          userId: user.userId,
          branch: branch || project.defaultBranch || null,
          status
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

      // 如果已审批，立即锁定workspace
      if (status === 'APPROVED') {
        await tx.workspaceLock.create({
          data: {
            projectId,
            deploymentId: newDeployment.id
          }
        })
      }

      return newDeployment
    })

    // 如果需要审批，创建审批记录
    if (status === 'WAITING_APPROVAL') {
      approval = await prisma.approval.create({
        data: {
          deploymentId: deployment.id,
          requesterId: user.userId,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30分钟后过期
        }
      })

      // TODO: 发送审批通知
    }

    // 记录审计日志
    await logAudit({
      userId: user.userId,
      action: 'create_deployment',
      resource: `deployment:${deployment.id}`,
      details: { projectId, workflowId, workflowName: workflow.name },
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    // 如果已审批，立即触发部署执行
    if (status === 'APPROVED') {
      // 异步执行部署，不阻塞API响应
      const { triggerDeployment } = await import('@/lib/executor')
      triggerDeployment(deployment.id)
    }

    return successResponse({ deployment, approval }, 201)
  } catch (error) {
    console.error('创建部署失败:', error)
    return errorResponse('创建部署失败', 500)
  }
}
