/**
 * 系统设置页面
 */

'use client'

import { useState, useEffect } from 'react'
import MainLayout from '@/components/MainLayout'
import { useAuthStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { api } from '@/lib/api-client'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('profile')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // 使用 useEffect 在客户端挂载后设置表单数据，避免 hydration 不匹配
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || ''
      }))
    }
  }, [user])

  const tabs = [
    { id: 'profile', name: '个人资料', icon: '👤' },
    { id: 'security', name: '安全设置', icon: '🔐' },
    { id: 'system', name: '系统设置', icon: '⚙️' }
  ]

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      // 调用API更新用户信息（注意：email不能修改）
      const response = await api.users.update(user!.id, {
        name: formData.name
      })
      
      // 更新本地状态
      const { setAuth, accessToken, refreshToken } = useAuthStore.getState()
      if (accessToken && refreshToken) {
        setAuth(response, accessToken, refreshToken)
      }
      
      setMessage({ type: 'success', text: '个人资料已更新' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '更新失败，请稍后重试' })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'error', text: '两次输入的密码不一致' })
      return
    }

    if (formData.newPassword.length < 6) {
      setMessage({ type: 'error', text: '密码长度至少为 6 位' })
      return
    }

    setSaving(true)

    try {
      // TODO: 实现修改密码的API
      // await api.users.changePassword(user!.id, {
      //   currentPassword: formData.currentPassword,
      //   newPassword: formData.newPassword
      // })
      
      // 暂时模拟成功
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setMessage({ type: 'success', text: '密码已更新' })
      setFormData({ ...formData, currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '更新失败，请稍后重试' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <MainLayout>
      <div className="p-12">
        {/* Header */}
        <div className="mb-8">
          <nav className="text-xs text-gray-500 mb-4">
            首页 / 系统设置
          </nav>
          <div>
            <h1 className="text-4xl font-semibold text-gray-900 mb-2">系统设置</h1>
            <p className="text-sm text-gray-500">管理您的账户和系统配置</p>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Tabs */}
          <div className="w-64">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-red-50 text-red-600 border-l-4 border-red-600'
                      : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent'
                  }`}
                >
                  <span className="text-xl">{tab.icon}</span>
                  <span className="font-medium">{tab.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            {message && (
              <div className={`mb-6 p-4 rounded-lg ${
                message.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-600' 
                  : 'bg-red-50 border border-red-200 text-red-600'
              }`}>
                {message.text}
              </div>
            )}

            {activeTab === 'profile' && (
              <Card className="p-8 border-[#E8E8E8]">
                <h2 className="text-xl font-semibold text-[#0D0D0D] mb-6" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>个人资料</h2>
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-[#0D0D0D]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      用户名
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      value={user?.username}
                      disabled
                      className="bg-[#FAFAFA] border-[#E8E8E8] text-[#7A7A7A]"
                    />
                    <p className="text-xs text-[#7A7A7A]" style={{ fontFamily: 'Inter, sans-serif' }}>用户名不可修改</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[#0D0D0D]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      姓名
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="border-[#E8E8E8] text-[#0D0D0D]"
                      placeholder="请输入姓名"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[#0D0D0D]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      邮箱地址
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      disabled
                      className="bg-[#FAFAFA] border-[#E8E8E8] text-[#7A7A7A]"
                    />
                    <p className="text-xs text-[#7A7A7A]" style={{ fontFamily: 'Inter, sans-serif' }}>邮箱地址不可修改</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-[#0D0D0D]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      角色
                    </Label>
                    <Input
                      id="role"
                      type="text"
                      value={user?.role}
                      disabled
                      className="bg-[#FAFAFA] border-[#E8E8E8] text-[#7A7A7A]"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-[#E42313] hover:bg-[#E42313]/90 text-white"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {saving ? '保存中...' : '保存更改'}
                  </Button>
                </form>
              </Card>
            )}

            {activeTab === 'security' && (
              <Card className="p-8 border-[#E8E8E8]">
                <h2 className="text-xl font-semibold text-[#0D0D0D] mb-6" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>修改密码</h2>
                <form onSubmit={handleChangePassword} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="text-[#0D0D0D]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      当前密码
                    </Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={formData.currentPassword}
                      onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                      className="border-[#E8E8E8] text-[#0D0D0D]"
                      placeholder="请输入当前密码"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-[#0D0D0D]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      新密码
                    </Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      className="border-[#E8E8E8] text-[#0D0D0D]"
                      placeholder="请输入新密码（至少6位）"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-[#0D0D0D]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      确认新密码
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="border-[#E8E8E8] text-[#0D0D0D]"
                      placeholder="再次输入新密码"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-[#E42313] hover:bg-[#E42313]/90 text-white"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {saving ? '保存中...' : '更新密码'}
                  </Button>
                </form>
              </Card>
            )}

            {activeTab === 'system' && (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">系统信息</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <span className="text-sm text-gray-500">系统版本</span>
                    <span className="text-sm font-medium text-gray-900">v1.0.0</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <span className="text-sm text-gray-500">数据库类型</span>
                    <span className="text-sm font-medium text-gray-900">SQLite</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <span className="text-sm text-gray-500">运行环境</span>
                    <span className="text-sm font-medium text-gray-900">Development</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm text-gray-500">部署时间</span>
                    <span className="text-sm font-medium text-gray-900">2024-01-31 10:00:00</span>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">关于 DeployMaster</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    DeployMaster 是一个智能化轻量级部署平台，旨在简化项目部署流程，提供完善的权限管理、部署历史记录和实时日志功能。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
