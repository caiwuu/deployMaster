/**
 * 登录页面
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

export default function LoginPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.auth.login(email, password)
      setAuth(response.user, response.accessToken, response.refreshToken)
      router.push('/')
    } catch (err: any) {
      setError(err.message || '登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
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

        {/* Login Form */}
        <Card className="p-8 border-[#E8E8E8]">
          <h2 className="text-xl font-semibold text-[#0D0D0D] mb-6" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>登录账号</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#0D0D0D]" style={{ fontFamily: 'Inter, sans-serif' }}>
                邮箱地址
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-[#E8E8E8] text-[#0D0D0D]"
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#0D0D0D]" style={{ fontFamily: 'Inter, sans-serif' }}>
                密码
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-[#E8E8E8] text-[#0D0D0D]"
                placeholder="••••••••"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E42313] hover:bg-[#E42313]/90 text-white"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {loading ? '登录中...' : '登录'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-[#7A7A7A]" style={{ fontFamily: 'Inter, sans-serif' }}>
              还没有账号？{' '}
              <Link href="/register" className="text-[#E42313] hover:text-[#E42313]/80 font-medium">
                立即注册
              </Link>
            </p>
          </div>
        </Card>

        <div className="mt-6 text-center text-xs text-[#7A7A7A]" style={{ fontFamily: 'Inter, sans-serif' }}>
          <p>5 分钟完成部署配置，让部署像发朋友圈一样简单</p>
        </div>
      </div>
    </div>
  )
}
