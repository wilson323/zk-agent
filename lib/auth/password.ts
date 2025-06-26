// @ts-nocheck
/**
 * 密码加密和验证
 * 使用bcrypt进行安全的密码处理
 */

import bcrypt from "bcryptjs"

// 密码配置
const PASSWORD_CONFIG = {
  saltRounds: 12, // bcrypt盐轮数
  minLength: 8, // 最小密码长度
  maxLength: 128, // 最大密码长度
}

/**
 * 密码强度验证规则
 */
export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
  strength: "weak" | "medium" | "strong"
}

/**
 * 验证密码强度
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []
  let strength: "weak" | "medium" | "strong" = "weak"

  // 长度检查
  if (password.length < PASSWORD_CONFIG.minLength) {
    errors.push(`密码长度至少${PASSWORD_CONFIG.minLength}位`)
  }
  if (password.length > PASSWORD_CONFIG.maxLength) {
    errors.push(`密码长度不能超过${PASSWORD_CONFIG.maxLength}位`)
  }

  // 复杂度检查
  const hasLowerCase = /[a-z]/.test(password)
  const hasUpperCase = /[A-Z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  let complexityScore = 0
  if (hasLowerCase) {complexityScore++}
  if (hasUpperCase) {complexityScore++}
  if (hasNumbers) {complexityScore++}
  if (hasSpecialChar) {complexityScore++}

  if (complexityScore < 2) {
    errors.push("密码必须包含至少两种字符类型（大写字母、小写字母、数字、特殊字符）")
  }

  // 计算强度
  if (password.length >= 12 && complexityScore >= 3) {
    strength = "strong"
  } else if (password.length >= 8 && complexityScore >= 2) {
    strength = "medium"
  }

  // 常见密码检查
  const commonPasswords = ["password", "123456", "qwerty", "admin", "letmein"]
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push("不能使用常见密码")
    strength = "weak"
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  }
}

/**
 * 加密密码
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const salt = await bcrypt.genSalt(PASSWORD_CONFIG.saltRounds)
    return await bcrypt.hash(password, salt)
  } catch (error) {
    console.error("密码加密失败:", error)
    throw new Error("密码加密失败")
  }
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hashedPassword)
  } catch (error) {
    console.error("密码验证失败:", error)
    return false
  }
}

/**
 * 生成随机密码
 */
export function generateRandomPassword(length = 12): string {
  const lowercase = "abcdefghijklmnopqrstuvwxyz"
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const numbers = "0123456789"
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?"

  const allChars = lowercase + uppercase + numbers + symbols
  let password = ""

  // 确保至少包含每种字符类型
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]

  // 填充剩余长度
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  // 打乱字符顺序
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("")
}
