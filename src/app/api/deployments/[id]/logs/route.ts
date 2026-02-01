/**
 * 部署日志流式传输 API
 * GET: 使用 Server-Sent Events 推送实时日志
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticate, errorResponse } from '@/lib/middleware'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request)
    if (!auth.success) {
      return auth.response!
    }

    const { id: deploymentId } = await params

    // 创建 SSE 响应流
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        
        // 发送初始连接消息
        controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'))

        let lastLogLength = 0
        let isRunning = true

        // 轮询数据库获取最新日志
        const pollInterval = setInterval(async () => {
          try {
            const deployment = await prisma.deployment.findUnique({
              where: { id: deploymentId },
              select: {
                status: true,
                logs: true
              }
            })

            if (!deployment) {
              controller.enqueue(encoder.encode('data: {"type":"error","message":"部署记录不存在"}\n\n'))
              clearInterval(pollInterval)
              controller.close()
              return
            }

            // 如果状态不是运行中，发送最终日志并关闭连接
            if (deployment.status !== 'RUNNING' && deployment.status !== 'PENDING' && deployment.status !== 'APPROVED') {
              if (deployment.logs && deployment.logs.length > lastLogLength) {
                const newLogs = deployment.logs.slice(lastLogLength)
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'logs', data: newLogs })}\n\n`))
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', status: deployment.status })}\n\n`))
              clearInterval(pollInterval)
              controller.close()
              return
            }

            // 发送新增的日志内容
            if (deployment.logs && deployment.logs.length > lastLogLength) {
              const newLogs = deployment.logs.slice(lastLogLength)
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'logs', data: newLogs })}\n\n`))
              lastLogLength = deployment.logs.length
            }

            // 发送心跳保持连接
            controller.enqueue(encoder.encode('data: {"type":"heartbeat"}\n\n'))
          } catch (error) {
            console.error('轮询日志失败:', error)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: '获取日志失败' })}\n\n`))
          }
        }, 500) // 每 500ms 轮询一次

        // 监听客户端断开连接
        request.signal.addEventListener('abort', () => {
          clearInterval(pollInterval)
          controller.close()
        })
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // 禁用 Nginx 缓冲
      }
    })
  } catch (error) {
    console.error('创建日志流失败:', error)
    return errorResponse('创建日志流失败', 500)
  }
}
