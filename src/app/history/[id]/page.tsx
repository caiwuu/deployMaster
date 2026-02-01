/**
 * 部署详情页面
 */

'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import MainLayout from '@/components/MainLayout'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { useAuthStore } from '@/lib/store'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DeploymentDetail {
  id: string
  project: { id: string; name: string; workspace: string | null }
  workflow: { id: string; name: string; description: string | null; commands: Array<{ command: string; sequence: number }> }
  user: { username: string; name: string | null }
  status: string
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  duration?: number
  logs: string | null
  currentUserRole?: string | null // 当前用户在项目中的角色
}

export default function DeploymentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [deployment, setDeployment] = useState<DeploymentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showExecuteDialog, setShowExecuteDialog] = useState(false)
  const [executing, setExecuting] = useState(false)
  const logsRef = useRef<HTMLDivElement>(null)
  const streamControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    loadDeployment()
  }, [params.id])

  // 实时日志流式传输 (Server-Sent Events)
  useEffect(() => {
    if (!deployment) return

    // 如果部署正在运行，则建立 SSE 连接
    const shouldStream = deployment.status === 'RUNNING' || 
                        deployment.status === 'PENDING' || 
                        deployment.status === 'APPROVED'

    if (!shouldStream) {
      // 清理之前的连接
      if (streamControllerRef.current) {
        streamControllerRef.current.abort()
        streamControllerRef.current = null
      }
      return
    }

    // 清理之前的连接
    if (streamControllerRef.current) {
      streamControllerRef.current.abort()
    }

    let accumulatedLogs = deployment.logs || ''

    try {
      // 获取认证 token
      const token = useAuthStore.getState().accessToken
      if (!token) {
        console.warn('未找到认证 token，无法建立日志流')
        return
      }

      // 使用 fetch + ReadableStream 替代 EventSource（支持自定义 headers）
      const controller = new AbortController()
      streamControllerRef.current = controller
      
      fetch(`/api/deployments/${params.id}/logs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      })
        .then(response => {
          if (!response.ok) throw new Error('SSE 连接失败')
          
          const reader = response.body?.getReader()
          const decoder = new TextDecoder()

          if (!reader) return

          const readStream = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value, { stream: true })
                const lines = chunk.split('\n')

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    try {
                      const data = JSON.parse(line.slice(6))
                      
                      if (data.type === 'logs') {
                        accumulatedLogs += data.data
                        setDeployment(prev => prev ? { ...prev, logs: accumulatedLogs } : null)
                        
                        // 自动滚动到底部
                        setTimeout(() => {
                          if (logsRef.current) {
                            logsRef.current.scrollTop = logsRef.current.scrollHeight
                          }
                        }, 50)
                      } else if (data.type === 'complete') {
                        // 部署完成，重新加载完整数据
                        loadDeployment()
                        controller.abort()
                        return
                      } else if (data.type === 'error') {
                        console.error('日志流错误:', data.message)
                        controller.abort()
                        return
                      }
                    } catch {
                      // 忽略解析错误
                    }
                  }
                }
              }
            } catch (error: any) {
              if (error.name !== 'AbortError') {
                console.error('读取日志流失败:', error)
              }
            }
          }

          readStream()
        })
        .catch(error => {
          if (error.name !== 'AbortError') {
            console.error('建立日志流连接失败:', error)
          }
        })

      return () => {
        controller.abort()
        streamControllerRef.current = null
      }
    } catch (error) {
      console.error('初始化日志流失败:', error)
    }
  }, [deployment?.status, params.id])

  // 当日志更新时自动滚动
  useEffect(() => {
    if (logsRef.current && deployment?.logs) {
      // 延迟滚动，确保 DOM 已更新
      setTimeout(() => {
        if (logsRef.current) {
          logsRef.current.scrollTop = logsRef.current.scrollHeight
        }
      }, 100)
    }
  }, [deployment?.logs])

  async function loadDeployment() {
    try {
      const data = await api.deployments.get(params.id as string)
      setDeployment(data)
    } catch (err) {
      console.error('加载部署详情失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      SUCCESS: 'bg-green-100 text-green-700',
      FAILED: 'bg-red-100 text-red-700',
      RUNNING: 'bg-blue-100 text-blue-700 animate-pulse',
      PENDING: 'bg-gray-100 text-gray-700',
      WAITING_APPROVAL: 'bg-yellow-100 text-yellow-700'
    }
    const labels: Record<string, string> = {
      SUCCESS: '✅ 部署成功',
      FAILED: '❌ 部署失败',
      RUNNING: '🔄 部署中',
      PENDING: '⏳ 等待中',
      WAITING_APPROVAL: '⏰ 待审批'
    }
    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </div>
    )
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-'
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}分${secs}秒`
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">加载中...</div>
        </div>
      </MainLayout>
    )
  }

  if (!deployment) {
    return (
      <MainLayout>
        <div className="p-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600">部署记录不存在</p>
            <Button
              onClick={() => router.back()}
              className="mt-4 bg-[#E42313] hover:bg-[#E42313]/90"
            >
              返回
            </Button>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="p-12">
        {/* Header */}
        <div className="mb-8">
          <nav className="text-xs text-gray-500 mb-4">
            <Link href="/history" className="hover:text-gray-700">部署历史</Link> / 部署详情
          </nav>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-4 mb-3">
                <h1 className="text-4xl font-semibold text-gray-900">
                  {deployment.project.name}
                </h1>
                {getStatusBadge(deployment.status)}
              </div>
              <p className="text-sm text-gray-500">
                工作流: {deployment.workflow.name}
              </p>
            </div>
            <div className="flex gap-3">
              {(deployment.status === 'PENDING' || deployment.status === 'APPROVED' || deployment.status === 'FAILED') && (
                <>
                  {/* VIEWER 不能执行部署 */}
                  {deployment.currentUserRole !== 'VIEWER' && (
                    <Button 
                      onClick={() => setShowExecuteDialog(true)}
                      className="bg-[#0066FF] hover:bg-[#0052CC]"
                    >
                      ▶️ 执行部署
                    </Button>
                  )}
                  <Dialog open={showExecuteDialog} onOpenChange={setShowExecuteDialog}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>确认执行部署</DialogTitle>
                        <DialogDescription>
                          确定要执行此部署吗？部署将在工作目录中按顺序执行工作流命令。
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setShowExecuteDialog(false)}
                          disabled={executing}
                        >
                          取消
                        </Button>
                        <Button
                          onClick={async () => {
                            setExecuting(true)
                            try {
                              await api.deployments.execute(deployment.id)
                              setShowExecuteDialog(false)
                              toast.success('部署已开始执行', {
                                description: '日志将实时更新',
                              })
                              // 重新加载部署数据以获取最新状态
                              await loadDeployment()
                            } catch (error: any) {
                              toast.error('执行失败', {
                                description: error.message || '请稍后重试',
                              })
                            } finally {
                              setExecuting(false)
                            }
                          }}
                          disabled={executing}
                          className="bg-[#0066FF] hover:bg-[#0052CC]"
                        >
                          {executing ? '执行中...' : '确认执行'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Deployment Info */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-500 mb-2">操作人</div>
            <div className="text-lg font-medium text-gray-900">@{deployment.user.username}</div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-500 mb-2">工作目录</div>
            <div className="text-sm font-medium text-gray-900 font-mono">
              {deployment.project.workspace || '未配置'}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-500 mb-2">耗时</div>
            <div className="text-lg font-medium text-gray-900">
              {formatDuration(deployment.duration)}
            </div>
          </div>
        </div>

        {/* Workflow Commands */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">工作流命令</h2>
          {deployment.workflow.description && (
            <p className="text-sm text-gray-600 mb-4">{deployment.workflow.description}</p>
          )}
          <div className="space-y-2">
            {deployment.workflow.commands.map((cmd, index) => (
              <div key={cmd.sequence} className="flex items-start gap-3 p-3 bg-gray-50 rounded border border-gray-200">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-700">
                  {index + 1}
                </div>
                <code className="flex-1 text-sm text-gray-900 font-mono">{cmd.command}</code>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">部署时间线</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-24 text-sm text-gray-500">创建时间</div>
              <div className="flex-1 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <div className="text-sm text-gray-900">{formatDate(deployment.createdAt)}</div>
              </div>
            </div>
            {deployment.startedAt && (
              <div className="flex items-center gap-4">
                <div className="w-24 text-sm text-gray-500">开始时间</div>
                <div className="flex-1 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <div className="text-sm text-gray-900">{formatDate(deployment.startedAt)}</div>
                </div>
              </div>
            )}
            {deployment.completedAt && (
              <div className="flex items-center gap-4">
                <div className="w-24 text-sm text-gray-500">完成时间</div>
                <div className="flex-1 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${deployment.status === 'SUCCESS' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div className="text-sm text-gray-900">{formatDate(deployment.completedAt)}</div>
                </div>
              </div>
            )}
          </div>
        </div>


        {/* Deployment Logs */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">部署日志</h2>
          </div>
          <div className="p-6">
            <div 
              ref={logsRef}
              className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-auto max-h-96"
            >
              <pre className="whitespace-pre-wrap">{deployment.logs || '暂无日志'}</pre>
              {(deployment.status === 'RUNNING' || deployment.status === 'PENDING' || deployment.status === 'APPROVED') && (
                <div className="flex items-center gap-2 text-green-400 mt-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs">实时更新中...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
