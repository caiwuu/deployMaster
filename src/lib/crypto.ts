/**
 * 加密工具
 * 用于加密敏感信息（如密码、密钥等）
 */

import CryptoJS from 'crypto-js'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-please-change-in-production-32char'

/**
 * 加密文本
 */
export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString()
}

/**
 * 解密文本
 */
export function decrypt(encryptedText: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY)
    return bytes.toString(CryptoJS.enc.Utf8)
  } catch (error) {
    console.error('解密失败:', error)
    return ''
  }
}

/**
 * 判断字段是否为敏感信息
 */
export function isSensitiveField(fieldName: string): boolean {
  const sensitiveKeywords = [
    'password',
    'secret',
    'token',
    'key',
    'private',
    'credential',
    'apikey',
    'api_key',
  ]

  const lowerFieldName = fieldName.toLowerCase()
  return sensitiveKeywords.some(keyword => lowerFieldName.includes(keyword))
}

/**
 * 加密对象中的敏感字段
 */
export function encryptSensitiveFields<T extends Record<string, any>>(obj: T): T {
  const result = { ...obj }

  for (const key in result) {
    if (isSensitiveField(key) && typeof result[key] === 'string') {
      (result as any)[key] = encrypt(result[key] as string)
    }
  }

  return result
}

/**
 * 解密对象中的敏感字段
 */
export function decryptSensitiveFields<T extends Record<string, any>>(obj: T): T {
  const result = { ...obj }

  for (const key in result) {
    if (isSensitiveField(key) && typeof result[key] === 'string') {
      (result as any)[key] = decrypt(result[key] as string)
    }
  }

  return result
}
