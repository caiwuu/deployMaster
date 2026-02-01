/**
 * 项目列表页面
 */

'use client'

import { useEffect, useState } from 'react'
import MainLayout from '@/components/MainLayout'
import { api } from '@/lib/api-client'
import { useAuthStore } from '@/lib/store'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Play, Settings } from 'lucide-react'

interface Project {
  id: string
  name: string
  description: string | null
  repoUrl: string
  framework: string | null
  status: string
  createdAt: string
  _count: { deployments: number }
  workflows: Array<{ id: string; name: string; description: string | null }>
  members: Array<{
    role: string
    user: { id: string; username: string; name: string | null; avatar: string | null }
  }>
}

export default function ProjectsPage() {
  const { user: currentUser } = useAuthStore()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    try {
      const data = await api.projects.list()
      setProjects(data)
    } catch (err: any) {
      setError(err.message || '加载项目失败')
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filter === 'all' || 
      (filter === 'active' && project.status === 'ACTIVE') ||
      (filter === 'inactive' && project.status !== 'ACTIVE')
    return matchesSearch && matchesFilter
  })

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      ACTIVE: { bg: 'bg-[#22C55E]/10', text: 'text-[#22C55E]', label: '运行中' },
      ARCHIVED: { bg: 'bg-[#7A7A7A]/10', text: 'text-[#7A7A7A]', label: '已停止' },
      INACTIVE: { bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', label: '未激活' }
    }
    const c = config[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status }
    return (
      <Badge className={`${c.bg} ${c.text} border-0 hover:${c.bg}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
        {c.label}
      </Badge>
    )
  }

  const getFrameworkColor = (framework: string | null) => {
    const colors: Record<string, string> = {
      'React': '#61DAFB',
      'Vue': '#42B883',
      'Next.js': '#000000',
      'Node.js': '#339933',
    }
    return colors[framework || ''] || '#E42313'
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24))
    if (diffDays === 0) return '今天'
    if (diffDays === 1) return '昨天'
    if (diffDays < 7) return `${diffDays}天前`
    return d.toLocaleDateString('zh-CN')
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
          <div className="text-xs text-[#7A7A7A] mb-8" style={{ fontFamily: 'Inter, sans-serif' }}>
            首页 / 项目管理
          </div>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[40px] font-semibold text-[#0D0D0D] mb-2 leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                项目管理
              </h1>
              <p className="text-sm text-[#7A7A7A]" style={{ fontFamily: 'Inter, sans-serif' }}>
                管理所有部署项目
              </p>
            </div>
            {/* 只有 SUPER_ADMIN 和 PROJECT_OWNER 可以创建项目 */}
            {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'PROJECT_OWNER') && (
              <Button
                asChild
                className="bg-[#0D0D0D] text-white hover:bg-[#0D0D0D]/90"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                <Link href="/projects/new">
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  新建项目
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3 mb-12">
          <div className="relative w-[360px]">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#7A7A7A]" />
            <Input
              placeholder="搜索项目名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-[#E8E8E8] bg-white text-[#0D0D0D] placeholder:text-[#B0B0B0]"
              style={{ fontFamily: 'Inter, sans-serif' }}
            />
          </div>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'bg-[#0D0D0D] text-white' : 'border-[#E8E8E8] text-[#0D0D0D]'}
            style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '12px' }}
          >
            全部项目
          </Button>
          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            onClick={() => setFilter('active')}
            className={filter === 'active' ? 'bg-[#0D0D0D] text-white' : 'border-[#E8E8E8] text-[#0D0D0D]'}
            style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '12px' }}
          >
            运行中
          </Button>
          <Button
            variant={filter === 'inactive' ? 'default' : 'outline'}
            onClick={() => setFilter('inactive')}
            className={filter === 'inactive' ? 'bg-[#0D0D0D] text-white' : 'border-[#E8E8E8] text-[#0D0D0D]'}
            style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '12px' }}
          >
            已停止
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <Card className="border-[#E8E8E8] p-16 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-[#0D0D0D] mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {searchTerm || filter !== 'all' ? '未找到匹配的项目' : '暂无项目'}
            </h3>
            <p className="text-sm text-[#7A7A7A] mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
              {searchTerm || filter !== 'all' ? '尝试调整搜索条件或筛选器' : '创建您的第一个项目开始部署'}
            </p>
            {!searchTerm && filter === 'all' && (
              <Button asChild className="bg-[#0D0D0D] text-white">
                <Link href="/projects/new">创建项目</Link>
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="p-7 border-[#E8E8E8] hover:shadow-lg transition-shadow">
                <div className="space-y-5">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded flex items-center justify-center text-white text-lg font-semibold"
                        style={{ backgroundColor: getFrameworkColor(project.framework) }}
                      >
                        {project.framework?.[0] || 'P'}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-[#0D0D0D]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          {project.name}
                        </h3>
                        {project.framework && (
                          <p className="text-xs text-[#7A7A7A]" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {project.framework}
                          </p>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(project.status)}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-[#7A7A7A] line-clamp-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {project.description || '暂无描述'}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-[#7A7A7A]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <div>部署 {project._count.deployments} 次</div>
                    <div>•</div>
                    <div>{project.workflows?.length || 0} 工作流</div>
                  </div>

                  {/* Last Deploy */}
                  <div className="text-xs text-[#7A7A7A]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    最后部署: {formatDate(project.createdAt)}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1 border-[#E8E8E8] text-[#0D0D0D]"
                      style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '12px' }}
                    >
                      <Link href={`/projects/${project.id}`}>
                        <Settings className="mr-1.5 h-3.5 w-3.5" />
                        配置
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      className="flex-1 bg-[#22C55E] text-white hover:bg-[#22C55E]/90"
                      style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '12px' }}
                    >
                      <Link href={`/deploy?projectId=${project.id}`}>
                        <Play className="mr-1.5 h-3.5 w-3.5" />
                        部署
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
