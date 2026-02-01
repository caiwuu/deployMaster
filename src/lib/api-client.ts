/**
 * API 客户端
 * 封装 fetch 请求，自动处理认证和错误
 */

import { useAuthStore } from './store'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
}

async function request<T = any>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  }

  // 添加认证令牌
  if (!skipAuth) {
    const token = useAuthStore.getState().accessToken
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    } else {
      console.warn('⚠️ API 请求缺少认证令牌:', url)
    }
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new ApiError(
        data.error || '请求失败',
        response.status,
        data
      )
    }

    return data.data !== undefined ? data.data : data
  } catch (error) {
    if (error instanceof ApiError) {
      // 如果是 401 错误，清除认证信息
      if (error.status === 401) {
        useAuthStore.getState().clearAuth()
        // 重定向到登录页
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login'
        }
      }
      throw error
    }
    
    // 网络错误
    throw new ApiError('网络错误，请检查网络连接', 0)
  }
}

// API 方法
export const api = {
  // 认证
  auth: {
    login: (email: string, password: string) =>
      request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipAuth: true,
      }),
    
    register: (data: { email: string; username: string; password: string; name?: string }) =>
      request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
        skipAuth: true,
      }),
    
    me: () => request('/api/auth/me'),
    
    refresh: (refreshToken: string) =>
      request('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
        skipAuth: true,
      }),
  },

  // 项目
  projects: {
    list: () => request('/api/projects'),
    
    get: (id: string) => request(`/api/projects/${id}`),
    
    create: (data: {
      name: string
      description?: string
      repoUrl: string
      repoType?: string
      framework?: string
      workspace?: string
      tags?: string[]
    }) =>
      request('/api/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (id: string, data: any) =>
      request(`/api/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    delete: (id: string) =>
      request(`/api/projects/${id}`, {
        method: 'DELETE',
      }),
    
    // 成员管理
    addMember: (projectId: string, data: { userId: string; role?: string }) =>
      request(`/api/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    removeMember: (projectId: string, userId: string) =>
      request(`/api/projects/${projectId}/members?userId=${userId}`, {
        method: 'DELETE',
      }),
  },

  // 工作流
  workflows: {
    list: (projectId: string) => request(`/api/projects/${projectId}/workflows`),
    
    get: (projectId: string, workflowId: string) => 
      request(`/api/projects/${projectId}/workflows/${workflowId}`),
    
    create: (projectId: string, data: {
      name: string
      description?: string
      requireApproval?: boolean
      commands?: Array<string | { command: string; sequence?: number }>
    }) =>
      request(`/api/projects/${projectId}/workflows`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    update: (projectId: string, workflowId: string, data: any) =>
      request(`/api/projects/${projectId}/workflows/${workflowId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    delete: (projectId: string, workflowId: string) =>
      request(`/api/projects/${projectId}/workflows/${workflowId}`, {
        method: 'DELETE',
      }),
  },

  // 部署
  deployments: {
    list: (params?: {
      projectId?: string
      workflowId?: string
      status?: string
      page?: number
      pageSize?: number
    }) => {
      const query = new URLSearchParams()
      if (params?.projectId) query.set('projectId', params.projectId)
      if (params?.workflowId) query.set('workflowId', params.workflowId)
      if (params?.status) query.set('status', params.status)
      if (params?.startDate) query.set('startDate', params.startDate)
      if (params?.endDate) query.set('endDate', params.endDate)
      if (params?.page) query.set('page', params.page.toString())
      if (params?.pageSize) query.set('pageSize', params.pageSize.toString())
      
      return request(`/api/deployments?${query.toString()}`)
    },
    
    get: (id: string) => request(`/api/deployments/${id}`),
    
    create: (data: {
      projectId: string
      workflowId: string
    }) =>
      request('/api/deployments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    cancel: (id: string) =>
      request(`/api/deployments/${id}/cancel`, {
        method: 'POST',
      }),
    
    execute: (id: string) =>
      request(`/api/deployments/${id}/execute`, {
        method: 'POST',
      }),
  },

  // 用户管理（仅管理员）
  users: {
    list: () => request('/api/users'),
    
    get: (id: string) => request(`/api/users/${id}`),
    
    update: (id: string, data: {
      role?: string
      isActive?: boolean
      name?: string
    }) =>
      request(`/api/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    
    delete: (id: string) =>
      request(`/api/users/${id}`, {
        method: 'DELETE',
      }),
  },
}

export default api
