/**
 * 单个工作流 API
 * GET: 获取工作流详情
 * PUT: 更新工作流
 * DELETE: 删除工作流
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

// 获取工作流详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; workflowId: string }> }
) {
  try {
    const auth = await authenticate(request)
    if (!auth.success) {
      return auth.response!
    }

    const user = auth.user!
    const { id: projectId, workflowId } = await params

    // 检查权限
    const hasPermission = user.role === 'SUPER_ADMIN' || 
      await checkProjectPermission(user.userId, projectId, ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'])

    if (!hasPermission) {
      return errorResponse('无权访问该工作流', 403)
    }

    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        projectId
      },
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
      }
    })

    if (!workflow) {
      return errorResponse('工作流不存在', 404)
    }

    return successResponse(workflow)
  } catch (error) {
    console.error('获取工作流详情失败:', error)
    return errorResponse('获取工作流详情失败', 500)
  }
}

// 更新工作流
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; workflowId: string }> }
) {
  try {
    const auth = await authenticate(request)
    if (!auth.success) {
      return auth.response!
    }

    const user = auth.user!
    const { id: projectId, workflowId } = await params

    // 检查权限（只有 OWNER 和 ADMIN 可以更新）
    const hasPermission = user.role === 'SUPER_ADMIN' || 
      await checkProjectPermission(user.userId, projectId, ['OWNER', 'ADMIN'])

    if (!hasPermission) {
      return errorResponse('无权修改该工作流', 403)
    }

    const body = await request.json()
    const { 
      name, 
      description,
      requireApproval,
      commands
    } = body

    // 如果提供了命令列表，先删除旧命令再创建新命令
    if (commands !== undefined) {
      await prisma.workflowCommand.deleteMany({
        where: { workflowId }
      })
    }

    const workflow = await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(requireApproval !== undefined && { requireApproval }),
        ...(commands !== undefined && {
          commands: {
            create: commands.map((cmd: any, index: number) => ({
              command: cmd.command || cmd,
              sequence: cmd.sequence !== undefined ? cmd.sequence : index
            }))
          }
        })
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
      action: 'update_workflow',
      resource: `workflow:${workflowId}`,
      details: { updates: body },
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return successResponse(workflow)
  } catch (error) {
    console.error('更新工作流失败:', error)
    return errorResponse('更新工作流失败', 500)
  }
}

// 删除工作流
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; workflowId: string }> }
) {
  try {
    const auth = await authenticate(request)
    if (!auth.success) {
      return auth.response!
    }

    const user = auth.user!
    const { id: projectId, workflowId } = await params

    // 检查权限（只有 OWNER 和超级管理员可以删除）
    const hasPermission = user.role === 'SUPER_ADMIN' || 
      await checkProjectPermission(user.userId, projectId, ['OWNER'])

    if (!hasPermission) {
      return errorResponse('无权删除该工作流', 403)
    }

    await prisma.workflow.delete({
      where: { id: workflowId }
    })

    // 记录审计日志
    await logAudit({
      userId: user.userId,
      action: 'delete_workflow',
      resource: `workflow:${workflowId}`,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return successResponse({ message: '工作流已删除' })
  } catch (error) {
    console.error('删除工作流失败:', error)
    return errorResponse('删除工作流失败', 500)
  }
}
