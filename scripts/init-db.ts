/**
 * 数据库初始化脚本
 * 创建默认管理员账户
 */

import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 开始初始化数据库...')

  // 检查是否已有用户
  const userCount = await prisma.user.count()
  
  if (userCount > 0) {
    console.log('✅ 数据库已初始化，跳过')
    return
  }

  // 创建默认管理员
  const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@deploymaster.com'
  const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123456'

  const hashedPassword = await hashPassword(defaultPassword)

  const admin = await prisma.user.create({
    data: {
      email: defaultEmail,
      username: 'admin',
      password: hashedPassword,
      name: '系统管理员',
      role: 'SUPER_ADMIN',
      isActive: true
    }
  })

  console.log('✅ 默认管理员账户已创建:')
  console.log(`   邮箱: ${defaultEmail}`)
  console.log(`   密码: ${defaultPassword}`)
  console.log(`   用户ID: ${admin.id}`)
  console.log('')
  console.log('⚠️  请在生产环境中及时修改默认密码！')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ 初始化失败:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
