import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { Readable } from 'stream'
import { promises as fs } from 'fs'
import * as yaml from 'yaml'
import * as path from 'path'

// ========= config via YAML start =============
const CONFIG_PATH = path.join(process.cwd(), 'config', 'deploy.yaml')

type CommandsConfig = {
  projectPath: string
  commands: Record<string, string[]>
}

let cachedConfig: CommandsConfig | null = null

async function loadConfig(): Promise<CommandsConfig> {
  const raw = await fs.readFile(CONFIG_PATH, 'utf8')
  const parsed = yaml.parse(raw) as CommandsConfig
  if (!parsed || !parsed.projectPath || !parsed.commands) {
    throw new Error('YAML 配置不完整：缺少 projectPath 或 commands')
  }
  return parsed
}

async function getConfig(): Promise<CommandsConfig> {
  if (!cachedConfig) {
    cachedConfig = await loadConfig()
  }
  return cachedConfig
}

function substitutePlaceholders(lines: string[], branch: string, projectPath: string): string[] {
  return lines.map(l =>
    l
      .replace(/\$\{branch\}/g, branch)
      .replace(/\$\{projectPath\}/g, projectPath)
  )
}

function getCmdFromConfig(cmd: string, branch: string, cfg: CommandsConfig): string[] {
  const lines = cfg.commands[cmd]
  if (!lines || lines.length === 0) return []
  return substitutePlaceholders(lines, branch, cfg.projectPath)
}
// ========= config via YAML end ===============

// ========= simple in-process lock start ==========
let isBusy = false

function acquireLock(): boolean {
  if (isBusy) return false
  isBusy = true
  return true
}

function releaseLock() {
  isBusy = false
}
// ========= simple in-process lock end ===========

/**
 * 获取分支信息
 * @param commands 
 * @returns 
 */
async function getBranches(commands: string[], projectPath: string) {
  const branches = await Promise.all(commands.map(command => {
    return new Promise<string[]>((resolve, reject) => {
      const child = exec(command, {
        cwd: projectPath,
      })
      let output = ''

      child.stdout?.on('data', (data: Buffer) => {
        output += data
      })

      child.stderr?.on('data', () => {
        reject(new Error('error'))
      })

      child.on('close', (code: number | null) => {
        if (code !== 0) {
          reject(new Error(`Command failed with code ${code}`))
          return
        }
        resolve(
          output
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.includes('->'))
            .map(line => line.replace('origin/', ''))
        )
      })
    })
  }))
  return NextResponse.json({
    branches: branches[2].flat(),
    currentBranch: branches[0]
  })
}

function dealWithStream(commands: string[], cmd: string, projectPath: string) {
  // 处理checkUpdates命令
  const readable = new Readable({
    read() { }
  })

  let dataBuffer: Array<{ hash?: string, message?: string, author?: string, date?: string } | string> = []
  let currentCommandIndex = 0

  function runNextCommand() {
    if (currentCommandIndex >= commands.length) {
      if (cmd === 'checkUpdates') readable.push(`[COMMITS]${JSON.stringify(dataBuffer)}`)
      releaseLock()
      readable.push(null)
      return
    }

    const rawCommand = commands[currentCommandIndex]
    const trimmed = rawCommand.trim()
    // 直接处理 echo，避免 Windows 在管道下的编码差异
    const echoMatch = /^echo\s+(.+)$/i.exec(trimmed)
    if (echoMatch) {
      readable.push(`[CMD]${rawCommand}\n\n`)
      const message = echoMatch[1]
      readable.push(`${message}\n\n`)
      currentCommandIndex++
      runNextCommand()
      return
    }

    // 跳过 cd（我们用 cwd 控制工作目录）
    if (/^cd\s+/i.test(trimmed)) {
      readable.push(`[CMD]${rawCommand}\n\n`)
      currentCommandIndex++
      runNextCommand()
      return
    }
    // 显示给前端的命令保持为原始命令（不用带 chcp 前缀），并统一以 UTF-8 文本形式输出
    readable.push(`[CMD]${rawCommand}\n\n`)
    const child = exec(rawCommand, {
      cwd: projectPath
    })

    child.stdout?.on('data', (data: Buffer) => {
      // 本地线上差异
      if (cmd === 'checkUpdates' && currentCommandIndex === 3) {
        const dataStr = String(data)
        const lines = dataStr.trim().split('\n').filter(Boolean)
        dataBuffer = dataBuffer.concat(...lines.map((line: string) => JSON.parse(line.replaceAll('\\', '\\\\'))))
      }

      readable.push(data)
    })

    child.stderr?.on('data', (data: Buffer) => {
      readable.push(`[ERR]${data}`)
    })

    child.on('close', (code: number | null) => {
      if (code !== 0) {
        readable.push(`Command failed with code ${code}\n\n`)
        releaseLock()
        readable.push(null)
        return
      }
      currentCommandIndex++
      runNextCommand()
    })
  }
  runNextCommand()
  return new Response(toWebReadableStream(readable), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}


export async function GET(request: NextRequest) {
  try {
    const cfg = await getConfig()
    const projectPath = cfg.projectPath
    const hasAccess = await checkProjectAccess(projectPath)
    if (!hasAccess) {
      return NextResponse.json(
        { error: '项目路径访问失败，请检查路径和权限' },
        { status: 403 }
      )
    }
    const cmd = request.nextUrl.searchParams.get('cmd')
    const branch = request.nextUrl.searchParams.get('branch')
    if (!cmd) return

    const commands = getCmdFromConfig(cmd, branch || '', cfg)
    if (commands.length === 0) {
      return NextResponse.json(
        { error: '命令不存在' },
        { status: 404 }
      )
    }

    let locked = false
    locked = acquireLock()
    if (!locked) {
      return NextResponse.json(
        { error: '有命令正在执行，请稍后再试' },
        { status: 423 }
      )
    }

    // 获取分支信息
    if (cmd === 'getBranches') {
      const resp = await getBranches(commands, projectPath)
      releaseLock()
      return resp
    }

    return dealWithStream(commands, cmd, projectPath)




  } catch {
    releaseLock()
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}


// Convert Readable stream to Web ReadableStream
function toWebReadableStream(nodeStream: Readable): ReadableStream<any> {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk: any) => controller.enqueue(chunk))
      nodeStream.on('end', () => controller.close())
      nodeStream.on('error', (err: unknown) => controller.error(err as any))
    },
    cancel() {
      nodeStream.destroy()
    }
  })
}

async function checkProjectAccess(projectPath: string) {
  try {
    await fs.access(projectPath, fs.constants.R_OK | fs.constants.W_OK)
    return true
  } catch {
    return false
  }
}