/**
 * 用户管理页面
 */

'use client'

import { useEffect, useState } from 'react'
import MainLayout from '@/components/MainLayout'
import { useAuthStore } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { api } from '@/lib/api-client'

// 模拟用户数据（实际应该从 API 获取）
interface User {
  id: string
  username: string
  name: string | null
  email: string
  role: string
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
}

export default function UsersPage() {
  const { user: currentUser } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  
  // 添加用户对话框
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addForm, setAddForm] = useState({
    email: '',
    username: '',
    password: '',
    name: '',
    role: 'DEVELOPER'
  })
  const [addSaving, setAddSaving] = useState(false)
  
  // 编辑用户对话框
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    role: '',
    isActive: true
  })
  const [editSaving, setEditSaving] = useState(false)
  
  // 删除用户对话框
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setMounted(true)
    loadUsers()
  }, [])
  
  async function loadUsers() {
    try {
      const data = await api.users.list()
      // API 返回的是 { users: [...], pagination: {...} } 结构
      setUsers(data.users || [])
    } catch (err: any) {
      console.error('加载用户列表失败:', err)
      setUsers([]) // 确保即使出错也设置为空数组
    } finally {
      setLoading(false)
    }
  }
  
  async function handleAddUser() {
    if (!addForm.email || !addForm.username || !addForm.password) {
      toast.error('请填写所有必填字段')
      return
    }
    
    setAddSaving(true)
    try {
      await api.auth.register({
        email: addForm.email,
        username: addForm.username,
        password: addForm.password,
        name: addForm.name || addForm.username
      })
      
      // 如果需要设置不同的角色，需要额外调用更新API
      // 这里暂时使用注册时的默认角色
      
      setShowAddDialog(false)
      setAddForm({
        email: '',
        username: '',
        password: '',
        name: '',
        role: 'DEVELOPER'
      })
      toast.success('用户添加成功')
      await loadUsers()
    } catch (err: any) {
      toast.error('添加用户失败', {
        description: err.message
      })
    } finally {
      setAddSaving(false)
    }
  }
  
  function openEditDialog(user: User) {
    setEditUser(user)
    setEditForm({
      name: user.name || '',
      role: user.role,
      isActive: user.isActive
    })
    setShowEditDialog(true)
  }
  
  async function handleEditUser() {
    if (!editUser) return
    
    setEditSaving(true)
    try {
      await api.users.update(editUser.id, {
        name: editForm.name,
        role: editForm.role,
        isActive: editForm.isActive
      })
      
      setShowEditDialog(false)
      setEditUser(null)
      toast.success('用户更新成功')
      await loadUsers()
    } catch (err: any) {
      toast.error('更新用户失败', {
        description: err.message
      })
    } finally {
      setEditSaving(false)
    }
  }

  function openDeleteDialog(user: User) {
    setUserToDelete(user)
    setShowDeleteDialog(true)
  }

  async function handleDeleteUser() {
    if (!userToDelete) return
    
    setDeleting(true)
    try {
      await api.users.delete(userToDelete.id)
      setShowDeleteDialog(false)
      setUserToDelete(null)
      toast.success('用户已删除')
      await loadUsers()
    } catch (err: any) {
      toast.error('删除用户失败', {
        description: err.message
      })
    } finally {
      setDeleting(false)
    }
  }

  const getRoleBadge = (role: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      SUPER_ADMIN: { bg: 'bg-[#E42313]/10', text: 'text-[#E42313]', label: '超级管理员' },
      PROJECT_OWNER: { bg: 'bg-[#3B82F6]/10', text: 'text-[#3B82F6]', label: '项目负责人' },
      DEVELOPER: { bg: 'bg-[#22C55E]/10', text: 'text-[#22C55E]', label: '开发者' },
      VIEWER: { bg: 'bg-[#7A7A7A]/10', text: 'text-[#7A7A7A]', label: '查看者' }
    }
    const c = config[role] || { bg: 'bg-gray-100', text: 'text-gray-600', label: role }
    return (
      <Badge className={`${c.bg} ${c.text} border-0 hover:${c.bg}`} style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '10px' }}>
        {c.label}
      </Badge>
    )
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatLastLogin = (date: string | null) => {
    if (!date) return '从未登录'
    const now = new Date()
    const loginDate = new Date(date)
    const diffInSeconds = Math.floor((now.getTime() - loginDate.getTime()) / 1000)
    
    if (diffInSeconds < 60) return '刚刚'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`
    return `${Math.floor(diffInSeconds / 86400)}天前`
  }

  if (loading || !mounted) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">加载中...</div>
        </div>
      </MainLayout>
    )
  }

  // 检查权限
  if (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'PROJECT_OWNER') {
    return (
      <MainLayout>
        <div className="p-12">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-600">您没有权限访问此页面</p>
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
          <div className="text-xs text-[#7A7A7A] mb-8" style={{ fontFamily: 'Inter, sans-serif' }}>
            首页 / 权限管理
          </div>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[40px] font-semibold text-[#0D0D0D] mb-2 leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                用户管理
              </h1>
              <p className="text-sm text-[#7A7A7A]" style={{ fontFamily: 'Inter, sans-serif' }}>
                管理系统用户和权限
              </p>
            </div>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-[#0D0D0D] text-white hover:bg-[#0D0D0D]/90"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              添加用户
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-6 mb-12">
          <Card className="p-7 border-[#E8E8E8]">
            <div className="text-xs text-[#7A7A7A] mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              总用户数
            </div>
            <div className="text-[36px] font-semibold text-[#0D0D0D] leading-none tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {users.length}
            </div>
          </Card>
          <Card className="p-7 border-[#E8E8E8]">
            <div className="text-xs text-[#7A7A7A] mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              活跃用户
            </div>
            <div className="text-[36px] font-semibold text-[#0D0D0D] leading-none tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {users.filter(u => u.isActive).length}
            </div>
          </Card>
          <Card className="p-7 border-[#E8E8E8]">
            <div className="text-xs text-[#7A7A7A] mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              管理员
            </div>
            <div className="text-[36px] font-semibold text-[#0D0D0D] leading-none tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {users.filter(u => u.role === 'SUPER_ADMIN' || u.role === 'PROJECT_OWNER').length}
            </div>
          </Card>
          <Card className="p-7 border-[#E8E8E8]">
            <div className="text-xs text-[#7A7A7A] mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
              开发者
            </div>
            <div className="text-[36px] font-semibold text-[#0D0D0D] leading-none tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {users.filter(u => u.role === 'DEVELOPER').length}
            </div>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="border-[#E8E8E8] overflow-hidden">
          <Table>
            <TableHeader className="bg-[#FAFAFA]">
              <TableRow className="border-b border-[#E8E8E8] hover:bg-[#FAFAFA]">
                <TableHead className="text-[11px] font-semibold text-[#7A7A7A] uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                  用户
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-[#7A7A7A] uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                  邮箱
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-[#7A7A7A] uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                  角色
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-[#7A7A7A] uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                  状态
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-[#7A7A7A] uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                  最后登录
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-[#7A7A7A] uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                  注册时间
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-[#7A7A7A] uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                  操作
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="border-b border-[#E8E8E8] hover:bg-[#FAFAFA]">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#0D0D0D] rounded-full flex items-center justify-center text-white text-[13px] font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {user.name?.[0] || user.username[0]}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[#0D0D0D]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          {user.name || user.username}
                        </div>
                        <div className="text-xs text-[#7A7A7A]" style={{ fontFamily: 'Inter, sans-serif' }}>
                          @{user.username}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-[#7A7A7A]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {user.email}
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <Badge className="bg-[#22C55E]/10 text-[#22C55E] border-0 hover:bg-[#22C55E]/10" style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '10px' }}>
                        正常
                      </Badge>
                    ) : (
                      <Badge className="bg-[#EF4444]/10 text-[#EF4444] border-0 hover:bg-[#EF4444]/10" style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '10px' }}>
                        禁用
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-[#7A7A7A]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {formatLastLogin(user.lastLoginAt)}
                  </TableCell>
                  <TableCell className="text-xs text-[#7A7A7A]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(user)}
                        className="text-[#E42313] hover:text-[#E42313]/80 hover:bg-[#E42313]/5"
                        style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '12px' }}
                      >
                        编辑
                      </Button>
                      {currentUser?.id !== user.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(user)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '12px' }}
                        >
                          删除
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        
        {/* 添加用户对话框 */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加用户</DialogTitle>
              <DialogDescription>创建新用户账号</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="add-email">邮箱地址 *</Label>
                <Input
                  id="add-email"
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="user@example.com"
                  className="border-[#E8E8E8]"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="add-username">用户名 *</Label>
                <Input
                  id="add-username"
                  value={addForm.username}
                  onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                  placeholder="username"
                  className="border-[#E8E8E8]"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="add-name">姓名</Label>
                <Input
                  id="add-name"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="张三"
                  className="border-[#E8E8E8]"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="add-password">密码 *</Label>
                <Input
                  id="add-password"
                  type="password"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  placeholder="至少6位"
                  className="border-[#E8E8E8]"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="add-role">角色 *</Label>
                <Select value={addForm.role} onValueChange={(value) => setAddForm({ ...addForm, role: value })}>
                  <SelectTrigger className="border-[#E8E8E8]">
                    <SelectValue placeholder="选择角色" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPER_ADMIN">超级管理员</SelectItem>
                    <SelectItem value="PROJECT_OWNER">项目负责人</SelectItem>
                    <SelectItem value="DEVELOPER">开发者</SelectItem>
                    <SelectItem value="VIEWER">查看者</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                disabled={addSaving}
              >
                取消
              </Button>
              <Button
                onClick={handleAddUser}
                disabled={addSaving}
                className="bg-[#E42313] hover:bg-[#E42313]/90"
              >
                {addSaving ? '添加中...' : '添加'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* 编辑用户对话框 */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>编辑用户</DialogTitle>
              <DialogDescription>修改用户信息</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">姓名</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="张三"
                  className="border-[#E8E8E8]"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-role">角色 *</Label>
                <Select value={editForm.role} onValueChange={(value) => setEditForm({ ...editForm, role: value })}>
                  <SelectTrigger className="border-[#E8E8E8]">
                    <SelectValue placeholder="选择角色" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPER_ADMIN">超级管理员</SelectItem>
                    <SelectItem value="PROJECT_OWNER">项目负责人</SelectItem>
                    <SelectItem value="DEVELOPER">开发者</SelectItem>
                    <SelectItem value="VIEWER">查看者</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-status">状态</Label>
                <Select 
                  value={editForm.isActive ? 'active' : 'inactive'} 
                  onValueChange={(value) => setEditForm({ ...editForm, isActive: value === 'active' })}
                >
                  <SelectTrigger className="border-[#E8E8E8]">
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">正常</SelectItem>
                    <SelectItem value="inactive">禁用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                disabled={editSaving}
              >
                取消
              </Button>
              <Button
                onClick={handleEditUser}
                disabled={editSaving}
                className="bg-[#E42313] hover:bg-[#E42313]/90"
              >
                {editSaving ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* 删除用户确认对话框 */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认删除用户</DialogTitle>
              <DialogDescription>
                确定要删除用户 &quot;{userToDelete?.name || userToDelete?.username}&quot; 吗？此操作不可恢复，将删除该用户的所有相关数据。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteDialog(false)
                  setUserToDelete(null)
                }}
                disabled={deleting}
              >
                取消
              </Button>
              <Button
                onClick={handleDeleteUser}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? '删除中...' : '确认删除'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
