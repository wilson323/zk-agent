/**
 * @file Password Utilities
 * @description 密码加密和验证工具
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import bcrypt from 'bcryptjs';
import { getLogger } from '@/lib/utils/logger';

const logger = getLogger();

/**
 * 密码加密轮数
 */
const SALT_ROUNDS = 12;

/**
 * 加密密码
 * @param password 明文密码
 * @returns 加密后的密码哈希
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    logger.debug('密码加密成功');
    return hashedPassword;
  } catch (error) {
    logger.error('密码加密失败:', error);
    throw new Error('密码加密失败');
  }
}

/**
 * 验证密码
 * @param password 明文密码
 * @param hashedPassword 加密后的密码哈希
 * @returns 验证结果
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    const isValid = await bcrypt.compare(password, hashedPassword);
    logger.debug('密码验证完成:', isValid ? '成功' : '失败');
    return isValid;
  } catch (error) {
    logger.error('密码验证过程中发生错误:', error);
    return false;
  }
}

/**
 * 生成随机密码
 * @param length 密码长度，默认12位
 * @returns 随机密码
 */
export function generateRandomPassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  
  logger.debug('生成随机密码，长度:', length);
  return password;
}

/**
 * 验证密码强度
 * @param password 密码
 * @returns 密码强度评分和建议
 */
export function validatePasswordStrength(password: string): {
  score: number;
  isValid: boolean;
  suggestions: string[];
} {
  const suggestions: string[] = [];
  let score = 0;

  // 长度检查
  if (password.length >= 8) {
    score += 1;
  } else {
    suggestions.push('密码长度至少8位');
  }

  // 包含小写字母
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    suggestions.push('包含小写字母');
  }

  // 包含大写字母
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    suggestions.push('包含大写字母');
  }

  // 包含数字
  if (/\d/.test(password)) {
    score += 1;
  } else {
    suggestions.push('包含数字');
  }

  // 包含特殊字符
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
  } else {
    suggestions.push('包含特殊字符');
  }

  const isValid = score >= 4;
  
  logger.debug('密码强度评分:', score, '是否有效:', isValid);
  
  return {
    score,
    isValid,
    suggestions
  };
}