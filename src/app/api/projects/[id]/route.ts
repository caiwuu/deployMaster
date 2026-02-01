/**
 * 单个项目 API
 * GET: 获取项目详情
 * PUT: 更新项目
 * DELETE: 删除项目
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

// 获取项目详情
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
      return errorResponse('无权访问该项目', 403)
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
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
        },
        workflows: {
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
        },
        deployments: {
          take: 10,
          orderBy: {
            createdAt: 'desc'
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
            workflow: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        }
      }
    })

    if (!project) {
      return errorResponse('项目不存在', 404)
    }

    // 获取当前用户在项目中的角色
    const currentUserMember = project.members.find(m => m.userId === user.userId)
    const currentUserProjectRole = currentUserMember?.role || null

    return successResponse({
      ...project,
      currentUserRole: currentUserProjectRole // 添加当前用户在项目中的角色
    })
  } catch (error) {
    console.error('获取项目详情失败:', error)
    return errorResponse('获取项目详情失败', 500)
  }
}

// 更新项目
export async function PUT(
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

    // 检查权限（只有 OWNER 和 ADMIN 可以更新）
    const hasPermission = user.role === 'SUPER_ADMIN' || 
      await checkProjectPermission(user.userId, projectId, ['OWNER', 'ADMIN'])

    if (!hasPermission) {
      return errorResponse('无权修改该项目', 403)
    }

    const body = await request.json()
    const { name, description, repoUrl, repoType, framework, workspace, defaultBranch, tags, status } = body

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(repoUrl && { repoUrl }),
        ...(repoType && { repoType }),
        ...(framework !== undefined && { framework }),
        ...(workspace !== undefined && { workspace }),
        ...(defaultBranch !== undefined && { defaultBranch }),
        ...(tags !== undefined && { tags: JSON.stringify(tags) }),
        ...(status && { status })
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true
              }
            }
          }
        }
      }
    })

    // 记录审计日志
    await logAudit({
      userId: user.userId,
      action: 'update_project',
      resource: `project:${projectId}`,
      details: { updates: body },
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return successResponse(project)
  } catch (error) {
    console.error('更新项目失败:', error)
    return errorResponse('更新项目失败', 500)
  }
}

// 删除项目
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

    // 检查权限（只有 OWNER 和超级管理员可以删除）
    const hasPermission = user.role === 'SUPER_ADMIN' || 
      await checkProjectPermission(user.userId, projectId, ['OWNER'])

    if (!hasPermission) {
      return errorResponse('无权删除该项目', 403)
    }

    await prisma.project.delete({
      where: { id: projectId }
    })

    // 记录审计日志
    await logAudit({
      userId: user.userId,
      action: 'delete_project',
      resource: `project:${projectId}`,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return successResponse({ message: '项目已删除' })
  } catch (error) {
    console.error('删除项目失败:', error)
    return errorResponse('删除项目失败', 500)
  }
}
