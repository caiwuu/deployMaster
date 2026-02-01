/**
 * 测试登录功能
 */

import { PrismaClient } from '@prisma/client'
import { verifyPassword } from '../src/lib/auth'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@deploymaster.com'
  const password = 'admin123456'

  console.log('🔍 查找用户:', email)
  
  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user) {
    console.log('❌ 用户不存在')
    return
  }

  console.log('✅ 用户找到:')
  console.log('   ID:', user.id)
  console.log('   Email:', user.email)
  console.log('   Username:', user.username)
  console.log('   Role:', user.role)
  console.log('   Hash (前20字符):', user.password.substring(0, 20) + '...')
  console.log('')

  console.log('🔐 验证密码:', password)
  const isValid = await verifyPassword(password, user.password)
  
  if (isValid) {
    console.log('✅ 密码正确！')
  } else {
    console.log('❌ 密码错误！')
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ 测试失败:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
