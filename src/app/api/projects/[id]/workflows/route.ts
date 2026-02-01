/**
 * 工作流管理 API
 * GET: 获取项目的工作流列表
 * POST: 创建新工作流
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

// 获取项目的工作流列表
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
    const { id: projectId } = await params

    // 检查权限
    const hasPermission = user.role === 'SUPER_ADMIN' || 
      await checkProjectPermission(user.userId, projectId, ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'])

    if (!hasPermission) {
      return errorResponse('无权访问该项目的工作流', 403)
    }

    const workflows = await prisma.workflow.findMany({
      where: { projectId },
      include: {
        commands: {
          orderBy: {
            sequence: 'asc'
          }
        },
        _count: {
          select: {
            deployments: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return successResponse(workflows)
  } catch (error) {
    console.error('获取工作流列表失败:', error)
    return errorResponse('获取工作流列表失败', 500)
  }
}

// 创建新工作流
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

    // 检查权限（只有 OWNER 和 ADMIN 可以创建工作流）
    const hasPermission = user.role === 'SUPER_ADMIN' || 
      await checkProjectPermission(user.userId, projectId, ['OWNER', 'ADMIN'])

    if (!hasPermission) {
      return errorResponse('无权创建工作流', 403)
    }

    const body = await request.json()
    const { 
      name, 
      description,
      requireApproval = false,
      commands = []
    } = body

    // 验证必填字段
    if (!name) {
      return errorResponse('工作流名称不能为空', 400)
    }

    // 检查工作流名称是否已存在
    const existingWorkflow = await prisma.workflow.findFirst({
      where: {
        projectId,
        name
      }
    })

    if (existingWorkflow) {
      return errorResponse('工作流名称已存在', 400)
    }

    // 创建工作流
    const workflow = await prisma.workflow.create({
      data: {
        projectId,
        name,
        description,
        requireApproval,
        commands: {
          create: commands.map((cmd: any, index: number) => ({
            command: cmd.command || cmd,
            sequence: cmd.sequence !== undefined ? cmd.sequence : index
          }))
        }
      },
      include: {
        commands: {
          orderBy: {
            sequence: 'asc'
          }
        }
      }
    })

    // 记录审计日志
    await logAudit({
      userId: user.userId,
      action: 'create_workflow',
      resource: `workflow:${workflow.id}`,
      details: { projectId, name, commandCount: commands.length },
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return successResponse(workflow, 201)
  } catch (error) {
    console.error('创建工作流失败:', error)
    return errorResponse('创建工作流失败', 500)
  }
}
