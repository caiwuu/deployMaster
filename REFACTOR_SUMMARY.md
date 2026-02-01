# 项目重构总结

## 概述

根据你的需求，已将项目从"环境部署"模式重构为"工作流执行"模式，更符合打包服务器的实际使用场景。

## 核心变更

### 1. 数据模型重构

#### 之前（Environment模式）
- **Environment（环境）**: 包含分支、服务器配置、构建脚本等
- **Server（服务器）**: 每个环境配置多台服务器
- **Deployment（部署）**: 关联环境、分支、commit等

#### 现在（Workflow模式）
- **Project（项目）**: 新增 `workspace` 字段（工作目录路径）
- **Workflow（工作流）**: 包含名称、描述、是否需要审批
- **WorkflowCommand（工作流命令）**: 按顺序执行的命令列表
- **WorkspaceLock（工作区锁）**: 确保同一workspace同时只能运行一个工作流
- **Deployment（部署）**: 简化为只关联项目和工作流

### 2. 核心功能

#### Workspace（工作目录）
- 每个项目配置一个workspace路径（如：`/data/projects/myproject`）
- 执行工作流时会 `cd` 到这个目录
- 必须配置workspace才能创建部署

#### Workflow（工作流）
- 替代原来的"环境"概念
- 包含一系列按顺序执行的命令
- 示例工作流：
  ```
  名称: 构建并部署到生产环境
  命令:
  1. git pull origin main
  2. npm install
  3. npm run build
  4. pm2 restart app
  ```

#### Workspace互斥锁
- **关键特性**: 同一个workspace（项目）只能同时运行一个工作流
- 创建部署时检查是否已有锁
- 部署完成或取消时自动释放锁
- 防止并发执行导致的冲突

### 3. API变更

#### 新增API
- `POST /api/projects/:id/workflows` - 创建工作流
- `GET /api/projects/:id/workflows` - 获取工作流列表
- `GET /api/projects/:id/workflows/:workflowId` - 获取工作流详情
- `PUT /api/projects/:id/workflows/:workflowId` - 更新工作流
- `DELETE /api/projects/:id/workflows/:workflowId` - 删除工作流

#### 修改的API
- `POST /api/projects` - 创建项目时可配置workspace
- `PUT /api/projects/:id` - 更新项目workspace
- `POST /api/deployments` - 简化为只需 `projectId` 和 `workflowId`
- `GET /api/deployments` - 查询参数改为 `workflowId`

#### 移除的API
- `/api/projects/:id/environments/*` - 环境管理相关API

### 4. 前端变更

#### 项目管理
- 创建/编辑项目时添加 **Workspace** 配置字段
- 项目详情页显示工作流列表（替代环境列表）
- 可添加工作流，配置命令序列

#### 部署流程
简化为2步：
1. **选择项目** - 必须已配置workspace
2. **选择工作流** - 显示工作流包含的命令列表

#### 部署详情
- 显示工作目录（workspace）
- 显示工作流命令列表
- 移除分支、commit等Git相关信息

## 使用流程

### 1. 创建项目
```
项目名称: my-web-app
Git仓库: https://github.com/user/repo.git
Workspace: /data/projects/my-web-app  ← 重要！
```

### 2. 添加工作流
```
工作流名称: 生产环境部署
描述: 拉取代码、构建、重启服务
命令:
1. git pull origin main
2. npm install --production
3. npm run build
4. pm2 restart my-web-app
```

### 3. 执行部署
- 选择项目
- 选择工作流
- 点击"开始部署"
- 系统会：
  1. 检查workspace是否被锁定
  2. 创建部署记录并锁定workspace
  3. cd到workspace目录
  4. 按顺序执行命令
  5. 完成后释放锁

## 数据库迁移

已创建新的数据库迁移：
```bash
npx prisma migrate deploy
```

已重置数据库并创建默认管理员账户：
- 邮箱: admin@deploymaster.com
- 密码: admin123456

## 技术细节

### Workspace锁实现
```typescript
// 创建部署时
const existingLock = await prisma.workspaceLock.findUnique({
  where: { projectId }
})

if (existingLock) {
  return error('workspace正在执行其他部署')
}

// 使用事务创建部署和锁
await prisma.$transaction([
  prisma.deployment.create(...),
  prisma.workspaceLock.create(...)
])

// 部署完成/取消时释放锁
await prisma.workspaceLock.delete({
  where: { projectId }
})
```

### 命令执行流程（待实现）
```typescript
// TODO: 实际的命令执行逻辑
async function executeWorkflow(deployment) {
  const { project, workflow } = deployment
  
  // cd到workspace
  process.chdir(project.workspace)
  
  // 按顺序执行命令
  for (const cmd of workflow.commands) {
    await exec(cmd.command)
  }
  
  // 释放锁
  await releaseWorkspaceLock(project.id)
}
```

## 待完成功能

1. **实际的命令执行引擎**
   - 目前只是创建了部署记录
   - 需要实现真正的命令执行逻辑
   - 实时日志输出

2. **错误处理**
   - 命令执行失败时的处理
   - 超时机制
   - 自动重试

3. **日志系统**
   - 实时日志流
   - 日志持久化
   - 日志查看优化

## 注意事项

⚠️ **重要提醒**：
1. Workspace路径必须是打包服务器上的实际路径
2. 确保打包服务器有执行命令的权限
3. 同一workspace不能并发执行，避免冲突
4. 建议为不同环境（生产/测试）配置不同的workspace

## 测试建议

1. 创建一个测试项目，配置workspace
2. 添加简单的工作流（如 `echo "test"`）
3. 尝试同时执行两个部署，验证互斥锁
4. 检查部署详情页是否正确显示工作流信息

---

重构完成时间: 2026-01-31
