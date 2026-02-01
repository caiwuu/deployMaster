/**
 * 编辑项目页面
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import MainLayout from '@/components/MainLayout'
import { api } from '@/lib/api-client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function EditProjectPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    repoUrl: '',
    framework: '',
    workspace: '',
    tags: '',
    status: 'ACTIVE'
  })

  useEffect(() => {
    loadProject()
  }, [params.id])

  async function loadProject() {
    try {
      const project = await api.projects.get(params.id as string)
      setFormData({
        name: project.name,
        description: project.description || '',
        repoUrl: project.repoUrl,
        framework: project.framework || '',
        workspace: project.workspace || '',
        tags: project.tags ? JSON.parse(project.tags).join(', ') : '',
        status: project.status
      })
    } catch (err: any) {
      setError(err.message || '加载项目失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!formData.name || !formData.repoUrl) {
      setError('项目名称和仓库地址不能为空')
      return
    }

    setSaving(true)

    try {
      const tags = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      await api.projects.update(params.id as string, {
        name: formData.name,
        description: formData.description || undefined,
        repoUrl: formData.repoUrl,
        framework: formData.framework || undefined,
        workspace: formData.workspace || undefined,
        tags,
        status: formData.status
      })

      router.push(`/projects/${params.id}`)
    } catch (err: any) {
      setError(err.message || '更新项目失败')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await api.projects.delete(params.id as string)
      setShowDeleteDialog(false)
      toast.success('项目已删除')
      router.push('/projects')
    } catch (err: any) {
      toast.error('删除项目失败', {
        description: err.message
      })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-[#7A7A7A]">加载中...</div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#F5F5F5] p-12">
        {/* Header */}
        <div className="mb-12">
          <Link 
            href={`/projects/${params.id}`}
            className="inline-flex items-center gap-2 text-xs text-[#7A7A7A] mb-6 hover:text-[#0D0D0D]"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            <ArrowLeft className="h-3 w-3" />
            返回项目详情
          </Link>
          <h1 className="text-[40px] font-semibold text-[#0D0D0D] leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            编辑项目
          </h1>
        </div>

        {/* Form */}
        <div className="max-w-[640px]">
          <Card className="p-10 border-[#E8E8E8]">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-[#0D0D0D]">
                  项目名称 *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="输入项目名称"
                  className="border-[#E8E8E8]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-[#0D0D0D]">
                  项目描述
                </Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="输入项目描述"
                  className="w-full px-3 py-2 border border-[#E8E8E8] rounded-md text-[#0D0D0D] placeholder:text-[#B0B0B0] focus:outline-none focus:ring-2 focus:ring-[#E42313]"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="repoUrl" className="text-sm font-medium text-[#0D0D0D]">
                  Git 仓库地址 *
                </Label>
                <Input
                  id="repoUrl"
                  type="url"
                  value={formData.repoUrl}
                  onChange={(e) => setFormData({ ...formData, repoUrl: e.target.value })}
                  placeholder="https://github.com/username/repo.git"
                  className="border-[#E8E8E8]"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="framework" className="text-sm font-medium text-[#0D0D0D]">
                  框架类型
                </Label>
                <Select
                  value={formData.framework || undefined}
                  onValueChange={(value) => setFormData({ ...formData, framework: value })}
                >
                  <SelectTrigger className="border-[#E8E8E8]">
                    <SelectValue placeholder="请选择框架" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Next.js">Next.js</SelectItem>
                    <SelectItem value="React">React</SelectItem>
                    <SelectItem value="Vue">Vue</SelectItem>
                    <SelectItem value="Node.js">Node.js</SelectItem>
                    <SelectItem value="Spring Boot">Spring Boot</SelectItem>
                    <SelectItem value="Django">Django</SelectItem>
                    <SelectItem value="其他">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="workspace" className="text-sm font-medium text-[#0D0D0D]">
                  工作目录 Workspace *
                </Label>
                <Input
                  id="workspace"
                  value={formData.workspace}
                  onChange={(e) => setFormData({ ...formData, workspace: e.target.value })}
                  placeholder="如: /data/projects/myproject"
                  className="border-[#E8E8E8]"
                  required
                />
                <p className="text-xs text-[#7A7A7A]">部署服务器上的项目工作目录路径，执行命令时会cd到此目录</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium text-[#0D0D0D]">
                  项目状态
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className="border-[#E8E8E8]">
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">运行中</SelectItem>
                    <SelectItem value="INACTIVE">未激活</SelectItem>
                    <SelectItem value="ARCHIVED">已归档</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags" className="text-sm font-medium text-[#0D0D0D]">
                  标签
                </Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="输入标签，用逗号分隔"
                  className="border-[#E8E8E8]"
                />
              </div>

              <div className="flex gap-3 pt-6 border-t border-[#E8E8E8]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="border-[#E8E8E8] text-[#0D0D0D]"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  取消
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeleteDialog(true)}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  删除项目
                </Button>
                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>确认删除项目</DialogTitle>
                      <DialogDescription>
                        确定要删除这个项目吗？此操作不可恢复！所有相关的部署记录、工作流和成员关系都将被删除。
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowDeleteDialog(false)}
                        disabled={deleting}
                      >
                        取消
                      </Button>
                      <Button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {deleting ? '删除中...' : '确认删除'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-[#0D0D0D] text-white hover:bg-[#0D0D0D]/90"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {saving ? '保存中...' : '保存更改'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
