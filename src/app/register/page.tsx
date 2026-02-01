/**
 * 注册页面
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { api } from '@/lib/api-client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

export default function RegisterPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    name: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // 验证密码
    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (formData.password.length < 6) {
      setError('密码长度至少为 6 位')
      return
    }

    setLoading(true)

    try {
      const response = await api.auth.register({
        email: formData.email,
        username: formData.username,
        password: formData.password,
        name: formData.name || formData.username
      })
      setAuth(response.user, response.accessToken, response.refreshToken)
      router.push('/')
    } catch (err: any) {
      setError(err.message || '注册失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  function handleChange(field: string, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#E42313] rounded"></div>
            <span className="text-2xl font-semibold text-[#0D0D0D]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>DeployMaster</span>
          </div>
          <p className="text-sm text-[#7A7A7A]" style={{ fontFamily: 'Inter, sans-serif' }}>智能化轻量级部署平台</p>
        </div>

        {/* Register Form */}
        <Card className="p-8 border-[#E8E8E8]">
          <h2 className="text-xl font-semibold text-[#0D0D0D] mb-6" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>创建账号</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#0D0D0D]" style={{ fontFamily: 'Inter, sans-serif' }}>
                邮箱地址 *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="border-[#E8E8E8] text-[#0D0D0D]"
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-[#0D0D0D]" style={{ fontFamily: 'Inter, sans-serif' }}>
                用户名 *
              </Label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => handleChange('username', e.target.value)}
                className="border-[#E8E8E8] text-[#0D0D0D]"
                placeholder="username"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-[#0D0D0D]" style={{ fontFamily: 'Inter, sans-serif' }}>
                姓名（可选）
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="border-[#E8E8E8] text-[#0D0D0D]"
                placeholder="张三"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#0D0D0D]" style={{ fontFamily: 'Inter, sans-serif' }}>
                密码 *
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                className="border-[#E8E8E8] text-[#0D0D0D]"
                placeholder="至少 6 位"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-[#0D0D0D]" style={{ fontFamily: 'Inter, sans-serif' }}>
                确认密码 *
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                className="border-[#E8E8E8] text-[#0D0D0D]"
                placeholder="再次输入密码"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E42313] hover:bg-[#E42313]/90 text-white"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {loading ? '注册中...' : '注册'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-[#7A7A7A]" style={{ fontFamily: 'Inter, sans-serif' }}>
              已有账号？{' '}
              <Link href="/login" className="text-[#E42313] hover:text-[#E42313]/80 font-medium">
                立即登录
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
