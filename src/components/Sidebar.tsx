/**
 * 侧边栏组件
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/store'

const navigation = [
  { name: '首页', href: '/' },
  { name: '项目管理', href: '/projects' },
  { name: '部署中心', href: '/deploy' },
  { name: '部署历史', href: '/history' },
  { name: '权限管理', href: '/users', adminOnly: true },
  { name: '系统设置', href: '/settings' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuthStore()

  const filteredNavigation = navigation.filter(item => {
    if (item.adminOnly) {
      return user?.role === 'SUPER_ADMIN' || user?.role === 'PROJECT_OWNER'
    }
    return true
  })

  return (
    <div className="flex h-screen w-60 flex-col bg-white border-r border-[#E8E8E8]">
      {/* Top Section */}
      <div className="flex-1 flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 px-8 pt-10 pb-12">
          <div className="w-7 h-7 bg-[#E42313] rounded-sm"></div>
          <span className="text-lg font-semibold text-[#0D0D0D]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            DeployMaster
          </span>
        </div>

        {/* Navigation */}
        <nav className="space-y-2 px-8">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 py-3 group"
              >
                <div className={`w-1.5 h-1.5 rounded-full transition-all ${
                  isActive ? 'bg-[#E42313]' : 'bg-transparent'
                }`}></div>
                <span 
                  className={`text-sm transition-all ${
                    isActive 
                      ? 'text-[#0D0D0D] font-medium' 
                      : 'text-[#7A7A7A] font-normal group-hover:text-[#0D0D0D]'
                  }`}
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {item.name}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* User Profile */}
      <div className="border-t border-[#E8E8E8] pt-8 px-8 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-[#0D0D0D] rounded-full flex items-center justify-center text-white text-[13px] font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {user?.name?.[0] || user?.username?.[0] || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[#0D0D0D] truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {user?.name || user?.username || 'Admin'}
            </p>
            <p className="text-[11px] text-[#7A7A7A] truncate" style={{ fontFamily: 'Inter, sans-serif' }}>
              {user?.role === 'SUPER_ADMIN' && '系统管理员'}
              {user?.role === 'PROJECT_OWNER' && '项目负责人'}
              {user?.role === 'DEVELOPER' && '开发者'}
              {user?.role === 'VIEWER' && '查看者'}
              {!user?.role && '系统管理员'}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            useAuthStore.getState().clearAuth()
            window.location.href = '/login'
          }}
          className="w-full py-2 text-[11px] text-[#7A7A7A] bg-gray-100 hover:text-[#E42313] hover:bg-[#E42313]/15 rounded transition-colors"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          退出登录
        </button>
        
        {/* Powered by */}
        <div className="mt-3 pt-3 border-t border-[#E8E8E8]">
          <p className="text-[10px] text-[#7A7A7A] text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
            Powered by{' '}
            <a 
              href="https://github.com/your-username/deployTool" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#E42313] hover:underline"
            >
              DeployMaster
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
