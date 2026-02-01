/**
 * 新建项目页面
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/MainLayout'
import { api } from '@/lib/api-client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewProjectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    repoUrl: '',
    repoType: 'git',
    framework: '',
    workspace: '',
    tags: ''
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!formData.name || !formData.repoUrl) {
      setError('项目名称和仓库地址不能为空')
      return
    }

    setLoading(true)

    try {
      const tags = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      const result = await api.projects.create({
        name: formData.name,
        description: formData.description || undefined,
        repoUrl: formData.repoUrl,
        repoType: formData.repoType,
        framework: formData.framework || undefined,
        workspace: formData.workspace || undefined,
        tags
      })

      router.push(`/projects/${result.id}`)
    } catch (err: any) {
      setError(err.message || '创建项目失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#F5F5F5] p-12">
        {/* Header */}
        <div className="mb-12">
          <Link 
            href="/projects"
            className="inline-flex items-center gap-2 text-xs text-[#7A7A7A] mb-6 hover:text-[#0D0D0D]"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            <ArrowLeft className="h-3 w-3" />
            返回项目列表
          </Link>
          <h1 className="text-[40px] font-semibold text-[#0D0D0D] leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            新建项目
          </h1>
        </div>

        {/* Form */}
        <div className="max-w-6xl">
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
                <Label htmlFor="tags" className="text-sm font-medium text-[#0D0D0D]">
                  标签
                </Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="输入标签，用逗号分隔，如: frontend, production"
                  className="border-[#E8E8E8]"
                />
                <p className="text-xs text-[#7A7A7A]">多个标签请用逗号分隔</p>
              </div>

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
                  disabled={loading}
                  className="flex-1 bg-[#0D0D0D] text-white hover:bg-[#0D0D0D]/90"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {loading ? '创建中...' : '创建项目'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
