/**
 * 部署页面
 */

'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import MainLayout from '@/components/MainLayout'
import { api } from '@/lib/api-client'
import { useAuthStore } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Rocket } from 'lucide-react'

interface Project {
  id: string
  name: string
  workspace: string | null
  currentUserRole?: string | null // 当前用户在项目中的角色
  workflows: Array<{
    id: string
    name: string
    description: string | null
    commands: Array<{ command: string; sequence: number }>
    requireApproval: boolean
  }>
}

function DeployContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user: currentUser } = useAuthStore()
  const preSelectedProjectId = searchParams.get('projectId')

  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState(preSelectedProjectId || '')
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    try {
      const data = await api.projects.list()
      // 过滤掉 VIEWER 角色的项目，VIEWER 不能创建部署
      const deployableProjects = data.filter((project: Project) => {
        // SUPER_ADMIN 可以部署所有项目
        if (currentUser?.role === 'SUPER_ADMIN') {
          return true
        }
        // 项目角色为 VIEWER 的用户不能创建部署
        return project.currentUserRole && project.currentUserRole !== 'VIEWER'
      })
      setProjects(deployableProjects)
      if (preSelectedProjectId && !selectedProjectId) {
        setSelectedProjectId(preSelectedProjectId)
      }
    } catch (err: any) {
      setError(err.message || '加载项目列表失败')
    } finally {
      setLoadingProjects(false)
    }
  }

  async function handleDeploy(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!selectedProjectId || !selectedWorkflowId) {
      setError('请选择项目和工作流')
      return
    }

    const selectedProject = projects.find(p => p.id === selectedProjectId)
    if (!selectedProject?.workspace) {
      setError('该项目未配置workspace，无法部署')
      return
    }

    setLoading(true)

    try {
      const result = await api.deployments.create({
        projectId: selectedProjectId,
        workflowId: selectedWorkflowId
      })

      // 跳转到部署详情页面
      router.push(`/history/${result.deployment.id}`)
    } catch (err: any) {
      setError(err.message || '创建部署失败')
    } finally {
      setLoading(false)
    }
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId)

  if (loadingProjects) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">加载中...</div>
        </div>
      </MainLayout>
    )
  }

  // 如果没有可部署的项目（VIEWER 用户可能没有可部署的项目）
  if (!loadingProjects && projects.length === 0) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-[#F5F5F5] p-12">
          <div className="max-w-[640px]">
            <Card className="p-10 border-[#E8E8E8]">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-[#0D0D0D] mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  无权限部署
                </h2>
                <p className="text-sm text-[#7A7A7A] mb-6">
                  您没有权限部署任何项目。只有项目成员（非查看者）可以创建部署。
                </p>
                <Button
                  variant="outline"
                  onClick={() => router.push('/projects')}
                  className="border-[#E8E8E8] text-[#0D0D0D]"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  返回项目列表
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#F5F5F5] p-12">
        {/* Header */}
        <div className="mb-12">
          <div className="text-xs text-[#7A7A7A] mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
            项目管理 / {selectedProject?.name || '选择项目'} / 部署
          </div>
          <h1 className="text-[40px] font-semibold text-[#0D0D0D] leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            部署 {selectedProject?.name || ''}
          </h1>
        </div>

        {/* Deploy Form */}
        <div className="max-w-[640px]">
          <Card className="p-10 border-[#E8E8E8]">
            <form onSubmit={handleDeploy} className="space-y-8">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Step 1: 选择项目 */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-[#E42313] flex items-center justify-center">
                    <span className="text-white text-base font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      1
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-[#0D0D0D]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    选择项目
                  </h2>
                </div>
                <Select
                  value={selectedProjectId}
                  onValueChange={(value) => {
                    setSelectedProjectId(value)
                    setSelectedWorkflowId('')
                  }}
                >
                  <SelectTrigger className="border-[#E8E8E8] bg-[#FAFAFA] text-[#0D0D0D]">
                    <SelectValue placeholder="请选择项目" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 2: 选择工作流 */}
              {selectedProject && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#E42313] flex items-center justify-center">
                      <span className="text-white text-base font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        2
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-[#0D0D0D]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      选择工作流
                    </h2>
                  </div>
                  
                  {!selectedProject.workspace && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                      该项目未配置workspace，请先编辑项目添加workspace配置
                    </div>
                  )}
                  
                  {selectedProject.workflows.length === 0 ? (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded text-sm text-gray-600">
                      该项目还没有配置工作流，请先在项目详情页添加工作流
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedProject.workflows.map(workflow => (
                        <button
                          key={workflow.id}
                          type="button"
                          onClick={() => setSelectedWorkflowId(workflow.id)}
                          className={`w-full text-left p-4 border rounded transition-all ${
                            selectedWorkflowId === workflow.id
                              ? 'border-2 border-[#E42313] bg-[#FFF5F5]'
                              : 'border border-[#E8E8E8] hover:border-[#0D0D0D]'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-1 ${
                                selectedWorkflowId === workflow.id
                                  ? 'border-[#E42313]'
                                  : 'border-[#E8E8E8]'
                              }`}>
                                {selectedWorkflowId === workflow.id && (
                                  <div className="w-2 h-2 rounded-full bg-[#E42313]"></div>
                                )}
                              </div>
                              <div>
                                <div className={`text-sm ${selectedWorkflowId === workflow.id ? 'font-semibold' : 'font-medium'} text-[#0D0D0D]`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                                  {workflow.name}
                                </div>
                                {workflow.description && (
                                  <div className="text-xs text-[#7A7A7A] mt-1">
                                    {workflow.description}
                                  </div>
                                )}
                              </div>
                            </div>
                            {workflow.requireApproval && (
                              <Badge className="bg-[#E42313] text-white hover:bg-[#E42313]" style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px' }}>
                                需要审批
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-[#7A7A7A] ml-7">
                            {workflow.commands?.length || 0} 个命令
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-6 border-t border-[#E8E8E8]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1 border-[#E8E8E8] text-[#0D0D0D]"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !selectedProjectId || !selectedWorkflowId || !selectedProject?.workspace}
                  className="flex-1 bg-[#0D0D0D] text-white hover:bg-[#0D0D0D]/90"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  <Rocket className="mr-2 h-4 w-4" />
                  {loading ? '创建中...' : '开始部署'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}

export default function DeployPage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-[#7A7A7A]">加载中...</div>
        </div>
      </MainLayout>
    }>
      <DeployContent />
    </Suspense>
  )
}
