/**
 * 项目管理 API
 * GET: 获取项目列表
 * POST: 创建新项目
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticate, errorResponse, successResponse, logAudit } from '@/lib/middleware'

// 获取项目列表
export async function GET(request: NextRequest) {
  try {
    // 验证身份
    const auth = await authenticate(request)
    if (!auth.success) {
      return auth.response!
    }

    const user = auth.user!

    // 如果是超级管理员，可以看到所有项目
    if (user.role === 'SUPER_ADMIN') {
      const projects = await prisma.project.findMany({
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
          },
          workflows: {
            select: {
              id: true,
              name: true,
              description: true,
              requireApproval: true,
              commands: {
                orderBy: {
                  sequence: 'asc'
                }
              }
            }
          },
          _count: {
            select: {
              deployments: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      })

      // 为每个项目添加当前用户的角色（SUPER_ADMIN 对所有项目都有权限）
      const projectsWithRole = projects.map(project => {
        const userMember = project.members.find(m => m.userId === user.userId)
        return {
          ...project,
          currentUserRole: userMember?.role || null
        }
      })

      return successResponse(projectsWithRole)
    }

    // 普通用户只能看到自己参与的项目
    const projectMembers = await prisma.projectMember.findMany({
      where: { userId: user.userId },
      include: {
        project: {
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
            },
            workflows: {
              select: {
                id: true,
                name: true,
                description: true,
                requireApproval: true,
                commands: {
                  orderBy: {
                    sequence: 'asc'
                  }
                }
              }
            },
            _count: {
              select: {
                deployments: true
              }
            }
          }
        }
      },
      orderBy: {
        project: {
          updatedAt: 'desc'
        }
      }
    })

    const projects = projectMembers.map(pm => ({
      ...pm.project,
      currentUserRole: pm.role // 添加当前用户在项目中的角色
    }))

    return successResponse(projects)
  } catch (error) {
    console.error('获取项目列表失败:', error)
    return errorResponse('获取项目列表失败', 500)
  }
}

// 创建新项目
export async function POST(request: NextRequest) {
  try {
    // 验证身份
    const auth = await authenticate(request)
    if (!auth.success) {
      return auth.response!
    }

    const user = auth.user!
    
    // 检查权限：只有 SUPER_ADMIN 和 PROJECT_OWNER 可以创建项目
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'PROJECT_OWNER') {
      return errorResponse('无权创建项目', 403)
    }
    
    const body = await request.json()
    const { name, description, repoUrl, repoType, framework, workspace, tags } = body

    // 验证必填字段
    if (!name || !repoUrl) {
      return errorResponse('项目名称和仓库地址不能为空', 400)
    }

    // 创建项目
    const project = await prisma.project.create({
      data: {
        name,
        description,
        repoUrl,
        repoType: repoType || 'git',
        framework,
        workspace,
        tags: tags ? JSON.stringify(tags) : null,
        members: {
          create: {
            userId: user.userId,
            role: 'OWNER' // 创建者自动成为项目所有者
          }
        }
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
      action: 'create_project',
      resource: `project:${project.id}`,
      details: { projectName: name },
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined
    })

    return successResponse(project, 201)
  } catch (error) {
    console.error('创建项目失败:', error)
    return errorResponse('创建项目失败', 500)
  }
}
