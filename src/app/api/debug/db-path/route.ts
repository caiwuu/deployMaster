/**
 * 调试API - 检查数据库文件路径
 */

import { NextRequest } from 'next/server'
import { successResponse } from '@/lib/middleware'
import path from 'path'
import fs from 'fs'

export async function GET(request: NextRequest) {
  try {
    const cwd = process.cwd()
    const dbPath = path.join(cwd, 'prisma', 'dev.db')
    const exists = fs.existsSync(dbPath)
    const stats = exists ? fs.statSync(dbPath) : null

    return successResponse({
      cwd,
      dbPath,
      exists,
      size: stats?.size,
      modified: stats?.mtime,
      DATABASE_URL: process.env.DATABASE_URL,
    })
  } catch (error: any) {
    return successResponse({
      error: error.message,
    })
  }
}
