/**
 * 项目详情页面
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import MainLayout from '@/components/MainLayout'
import { api } from '@/lib/api-client'
import { useAuthStore } from '@/lib/store'
import Link from 'next/link'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface ProjectDetail {
  id: string
  name: string
  description: string | null
  repoUrl: string
  framework: string | null
  workspace: string | null
  status: string
  createdAt: string
  currentUserRole?: string | null // 当前用户在项目中的角色
  members: Array<{
    role: string
    user: { id: string; username: string; name: string | null; email: string; avatar: string | null; role: string }
  }>
  workflows: Array<{
    id: string
    name: string
    description: string | null
    commands: Array<{ id: string; command: string; sequence: number }>
    _count: { deployments: number }
  }>
  deployments: Array<{
    id: string
    status: string
    createdAt: string
    duration?: number
    user: { username: string; name: string | null }
    workflow: { name: string; description: string | null }
  }>
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser } = useAuthStore()
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // 添加工作流对话框
  const [showAddWorkflowDialog, setShowAddWorkflowDialog] = useState(false)
  const [showEditWorkflowDialog, setShowEditWorkflowDialog] = useState(false)
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null)
  const [workflowForm, setWorkflowForm] = useState({
    name: '',
    description: '',
    commands: ['']
  })
  const [workflowSaving, setWorkflowSaving] = useState(false)
  const [deletingWorkflowId, setDeletingWorkflowId] = useState<string | null>(null)
  const [showDeleteWorkflowDialog, setShowDeleteWorkflowDialog] = useState(false)
  const [workflowToDelete, setWorkflowToDelete] = useState<{ id: string; name: string } | null>(null)
  
  // 添加成员对话框
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false)
  const [memberForm, setMemberForm] = useState({
    userId: '',
    role: 'MEMBER'
  })
  const [memberSaving, setMemberSaving] = useState(false)
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [showDeleteMemberDialog, setShowDeleteMemberDialog] = useState(false)
  const [memberToDelete, setMemberToDelete] = useState<{ userId: string; userName: string } | null>(null)
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null)

  useEffect(() => {
    loadProject()
  }, [params.id])

  useEffect(() => {
    // 只有 SUPER_ADMIN 或项目的 OWNER/ADMIN 可以查看用户列表（用于添加成员）
    if (project && (currentUser?.role === 'SUPER_ADMIN' || project.currentUserRole === 'OWNER' || project.currentUserRole === 'ADMIN')) {
      loadUsers()
    }
  }, [project?.currentUserRole, currentUser?.role])

  async function loadProject() {
    try {
      const data = await api.projects.get(params.id as string)
      setProject(data)
    } catch (err: any) {
      setError(err.message || '加载项目失败')
    } finally {
      setLoading(false)
    }
  }
  
  async function loadUsers() {
    try {
      const data = await api.users.list()
      // API 返回的是 { users: [...], pagination: {...} } 结构
      setAllUsers(data.users || [])
    } catch (err: any) {
      // 如果是权限错误，静默处理（用户可能没有权限查看用户列表）
      if (err.status === 403) {
        console.log('当前用户无权查看用户列表')
        setAllUsers([])
      } else {
        console.error('加载用户列表失败:', err)
        setAllUsers([])
      }
    }
  }
  
  async function handleAddWorkflow() {
    if (!workflowForm.name) {
      toast.error('请填写工作流名称')
      return
    }
    
    const validCommands = workflowForm.commands.filter(cmd => cmd.trim())
    if (validCommands.length === 0) {
      toast.error('请至少添加一个命令')
      return
    }
    
    setWorkflowSaving(true)
    try {
      await api.workflows.create(params.id as string, {
        name: workflowForm.name,
        description: workflowForm.description || undefined,
        commands: validCommands
      })
      
      setShowAddWorkflowDialog(false)
      setWorkflowForm({ name: '', description: '', commands: [''] })
      toast.success('工作流添加成功')
      await loadProject()
    } catch (err: any) {
      toast.error('添加工作流失败', {
        description: err.message
      })
    } finally {
      setWorkflowSaving(false)
    }
  }

  function openEditWorkflowDialog(workflow: any) {
    setEditingWorkflowId(workflow.id)
    setWorkflowForm({
      name: workflow.name,
      description: workflow.description || '',
      commands: workflow.commands.length > 0 
        ? workflow.commands.map((cmd: any) => cmd.command || cmd)
        : ['']
    })
    setShowEditWorkflowDialog(true)
  }

  async function handleUpdateWorkflow() {
    if (!workflowForm.name) {
      toast.error('请填写工作流名称')
      return
    }
    
    const validCommands = workflowForm.commands.filter(cmd => cmd.trim())
    if (validCommands.length === 0) {
      toast.error('请至少添加一个命令')
      return
    }
    
    if (!editingWorkflowId) return
    
    setWorkflowSaving(true)
    try {
      await api.workflows.update(params.id as string, editingWorkflowId, {
        name: workflowForm.name,
        description: workflowForm.description || undefined,
        commands: validCommands
      })
      
      setShowEditWorkflowDialog(false)
      setEditingWorkflowId(null)
      setWorkflowForm({ name: '', description: '', commands: [''] })
      toast.success('工作流更新成功')
      await loadProject()
    } catch (err: any) {
      toast.error('更新工作流失败', {
        description: err.message
      })
    } finally {
      setWorkflowSaving(false)
    }
  }

  function confirmDeleteWorkflow(workflow: any) {
    setWorkflowToDelete({ id: workflow.id, name: workflow.name })
    setShowDeleteWorkflowDialog(true)
  }

  async function handleDeleteWorkflow() {
    if (!workflowToDelete) return
    
    setDeletingWorkflowId(workflowToDelete.id)
    try {
      await api.workflows.delete(params.id as string, workflowToDelete.id)
      setShowDeleteWorkflowDialog(false)
      setWorkflowToDelete(null)
      toast.success('工作流已删除')
      await loadProject()
    } catch (err: any) {
      toast.error('删除工作流失败', {
        description: err.message
      })
    } finally {
      setDeletingWorkflowId(null)
    }
  }
  
  async function handleAddMember() {
    if (!memberForm.userId) {
      toast.error('请选择用户')
      return
    }
    
    setMemberSaving(true)
    try {
      await api.projects.addMember(params.id as string, {
        userId: memberForm.userId,
        role: memberForm.role
      })
      
      setShowAddMemberDialog(false)
      setMemberForm({ userId: '', role: 'MEMBER' })
      toast.success('成员添加成功')
      await loadProject()
    } catch (err: any) {
      toast.error('添加成员失败', {
        description: err.message
      })
    } finally {
      setMemberSaving(false)
    }
  }

  function confirmDeleteMember(member: any) {
    setMemberToDelete({ 
      userId: member.user.id, 
      userName: member.user.name || member.user.username 
    })
    setShowDeleteMemberDialog(true)
  }

  async function handleDeleteMember() {
    if (!memberToDelete) return
    
    setDeletingMemberId(memberToDelete.userId)
    try {
      await api.projects.removeMember(params.id as string, memberToDelete.userId)
      setShowDeleteMemberDialog(false)
      setMemberToDelete(null)
      toast.success('成员已删除')
      await loadProject()
    } catch (err: any) {
      toast.error('删除成员失败', {
        description: err.message
      })
    } finally {
      setDeletingMemberId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      SUCCESS: 'bg-green-100 text-green-700',
      FAILED: 'bg-red-100 text-red-700',
      RUNNING: 'bg-blue-100 text-blue-700',
      PENDING: 'bg-gray-100 text-gray-700',
      WAITING_APPROVAL: 'bg-yellow-100 text-yellow-700'
    }
    const labels: Record<string, string> = {
      SUCCESS: '成功',
      FAILED: '失败',
      RUNNING: '运行中',
      PENDING: '等待中',
      WAITING_APPROVAL: '待审批'
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    )
  }

  const formatDate = (date: string) => {
    const now = new Date()
    const deployDate = new Date(date)
    const diffInSeconds = Math.floor((now.getTime() - deployDate.getTime()) / 1000)
    
    if (diffInSeconds < 60) return `${diffInSeconds}秒前`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`
    return `${Math.floor(diffInSeconds / 86400)}天前`
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

  if (error || !project) {
    return (
      <MainLayout>
        <div className="p-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600">{error || '项目不存在'}</p>
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
            <Link href="/projects" className="hover:text-gray-700">项目管理</Link> / {project.name}
          </nav>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-4xl font-semibold text-gray-900 mb-2">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-gray-500">{project.description}</p>
              )}
            </div>
            <div className="flex gap-3">
              {/* 只有 OWNER 和 ADMIN 可以编辑项目 */}
              {(currentUser?.role === 'SUPER_ADMIN' || project.currentUserRole === 'OWNER' || project.currentUserRole === 'ADMIN') && (
                <Button
                  variant="outline"
                  asChild
                >
                  <Link href={`/projects/${project.id}/edit`}>
                    编辑项目
                  </Link>
                </Button>
              )}
              {/* VIEWER 不能创建部署 */}
              {project.currentUserRole !== 'VIEWER' && (
                <Button
                  asChild
                  className="bg-[#E42313] hover:bg-[#E42313]/90"
                >
                  <Link href={`/deploy?projectId=${project.id}`}>
                    🚀 部署项目
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Project Info */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-500 mb-2">仓库地址</div>
            <div className="text-sm text-gray-900 truncate">{project.repoUrl}</div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-500 mb-2">框架类型</div>
            <div className="text-sm text-gray-900">{project.framework || '未指定'}</div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-500 mb-2">项目状态</div>
            <div className="text-sm text-gray-900">{project.status}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Workflows */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">工作流</h2>
              {/* 只有 OWNER 和 ADMIN 可以添加工作流 */}
              {(currentUser?.role === 'SUPER_ADMIN' || project.currentUserRole === 'OWNER' || project.currentUserRole === 'ADMIN') && (
                <Button
                  variant="ghost"
                  onClick={() => setShowAddWorkflowDialog(true)}
                  className="text-[#E42313] hover:text-[#E42313]/80 hover:bg-[#E42313]/5"
                >
                  + 添加工作流
                </Button>
              )}
            </div>
            <div className="divide-y divide-gray-200">
              {project.workflows.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  暂无工作流配置
                </div>
              ) : (
                project.workflows.map((workflow) => (
                  <div key={workflow.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{workflow.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {workflow.description || '无描述'} · {workflow._count.deployments} 次部署
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-700">
                          {workflow.commands.length} 个命令
                        </span>
                        {/* 只有 OWNER 和 ADMIN 可以编辑工作流 */}
                        {(currentUser?.role === 'SUPER_ADMIN' || project.currentUserRole === 'OWNER' || project.currentUserRole === 'ADMIN') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditWorkflowDialog(workflow)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            编辑
                          </Button>
                        )}
                        {/* 只有 OWNER 可以删除工作流 */}
                        {(currentUser?.role === 'SUPER_ADMIN' || project.currentUserRole === 'OWNER') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => confirmDeleteWorkflow(workflow)}
                            disabled={deletingWorkflowId === workflow.id}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            删除
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Members */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">项目成员</h2>
              {/* 只有 SUPER_ADMIN 或项目的 OWNER/ADMIN 可以添加成员 */}
              {(currentUser?.role === 'SUPER_ADMIN' || project?.currentUserRole === 'OWNER' || project?.currentUserRole === 'ADMIN') && (
                <Button
                  variant="ghost"
                  onClick={() => setShowAddMemberDialog(true)}
                  className="text-[#E42313] hover:text-[#E42313]/80 hover:bg-[#E42313]/5"
                >
                  + 添加成员
                </Button>
              )}
            </div>
            <div className="divide-y divide-gray-200">
              {project.members.map((member) => (
                <div key={member.user.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-900 text-white text-sm flex items-center justify-center font-medium">
                      {member.user.name?.[0] || member.user.username[0]}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {member.user.name || member.user.username}
                      </div>
                      <div className="text-xs text-gray-500">{member.user.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
                        {member.role}
                      </span>
                      {/* 只有 SUPER_ADMIN 或项目的 OWNER/ADMIN 可以删除成员，且不能删除项目所有者 */}
                      {(currentUser?.role === 'SUPER_ADMIN' || project.currentUserRole === 'OWNER' || project.currentUserRole === 'ADMIN') && 
                       member.role !== 'OWNER' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => confirmDeleteMember(member)}
                          disabled={deletingMemberId === member.user.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {deletingMemberId === member.user.id ? '删除中...' : '删除'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Deployments */}
        <div className="mt-8 bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">最近部署</h2>
            <Link
              href={`/history?projectId=${project.id}`}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              查看全部 →
            </Link>
          </div>
          <div className="divide-y divide-gray-200">
            {project.deployments.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                暂无部署记录
              </div>
            ) : (
              project.deployments.map((deployment) => (
                <Link
                  key={deployment.id}
                  href={`/history/${deployment.id}`}
                  className="block px-6 py-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        {deployment.workflow.name}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        部署于 {formatDate(deployment.createdAt)} by {deployment.user.name || deployment.user.username}
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(deployment.status)}
                      {deployment.duration && (
                        <div className="text-xs text-gray-500 mt-1">
                          耗时 {deployment.duration}秒
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
        
        {/* 添加工作流对话框 */}
        <Dialog open={showAddWorkflowDialog} onOpenChange={setShowAddWorkflowDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>添加工作流</DialogTitle>
              <DialogDescription>为项目添加新的工作流，配置要执行的命令序列</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workflow-name">工作流名称 *</Label>
                <Input
                  id="workflow-name"
                  value={workflowForm.name}
                  onChange={(e) => setWorkflowForm({ ...workflowForm, name: e.target.value })}
                  placeholder="如：构建并部署到生产环境"
                  className="border-[#E8E8E8]"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="workflow-desc">工作流描述</Label>
                <Input
                  id="workflow-desc"
                  value={workflowForm.description}
                  onChange={(e) => setWorkflowForm({ ...workflowForm, description: e.target.value })}
                  placeholder="简要描述这个工作流的用途"
                  className="border-[#E8E8E8]"
                />
              </div>
              
              <div className="space-y-2">
                <Label>命令列表 *</Label>
                <p className="text-xs text-gray-500 mb-2">将会在workspace目录下按顺序执行这些命令</p>
                {workflowForm.commands.map((cmd, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={cmd}
                      onChange={(e) => {
                        const newCommands = [...workflowForm.commands]
                        newCommands[index] = e.target.value
                        setWorkflowForm({ ...workflowForm, commands: newCommands })
                      }}
                      placeholder={`命令 ${index + 1}，如: npm install`}
                      className="border-[#E8E8E8]"
                    />
                    {workflowForm.commands.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const newCommands = workflowForm.commands.filter((_, i) => i !== index)
                          setWorkflowForm({ ...workflowForm, commands: newCommands })
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        删除
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setWorkflowForm({ ...workflowForm, commands: [...workflowForm.commands, ''] })}
                  className="w-full"
                >
                  + 添加命令
                </Button>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddWorkflowDialog(false)
                  setWorkflowForm({ name: '', description: '', commands: [''] })
                }}
                disabled={workflowSaving}
              >
                取消
              </Button>
              <Button
                onClick={handleAddWorkflow}
                disabled={workflowSaving}
                className="bg-[#E42313] hover:bg-[#E42313]/90"
              >
                {workflowSaving ? '添加中...' : '添加'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 编辑工作流对话框 */}
        <Dialog open={showEditWorkflowDialog} onOpenChange={setShowEditWorkflowDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>编辑工作流</DialogTitle>
              <DialogDescription>修改工作流配置和命令序列</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-workflow-name">工作流名称 *</Label>
                <Input
                  id="edit-workflow-name"
                  value={workflowForm.name}
                  onChange={(e) => setWorkflowForm({ ...workflowForm, name: e.target.value })}
                  placeholder="如：构建并部署到生产环境"
                  className="border-[#E8E8E8]"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-workflow-desc">工作流描述</Label>
                <Input
                  id="edit-workflow-desc"
                  value={workflowForm.description}
                  onChange={(e) => setWorkflowForm({ ...workflowForm, description: e.target.value })}
                  placeholder="简要描述这个工作流的用途"
                  className="border-[#E8E8E8]"
                />
              </div>
              
              <div className="space-y-2">
                <Label>命令列表 *</Label>
                <p className="text-xs text-gray-500 mb-2">将会在workspace目录下按顺序执行这些命令</p>
                {workflowForm.commands.map((cmd, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={cmd}
                      onChange={(e) => {
                        const newCommands = [...workflowForm.commands]
                        newCommands[index] = e.target.value
                        setWorkflowForm({ ...workflowForm, commands: newCommands })
                      }}
                      placeholder={`命令 ${index + 1}，如: npm install`}
                      className="border-[#E8E8E8]"
                    />
                    {workflowForm.commands.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const newCommands = workflowForm.commands.filter((_, i) => i !== index)
                          setWorkflowForm({ ...workflowForm, commands: newCommands })
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        删除
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setWorkflowForm({ ...workflowForm, commands: [...workflowForm.commands, ''] })}
                  className="w-full"
                >
                  + 添加命令
                </Button>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditWorkflowDialog(false)
                  setEditingWorkflowId(null)
                  setWorkflowForm({ name: '', description: '', commands: [''] })
                }}
                disabled={workflowSaving}
              >
                取消
              </Button>
              <Button
                onClick={handleUpdateWorkflow}
                disabled={workflowSaving}
                className="bg-[#E42313] hover:bg-[#E42313]/90"
              >
                {workflowSaving ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 删除成员确认对话框 */}
        <Dialog open={showDeleteMemberDialog} onOpenChange={setShowDeleteMemberDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认删除成员</DialogTitle>
              <DialogDescription>
                确定要从项目中移除成员 &quot;{memberToDelete?.userName}&quot; 吗？此操作不可恢复。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteMemberDialog(false)
                  setMemberToDelete(null)
                }}
                disabled={deletingMemberId !== null}
              >
                取消
              </Button>
              <Button
                onClick={handleDeleteMember}
                disabled={deletingMemberId !== null}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deletingMemberId ? '删除中...' : '确认删除'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* 删除工作流确认对话框 */}
        <Dialog open={showDeleteWorkflowDialog} onOpenChange={setShowDeleteWorkflowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认删除工作流</DialogTitle>
              <DialogDescription>
                确定要删除工作流 &quot;{workflowToDelete?.name}&quot; 吗？此操作不可恢复。如果该工作流已有部署记录，删除后可能影响历史记录的查看。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteWorkflowDialog(false)
                  setWorkflowToDelete(null)
                }}
                disabled={deletingWorkflowId !== null}
              >
                取消
              </Button>
              <Button
                onClick={handleDeleteWorkflow}
                disabled={deletingWorkflowId !== null}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deletingWorkflowId ? '删除中...' : '确认删除'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 添加成员对话框 */}
        <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加项目成员</DialogTitle>
              <DialogDescription>为项目添加新的成员</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="member-user">选择用户 *</Label>
                {(() => {
                  const availableUsers = allUsers.filter(u => !project?.members.some(m => m.user.id === u.id))
                  if (availableUsers.length === 0) {
                    return (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-500">
                        暂无可添加的用户（所有用户都已是项目成员）
                      </div>
                    )
                  }
                  return (
                    <Select value={memberForm.userId} onValueChange={(value) => setMemberForm({ ...memberForm, userId: value })}>
                      <SelectTrigger className="border-[#E8E8E8]">
                        <SelectValue placeholder="选择用户" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name || u.username} ({u.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                })()}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="member-role">角色 *</Label>
                <Select value={memberForm.role} onValueChange={(value) => setMemberForm({ ...memberForm, role: value })}>
                  <SelectTrigger className="border-[#E8E8E8]">
                    <SelectValue placeholder="选择角色" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OWNER">所有者</SelectItem>
                    <SelectItem value="ADMIN">管理员</SelectItem>
                    <SelectItem value="MEMBER">成员</SelectItem>
                    <SelectItem value="VIEWER">查看者</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowAddMemberDialog(false)}
                disabled={memberSaving}
              >
                取消
              </Button>
              <Button
                onClick={handleAddMember}
                disabled={memberSaving || allUsers.filter(u => !project?.members.some(m => m.user.id === u.id)).length === 0}
                className="bg-[#E42313] hover:bg-[#E42313]/90"
              >
                {memberSaving ? '添加中...' : '添加'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
