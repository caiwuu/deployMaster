/**
 * 部署执行器
 * 负责在workspace中执行工作流命令
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { prisma } from './prisma'

const execAsync = promisify(exec)

interface ExecutionResult {
  success: boolean
  logs: string
  duration: number
  error?: string
}

/**
 * 执行部署
 */
export async function executeDeployment(deploymentId: string): Promise<ExecutionResult> {
  const startTime = Date.now()
  let logs = ''
  let success = false

  try {
    // 获取部署信息
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        project: true,
        workflow: {
          include: {
            commands: {
              orderBy: {
                sequence: 'asc'
              }
            }
          }
        }
      }
    })

    if (!deployment) {
      throw new Error('部署记录不存在')
    }

    if (!deployment.project.workspace) {
      throw new Error('项目未配置workspace')
    }

    const workspace = deployment.project.workspace
    logs += `[${new Date().toISOString()}] 🚀 开始执行部署\n`
    logs += `[${new Date().toISOString()}] 📁 工作目录: ${workspace}\n`
    logs += `[${new Date().toISOString()}] 🔧 工作流: ${deployment.workflow.name}\n`
    logs += `[${new Date().toISOString()}] 📝 共 ${deployment.workflow.commands.length} 个命令\n`
    logs += `\n`

    // 更新状态为运行中
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
        logs
      }
    })

    // 按顺序执行每个命令
    for (const cmd of deployment.workflow.commands) {
      logs += `[${new Date().toISOString()}] ▶️  执行命令 ${cmd.sequence + 1}: ${cmd.command}\n`
      
      try {
        const { stdout, stderr } = await execAsync(cmd.command, {
          cwd: workspace,
          timeout: 300000, // 5分钟超时
          env: {
            ...process.env,
            DEPLOYMENT_ID: deploymentId,
            PROJECT_NAME: deployment.project.name,
          }
        })

        if (stdout) {
          logs += stdout
        }
        if (stderr) {
          logs += `⚠️  stderr: ${stderr}\n`
        }
        
        logs += `[${new Date().toISOString()}] ✅ 命令 ${cmd.sequence + 1} 执行成功\n\n`
        
        // 实时更新日志
        await prisma.deployment.update({
          where: { id: deploymentId },
          data: { logs }
        })
      } catch (cmdError: any) {
        logs += `[${new Date().toISOString()}] ❌ 命令 ${cmd.sequence + 1} 执行失败\n`
        logs += `错误信息: ${cmdError.message}\n`
        if (cmdError.stdout) logs += `stdout: ${cmdError.stdout}\n`
        if (cmdError.stderr) logs += `stderr: ${cmdError.stderr}\n`
        
        throw new Error(`命令执行失败: ${cmd.command}`)
      }
    }

    const duration = Math.floor((Date.now() - startTime) / 1000)
    logs += `\n[${new Date().toISOString()}] 🎉 部署成功完成！\n`
    logs += `[${new Date().toISOString()}] ⏱️  总耗时: ${duration}秒\n`

    success = true

    // 更新为成功状态并释放锁
    await prisma.$transaction([
      prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          status: 'SUCCESS',
          completedAt: new Date(),
          duration,
          logs
        }
      }),
      prisma.workspaceLock.deleteMany({
        where: {
          projectId: deployment.projectId,
          deploymentId
        }
      })
    ])

    return {
      success: true,
      logs,
      duration
    }

  } catch (error: any) {
    const duration = Math.floor((Date.now() - startTime) / 1000)
    logs += `\n[${new Date().toISOString()}] ❌ 部署失败\n`
    logs += `[${new Date().toISOString()}] 错误: ${error.message}\n`

    // 获取deployment信息以释放锁
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId }
    })

    // 更新为失败状态并释放锁
    if (deployment) {
      await prisma.$transaction([
        prisma.deployment.update({
          where: { id: deploymentId },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            duration,
            logs,
            errorMessage: error.message
          }
        }),
        prisma.workspaceLock.deleteMany({
          where: {
            projectId: deployment.projectId,
            deploymentId
          }
        })
      ])
    }

    return {
      success: false,
      logs,
      duration,
      error: error.message
    }
  }
}

/**
 * 异步触发部署执行（不阻塞API响应）
 */
export function triggerDeployment(deploymentId: string) {
  // 在后台执行，不等待完成
  executeDeployment(deploymentId)
    .then((result) => {
      console.log(`✅ 部署 ${deploymentId} 执行${result.success ? '成功' : '失败'}`)
    })
    .catch((error) => {
      console.error(`❌ 部署 ${deploymentId} 执行异常:`, error)
    })
}
