/**
 * 获取项目 Git 分支列表 API
 * GET: 通过 cd 到 workspace 执行 git 命令获取分支列表
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticate, errorResponse, successResponse } from '@/lib/middleware'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request)
    if (!auth.success) {
      return auth.response!
    }

    const { id: projectId } = await params
    const user = auth.user!

    // 获取项目信息
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return errorResponse('项目不存在', 404)
    }

    // 检查权限
    if (user.role !== 'SUPER_ADMIN') {
      const { checkProjectPermission } = await import('@/lib/middleware')
      const hasPermission = await checkProjectPermission(
        user.userId,
        projectId,
        ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']
      )
      if (!hasPermission) {
        return errorResponse('无权访问该项目', 403)
      }
    }

    // 检查 workspace 是否存在
    if (!project.workspace) {
      return errorResponse('项目未配置 workspace', 400)
    }

    try {
      // 执行 git branch -a 获取所有分支（包括远程分支）
      const { stdout } = await execAsync('git branch -a', {
        cwd: project.workspace,
        timeout: 10000 // 10秒超时
      })

      // 解析分支列表
      const branches = stdout
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('*'))
        .map(line => {
          // 移除前缀：remotes/origin/ 或 remotes/
          if (line.startsWith('remotes/origin/')) {
            return line.replace('remotes/origin/', '')
          }
          if (line.startsWith('remotes/')) {
            return line.replace('remotes/', '')
          }
          return line
        })
        .filter((branch, index, self) => {
          // 去重并过滤掉 HEAD
          return branch && branch !== 'HEAD' && self.indexOf(branch) === index
        })
        .sort()

      // 获取当前分支
      let currentBranch = 'main'
      try {
        const { stdout: currentBranchOutput } = await execAsync('git branch --show-current', {
          cwd: project.workspace,
          timeout: 5000
        })
        currentBranch = currentBranchOutput.trim() || 'main'
      } catch {
        // 如果获取当前分支失败，使用默认值
      }

      return successResponse({
        branches,
        currentBranch
      })
    } catch (error: any) {
      // 如果 git 命令执行失败，可能是目录不存在或不是 git 仓库
      console.error('获取分支列表失败:', error)
      return errorResponse(
        `获取分支列表失败: ${error.message || '请确保 workspace 是有效的 Git 仓库'}`,
        500
      )
    }
  } catch (error) {
    console.error('获取分支列表失败:', error)
    return errorResponse('获取分支列表失败', 500)
  }
}
