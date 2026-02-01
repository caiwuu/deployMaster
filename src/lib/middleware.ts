/**
 * API 中间件
 * 认证和权限验证
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, extractTokenFromHeader, JWTPayload } from './auth'
import { prisma } from './prisma'

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload
}

/**
 * 认证中间件
 * 验证 JWT Token
 */
export async function authenticate(request: NextRequest): Promise<{
  success: boolean
  user?: JWTPayload
  response?: NextResponse
}> {
  const authHeader = request.headers.get('Authorization')
  const token = extractTokenFromHeader(authHeader)

  if (!token) {
    return {
      success: false,
      response: NextResponse.json({ error: '未提供认证令牌' }, { status: 401 })
    }
  }

  const payload = verifyAccessToken(token)

  if (!payload) {
    return {
      success: false,
      response: NextResponse.json({ error: '无效或过期的令牌' }, { status: 401 })
    }
  }

  // 验证用户是否存在且活跃
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, username: true, role: true, isActive: true }
  })

  if (!user || !user.isActive) {
    return {
      success: false,
      response: NextResponse.json({ error: '用户不存在或已被禁用' }, { status: 401 })
    }
  }

  return {
    success: true,
    user: payload
  }
}

/**
 * 权限验证
 * 检查用户是否有指定角色
 */
export function hasRole(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole)
}

/**
 * 权限中间件
 */
export function requireRoles(allowedRoles: string[]) {
  return async (request: NextRequest, user: JWTPayload): Promise<NextResponse | null> => {
    if (!hasRole(user.role, allowedRoles)) {
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      )
    }
    return null
  }
}

/**
 * 检查项目权限
 */
export async function checkProjectPermission(
  userId: string,
  projectId: string,
  requiredRoles: string[] = ['OWNER', 'ADMIN', 'MEMBER']
): Promise<boolean> {
  const member = await prisma.projectMember.findFirst({
    where: {
      userId,
      projectId,
      role: { in: requiredRoles }
    }
  })

  return !!member
}

/**
 * 记录审计日志
 */
export async function logAudit(params: {
  userId: string
  action: string
  resource: string
  details?: object
  ip?: string
  userAgent?: string
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        details: params.details ? JSON.stringify(params.details) : null,
        ip: params.ip,
        userAgent: params.userAgent,
      }
    })
  } catch (error) {
    console.error('审计日志记录失败:', error)
  }
}

/**
 * 错误响应辅助函数
 */
export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * 成功响应辅助函数
 */
export function successResponse(data: any, status: number = 200) {
  return NextResponse.json({ success: true, data }, { status })
}
