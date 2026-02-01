# 🚀 DeployMaster

> 智能化轻量级部署平台 - 5分钟完成部署配置，让部署像发朋友圈一样简单

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748)](https://www.prisma.io/)
[![SQLite](https://img.shields.io/badge/SQLite-Embedded-003B57)](https://www.sqlite.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## ✨ 特性

- **🎯 轻量级** - 使用 SQLite 数据库，无需安装 MySQL/PostgreSQL，单文件即可运行
- **⚡ 快速部署** - 5分钟完成项目配置，自动识别框架类型
- **🔐 安全可靠** - JWT 认证、权限管理、操作审计、敏感信息加密
- **📊 可视化** - 实时部署日志、数据统计、部署趋势分析
- **🔄 智能回滚** - 一键回滚到任意历史版本
- **👥 团队协作** - 多角色权限管理、审批流程、通知提醒

## 📦 技术栈

- **前端**: Next.js 15 (App Router) + React 19 + Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: SQLite (开发) / PostgreSQL (生产可选)
- **ORM**: Prisma 5
- **认证**: JWT + bcrypt
- **状态管理**: Zustand
- **部署**: Docker / Node.js

## 🚀 快速开始

### 环境要求

- Node.js 20+
- npm 或 yarn

### 安装步骤

1. **克隆仓库**

```bash
git clone <repository-url>
cd deployTool
```

2. **安装依赖**

```bash
npm install
```

3. **初始化数据库**

```bash
# 运行数据库迁移
npm run db:migrate

# 创建默认管理员账户
npm run db:init
```

4. **启动开发服务器**

```bash
npm run dev
```

5. **访问应用**

打开浏览器访问 [http://localhost:3000](http://localhost:3000)

### 默认管理员账户

```
邮箱: admin@deploymaster.com
密码: admin123456
```

⚠️ **重要**: 请在首次登录后立即修改默认密码！

## 📖 使用指南

### 1. 登录系统

使用默认管理员账户或注册新账户登录系统。

### 2. 创建项目

- 点击"新建项目"按钮
- 填写项目信息（名称、Git 仓库地址等）
- 系统会自动识别项目框架类型

### 3. 配置环境

- 为项目创建不同的部署环境（开发、测试、生产等）
- 配置服务器信息（SSH 连接）
- 设置环境变量
- 编写部署脚本

### 4. 执行部署

- 选择要部署的项目和环境
- 选择分支和提交
- 点击"开始部署"
- 实时查看部署日志

### 5. 查看历史

- 查看所有部署记录
- 对比不同版本的变更
- 一键回滚到历史版本

## 🛠️ 可用命令

```bash
# 开发
npm run dev              # 启动开发服务器

# 构建
npm run build            # 构建生产版本
npm run start            # 启动生产服务器

# 数据库
npm run db:migrate       # 运行数据库迁移
npm run db:init          # 初始化数据库（创建默认管理员）
npm run db:studio        # 打开 Prisma Studio 可视化管理数据库

# 代码质量
npm run lint             # 运行 ESLint
```

## 🔧 配置

### 环境变量

复制 `.env.example` 为 `.env` 并根据需要修改：

```env
# 数据库
DATABASE_URL="file:./dev.db"

# JWT 密钥（生产环境请务必修改）
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"

# 加密密钥（用于加密敏感信息）
ENCRYPTION_KEY="your-encryption-key-32-characters-min"

# 服务器
PORT=3000
NODE_ENV="development"

# 默认管理员
DEFAULT_ADMIN_EMAIL="admin@deploymaster.com"
DEFAULT_ADMIN_PASSWORD="admin123456"
```

## 👥 角色权限

系统内置 4 种角色：

| 角色 | 权限说明 |
|------|---------|
| **超级管理员** (SUPER_ADMIN) | 系统配置、用户管理、所有项目权限 |
| **项目负责人** (PROJECT_OWNER) | 项目 CRUD、部署到所有环境、审批部署 |
| **开发者** (DEVELOPER) | 部署到 dev/test 环境、查看所有日志 |
| **查看者** (VIEWER) | 只能查看项目和部署历史 |

## 📊 项目结构

```
deployTool/
├── prisma/              # 数据库 Schema 和迁移
│   ├── schema.prisma
│   └── migrations/
├── scripts/             # 工具脚本
│   └── init-db.ts      # 数据库初始化
├── src/
│   ├── app/            # Next.js App Router 页面
│   │   ├── api/        # API 路由
│   │   ├── login/      # 登录页面
│   │   ├── register/   # 注册页面
│   │   ├── projects/   # 项目管理
│   │   └── page.tsx    # 仪表板
│   ├── components/     # React 组件
│   │   ├── Sidebar.tsx
│   │   └── MainLayout.tsx
│   └── lib/            # 工具库
│       ├── prisma.ts   # Prisma Client
│       ├── auth.ts     # 认证工具
│       ├── crypto.ts   # 加密工具
│       ├── middleware.ts # API 中间件
│       ├── store.ts    # 状态管理
│       └── api-client.ts # API 客户端
└── public/             # 静态资源
```

## 🔐 安全性

- ✅ JWT Token 认证（Access Token + Refresh Token）
- ✅ 密码使用 bcrypt 加密存储
- ✅ 敏感信息（密码、密钥等）使用 AES-256 加密
- ✅ 完整的操作审计日志
- ✅ RBAC 权限模型
- ✅ API 请求认证和权限验证

## 📝 开发计划

- [x] 用户认证与权限系统
- [x] 项目管理
- [x] 数据库设计
- [x] API 路由
- [x] 前端布局和导航
- [x] 仪表板页面
- [ ] 部署执行引擎
- [ ] 实时日志（WebSocket）
- [ ] 部署历史和回滚
- [ ] 审批工作流
- [ ] 通知系统
- [ ] 灰度发布
- [ ] CI/CD 集成

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT License

## 🙏 致谢

感谢所有开源项目的贡献者！

---

**让部署像发朋友圈一样简单** 🚀
