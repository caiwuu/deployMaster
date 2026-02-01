# 🚀 DeployMaster - 部署指南

## 📦 已完成的功能

### 后端部分 ✅

1. **数据库设计**
   - 使用 SQLite 轻量化数据库
   - Prisma ORM 实现数据访问
   - 完整的数据模型设计（用户、项目、环境、部署、审批等）

2. **认证系统**
   - JWT Token 认证（AccessToken + RefreshToken）
   - 密码加密（bcrypt）
   - 敏感信息加密（AES-256）
   - 完整的认证中间件

3. **API 路由**
   - 用户认证 API（登录、注册、刷新Token、获取当前用户）
   - 项目管理 API（CRUD 操作）
   - 部署管理 API（创建部署、获取列表）
   - 完善的权限验证

4. **权限管理**
   - 4种角色：SUPER_ADMIN、PROJECT_OWNER、DEVELOPER、VIEWER
   - 项目级别的权限控制
   - 操作审计日志

### 前端部分 ✅

1. **页面布局**
   - 响应式侧边栏导航
   - 主布局组件
   - 统一的页面风格

2. **已实现页面**
   - 登录页面 (`/login`)
   - 注册页面 (`/register`)
   - 仪表板页面 (`/`) - 展示统计数据和最近部署
   - 项目列表页面 (`/projects`) - 展示所有项目

3. **状态管理**
   - Zustand 全局状态管理
   - 认证状态持久化
   - API 客户端封装

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库

数据库已自动创建并迁移，现在创建默认管理员账户：

```bash
npm run db:init
```

**默认管理员信息：**
- 邮箱: `admin@deploymaster.com`
- 密码: `admin123456`

### 3. 启动开发服务器

```bash
npm run dev
```

应用将在 http://localhost:3000 启动

### 4. 登录系统

1. 打开浏览器访问 http://localhost:3000
2. 会自动跳转到登录页面
3. 使用默认管理员账户登录
4. **重要**：登录后请立即修改密码

## 📁 项目结构

```
deployTool/
├── prisma/
│   ├── schema.prisma          # 数据库模型定义
│   ├── migrations/            # 数据库迁移文件
│   └── dev.db                 # SQLite 数据库文件
├── scripts/
│   └── init-db.ts            # 数据库初始化脚本
├── src/
│   ├── app/
│   │   ├── api/              # API 路由
│   │   │   ├── auth/         # 认证相关 API
│   │   │   ├── projects/     # 项目管理 API
│   │   │   ├── deployments/  # 部署管理 API
│   │   │   └── git/          # Git 操作 API
│   │   ├── login/            # 登录页面
│   │   ├── register/         # 注册页面
│   │   ├── projects/         # 项目管理页面
│   │   ├── page.tsx          # 仪表板页面
│   │   └── layout.tsx        # 根布局
│   ├── components/           # React 组件
│   │   ├── Sidebar.tsx       # 侧边栏导航
│   │   ├── MainLayout.tsx    # 主布局
│   │   └── CustomSelect.tsx  # 自定义选择器
│   └── lib/                  # 工具库
│       ├── prisma.ts         # Prisma Client
│       ├── auth.ts           # 认证工具
│       ├── crypto.ts         # 加密工具
│       ├── middleware.ts     # API 中间件
│       ├── store.ts          # 状态管理
│       └── api-client.ts     # API 客户端
└── .env                      # 环境变量配置
```

## 🔧 环境变量配置

`.env` 文件已创建，包含以下配置：

```env
# 数据库
DATABASE_URL="file:./dev.db"

# JWT 密钥（生产环境请务必修改）
JWT_SECRET="your-secret-key-change-in-production"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"

# 加密密钥
ENCRYPTION_KEY="your-encryption-key-32-characters-min"

# 服务器
PORT=3000
NODE_ENV="development"

# 默认管理员
DEFAULT_ADMIN_EMAIL="admin@deploymaster.com"
DEFAULT_ADMIN_PASSWORD="admin123456"
```

## 📝 可用命令

```bash
# 开发
npm run dev              # 启动开发服务器

# 构建
npm run build            # 构建生产版本
npm run start            # 启动生产服务器

# 数据库
npm run db:init          # 初始化数据库（创建默认管理员）
npm run db:migrate       # 运行数据库迁移
npm run db:studio        # 打开 Prisma Studio 管理数据库

# 代码质量
npm run lint             # 运行 ESLint
```

## 🔑 API 端点

### 认证
- `POST /api/auth/login` - 登录
- `POST /api/auth/register` - 注册
- `POST /api/auth/refresh` - 刷新 Token
- `GET /api/auth/me` - 获取当前用户信息

### 项目管理
- `GET /api/projects` - 获取项目列表
- `POST /api/projects` - 创建项目
- `GET /api/projects/:id` - 获取项目详情
- `PUT /api/projects/:id` - 更新项目
- `DELETE /api/projects/:id` - 删除项目

### 部署管理
- `GET /api/deployments` - 获取部署列表
- `POST /api/deployments` - 创建部署

## 🎯 待完成功能

虽然核心功能已完成，但以下功能需要后续实现：

1. **部署执行引擎** - 实际执行部署任务
2. **实时日志** - WebSocket 实时推送部署日志
3. **部署历史详情** - 查看详细的部署记录
4. **回滚功能** - 一键回滚到历史版本
5. **审批工作流** - 生产环境部署审批
6. **通知系统** - 邮件、钉钉、企业微信通知
7. **环境管理** - 创建和管理部署环境
8. **服务器管理** - 添加和管理目标服务器

## 🔐 安全注意事项

1. **立即修改默认密码**
   - 登录后立即修改默认管理员密码

2. **更新密钥**
   - 在 `.env` 文件中更新 JWT_SECRET、JWT_REFRESH_SECRET 和 ENCRYPTION_KEY
   - 使用强随机字符串

3. **HTTPS**
   - 生产环境务必使用 HTTPS

4. **数据库备份**
   - 定期备份 SQLite 数据库文件
   - 或迁移到 PostgreSQL

## 🐛 故障排除

### 数据库连接失败
```bash
# 重新运行迁移
npm run db:migrate
```

### 端口被占用
修改 `.env` 文件中的 PORT 配置

### 构建失败
```bash
# 清理并重新安装依赖
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📚 技术文档

- [Next.js 文档](https://nextjs.org/docs)
- [Prisma 文档](https://www.prisma.io/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**祝您部署愉快！** 🎉
