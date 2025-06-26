// @ts-nocheck
/**
 * @file __tests__/lib/auth/enhanced-password-security.test.ts
 * @description 增强密码安全模块测试套件
 * @author B团队测试工程师
 * @lastUpdate 2024-12-19
 * @coverage 100%测试覆盖率目标
 */

import {
  EnhancedPasswordSecurity,
  PasswordStrength,
  validatePassword,
  hashPassword,
  verifyPassword,
  generateSecurePassword,
  recordLoginAttempt,
  isAccountLocked,
} from '@/lib/auth/enhanced-password-security';

describe('EnhancedPasswordSecurity', () => {
  let passwordSecurity: EnhancedPasswordSecurity;

  beforeEach(() => {
    passwordSecurity = EnhancedPasswordSecurity.getInstance();
  });

  describe('密码验证', () => {
    it('应该验证强密码', () => {
      const result = validatePassword('StrongP@ssw0rd123');
      
      expect(result.isValid).toBe(true);
      expect(result.strength).toBeGreaterThanOrEqual(PasswordStrength.GOOD);
      expect(result.errors).toHaveLength(0);
    });

    it('应该拒绝弱密码', () => {
      const weakPasswords = [
        'short',
        'nouppercase123',
        'NOLOWERCASE123',
        'NoNumbers',
        'NoSpecial123',
      ];

      weakPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('应该检测常见密码', () => {
      const commonPasswords = ['password', '123456', 'admin', 'qwerty'];
      
      commonPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('不能使用常见密码');
      });
    });

    it('应该检测个人信息', () => {
      const userInfo = {
        email: 'john.doe@example.com',
        name: 'John Doe',
        username: 'johndoe',
      };

      const result = validatePassword('JohnDoe123!', userInfo);
      expect(result.warnings).toContain('密码不应包含个人信息');
    });
  });

  describe('密码哈希和验证', () => {
    it('应该成功哈希密码', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(10);
    });

    it('应该验证正确的密码', async () => {
      const password = 'correct-password';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('应该拒绝错误的密码', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('登录尝试跟踪', () => {
    const userId = 'test-user-123';
    const ip = '192.168.1.100';

    beforeEach(() => {
      // 清理之前的测试数据
      passwordSecurity.unlockAccount(userId, ip);
    });

    it('应该记录成功的登录尝试', () => {
      expect(() => {
        recordLoginAttempt(userId, ip, true, 'test-user-agent');
      }).not.toThrow();
    });

    it('应该记录失败的登录尝试', () => {
      expect(() => {
        recordLoginAttempt(userId, ip, false, 'test-user-agent');
      }).not.toThrow();
    });

    it('应该在多次失败后锁定账户', () => {
      // 记录5次失败尝试
      for (let i = 0; i < 5; i++) {
        recordLoginAttempt(userId, ip, false);
      }
      
      expect(isAccountLocked(userId, ip)).toBe(true);
    });
  });

  describe('安全密码生成', () => {
    it('应该生成指定长度的密码', () => {
      const lengths = [8, 12, 16, 20];
      
      lengths.forEach(length => {
        const password = generateSecurePassword(length);
        expect(password.length).toBe(length);
      });
    });

    it('应该生成包含所有字符类型的密码', () => {
      const password = generateSecurePassword(16);
      
      expect(/[a-z]/.test(password)).toBe(true); // 小写字母
      expect(/[A-Z]/.test(password)).toBe(true); // 大写字母
      expect(/\d/.test(password)).toBe(true);    // 数字
      expect(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)).toBe(true); // 特殊字符
    });

    it('应该生成不同的密码', () => {
      const passwords = new Set();
      
      for (let i = 0; i < 100; i++) {
        passwords.add(generateSecurePassword(12));
      }
      
      // 应该生成至少95%不同的密码
      expect(passwords.size).toBeGreaterThanOrEqual(95);
    });
  });

  describe('安全统计', () => {
    it('应该返回安全统计信息', () => {
      const stats = passwordSecurity.getSecurityStats();
      
      expect(stats).toHaveProperty('totalAttempts');
      expect(stats).toHaveProperty('lockedAccounts');
      expect(stats).toHaveProperty('config');
      expect(typeof stats.totalAttempts).toBe('number');
      expect(typeof stats.lockedAccounts).toBe('number');
      expect(typeof stats.config).toBe('object');
    });
  });
}); 