/**
 * 部署历史页面
 */

'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import MainLayout from '@/components/MainLayout'
import { api } from '@/lib/api-client'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChevronDown, Calendar } from 'lucide-react'

interface Deployment {
  id: string
  project: { id: string; name: string }
  workflow: { name: string; description: string | null }
  user: { username: string; name: string | null; avatar: string | null }
  status: string
  createdAt: string
  duration?: number
}

function DeployHistoryContent() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showDateDropdown, setShowDateDropdown] = useState(false)

  useEffect(() => {
    loadDeployments()
  }, [projectId, statusFilter, dateFilter, page])

  async function loadDeployments() {
    try {
      const params: any = { page, pageSize: 20 }
      if (projectId) params.projectId = projectId
      if (statusFilter) params.status = statusFilter
      
      // 处理日期筛选
      if (dateFilter) {
        const now = new Date()
        const startDate = new Date(now.getTime() - parseInt(dateFilter) * 24 * 60 * 60 * 1000)
        params.startDate = startDate.toISOString()
      }

      const data = await api.deployments.list(params)
      setDeployments(data.deployments)
      setTotalPages(data.pagination.totalPages)
    } catch (err: any) {
      setError(err.message || '加载部署历史失败')
    } finally {
      setLoading(false)
    }
  }

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      SUCCESS: '成功',
      FAILED: '失败',
      RUNNING: '部署中',
      PENDING: '等待中',
      WAITING_APPROVAL: '待审批',
      CANCELLED: '已取消',
      ROLLED_BACK: '已回滚'
    }
    return texts[status] || status
  }

  const formatDate = (date: string) => {
    const deployDate = new Date(date)
    return deployDate.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-'
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}m ${secs}s`
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

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      SUCCESS: { bg: 'bg-[#22C55E]/10', text: 'text-[#22C55E]', label: '成功' },
      FAILED: { bg: 'bg-[#EF4444]/10', text: 'text-[#EF4444]', label: '失败' },
      RUNNING: { bg: 'bg-[#3B82F6]/10', text: 'text-[#3B82F6]', label: '部署中' },
      PENDING: { bg: 'bg-[#7A7A7A]/10', text: 'text-[#7A7A7A]', label: '等待中' },
      WAITING_APPROVAL: { bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', label: '待审批' },
      CANCELLED: { bg: 'bg-[#7A7A7A]/10', text: 'text-[#7A7A7A]', label: '已取消' },
      ROLLED_BACK: { bg: 'bg-[#F97316]/10', text: 'text-[#F97316]', label: '已回滚' },
    }
    const c = config[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status }
    return (
      <Badge className={`${c.bg} ${c.text} border-0 hover:${c.bg}`} style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '10px' }}>
        {c.label}
      </Badge>
    )
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#F5F5F5] p-12">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-[40px] font-semibold text-[#0D0D0D] mb-2 leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              部署历史
            </h1>
            <p className="text-sm text-[#7A7A7A]" style={{ fontFamily: 'Inter, sans-serif' }}>
              查看所有部署记录
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Button
                variant="outline"
                className="border-[#E8E8E8] text-[#0D0D0D]"
                style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '12px' }}
                onClick={() => {
                  setShowStatusDropdown(!showStatusDropdown)
                  setShowDateDropdown(false)
                }}
              >
                状态: {statusFilter ? getStatusText(statusFilter) : '全部'}
                <ChevronDown className="ml-2 h-3.5 w-3.5 text-[#7A7A7A]" />
              </Button>
              {showStatusDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E8E8E8] rounded-lg shadow-lg z-10">
                  <button
                    onClick={() => {
                      setStatusFilter('')
                      setShowStatusDropdown(false)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-[#FAFAFA] text-[#0D0D0D]"
                  >
                    全部
                  </button>
                  {['SUCCESS', 'FAILED', 'RUNNING', 'PENDING', 'WAITING_APPROVAL', 'CANCELLED'].map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        setStatusFilter(status)
                        setShowStatusDropdown(false)
                      }}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-[#FAFAFA] text-[#0D0D0D]"
                    >
                      {getStatusText(status)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="relative">
              <Button
                variant="outline"
                className="border-[#E8E8E8] text-[#0D0D0D]"
                style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '12px' }}
                onClick={() => {
                  setShowDateDropdown(!showDateDropdown)
                  setShowStatusDropdown(false)
                }}
              >
                {dateFilter === '7' ? '最近7天' : dateFilter === '30' ? '最近30天' : dateFilter === '90' ? '最近90天' : '所有时间'}
                <Calendar className="ml-2 h-3.5 w-3.5 text-[#7A7A7A]" />
              </Button>
              {showDateDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E8E8E8] rounded-lg shadow-lg z-10">
                  <button
                    onClick={() => {
                      setDateFilter('')
                      setShowDateDropdown(false)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-[#FAFAFA] text-[#0D0D0D]"
                  >
                    所有时间
                  </button>
                  <button
                    onClick={() => {
                      setDateFilter('7')
                      setShowDateDropdown(false)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-[#FAFAFA] text-[#0D0D0D]"
                  >
                    最近7天
                  </button>
                  <button
                    onClick={() => {
                      setDateFilter('30')
                      setShowDateDropdown(false)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-[#FAFAFA] text-[#0D0D0D]"
                  >
                    最近30天
                  </button>
                  <button
                    onClick={() => {
                      setDateFilter('90')
                      setShowDateDropdown(false)
                    }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-[#FAFAFA] text-[#0D0D0D]"
                  >
                    最近90天
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Deployments Table */}
        <Card className="border-[#E8E8E8] overflow-hidden">
          <Table>
            <TableHeader className="bg-[#FAFAFA]">
              <TableRow className="border-b border-[#E8E8E8] hover:bg-[#FAFAFA]">
                <TableHead className="text-[11px] font-semibold text-[#7A7A7A] uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                  部署时间
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-[#7A7A7A] uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                  项目
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-[#7A7A7A] uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                  工作流
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-[#7A7A7A] uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                  部署人
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-[#7A7A7A] uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                  耗时
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-[#7A7A7A] uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                  状态
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deployments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-[#7A7A7A]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    暂无部署记录
                  </TableCell>
                </TableRow>
              ) : (
                deployments.map((deployment) => (
                  <TableRow 
                    key={deployment.id} 
                    className="border-b border-[#E8E8E8] hover:bg-[#FAFAFA] cursor-pointer"
                    onClick={() => window.location.href = `/history/${deployment.id}`}
                  >
                    <TableCell className="text-xs text-[#7A7A7A]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {formatDate(deployment.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/projects/${deployment.project.id}`}
                        className="text-sm font-medium text-[#0D0D0D] hover:text-[#E42313]"
                        style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                      >
                        {deployment.project.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-[#0D0D0D]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {deployment.workflow?.name || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-[#7A7A7A]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {deployment.user.name || deployment.user.username}
                    </TableCell>
                    <TableCell className="text-xs text-[#7A7A7A]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {formatDuration(deployment.duration)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(deployment.status)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-[#7A7A7A]" style={{ fontFamily: 'Inter, sans-serif' }}>
              第 {page} 页，共 {totalPages} 页
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="border-[#E8E8E8] text-[#0D0D0D]"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="border-[#E8E8E8] text-[#0D0D0D]"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}

export default function DeployHistoryPage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">加载中...</div>
        </div>
      </MainLayout>
    }>
      <DeployHistoryContent />
    </Suspense>
  )
}
