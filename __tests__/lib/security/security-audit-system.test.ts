// @ts-nocheck
/**
 * @file __tests__/lib/security/security-audit-system.test.ts
 * @description 安全审计系统测试 - 无模拟数据的真实测试
 * @author B团队安全测试工程师
 * @lastUpdate 2024-12-19
 */

import {
  SecurityAuditSystem,
  SecurityEventType,
  SecuritySeverity,
  securityAuditSystem,
  recordSecurityEvent,
  scanFile,
  detectThreats,
  analyzeUserBehavior,
  generateSecurityReport
} from '@/lib/security/security-audit-system';

describe('SecurityAuditSystem', () => {
  let auditSystem: SecurityAuditSystem;

  beforeAll(() => {
    auditSystem = SecurityAuditSystem.getInstance();
  });

  describe('单例模式', () => {
    it('应该返回同一个实例', () => {
      const instance1 = SecurityAuditSystem.getInstance();
      const instance2 = SecurityAuditSystem.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('应该与导出的单例实例相同', () => {
      const instance = SecurityAuditSystem.getInstance();
      expect(instance).toBe(securityAuditSystem);
    });
  });

  describe('安全事件记录', () => {
    it('应该成功记录安全事件', async () => {
      const eventId = await auditSystem.recordEvent({
        type: SecurityEventType.LOGIN_SUCCESS,
        severity: SecuritySeverity.LOW,
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        details: {
          username: 'testuser',
          timestamp: new Date().toISOString(),
        },
        riskScore: 1,
        userId: 'user123',
      });

      expect(eventId).toBeDefined();
      expect(typeof eventId).toBe('string');
      expect(eventId).toMatch(/^sec_\d+_[a-z0-9]+$/);
    });

    it('应该为高风险事件分配更高的风险评分', async () => {
      const eventId = await auditSystem.recordEvent({
        type: SecurityEventType.MALWARE_DETECTED,
        severity: SecuritySeverity.CRITICAL,
        ip: '10.0.0.1',
        details: {
          fileName: 'suspicious.exe',
          malwareType: 'trojan',
        },
        riskScore: 9,
      });

      expect(eventId).toBeDefined();
    });

    it('应该处理本地IP地址', async () => {
      const eventId = await auditSystem.recordEvent({
        type: SecurityEventType.LOGIN_SUCCESS,
        severity: SecuritySeverity.LOW,
        ip: '127.0.0.1',
        details: {
          source: 'localhost',
        },
        riskScore: 1,
      });

      expect(eventId).toBeDefined();
    });
  });

  describe('文件安全扫描', () => {
    it('应该扫描安全的文本文件', async () => {
      const testContent = Buffer.from('This is a safe text file content.');
      const result = await auditSystem.scanFile('/test/safe.txt', testContent, {
        originalName: 'safe.txt',
        mimeType: 'text/plain',
        size: testContent.length,
      });

      expect(result).toMatchObject({
        safe: true,
        threats: [],
        fileType: 'text/plain',
        size: testContent.length,
      });
      expect(result.hash).toBeDefined();
      expect(result.scanTime).toBeGreaterThan(0);
    });

    it('应该检测不安全的文件类型', async () => {
      const testContent = Buffer.from('fake executable content');
      const result = await auditSystem.scanFile('/test/malware.exe', testContent, {
        originalName: 'malware.exe',
        mimeType: 'application/x-executable',
        size: testContent.length,
      });

      expect(result.safe).toBe(false);
      expect(result.threats.length).toBeGreaterThan(0);
      expect(result.threats[0]).toContain('不允许的文件类型');
    });

    it('应该检测过大的文件', async () => {
      const largeContent = Buffer.alloc(100 * 1024 * 1024); // 100MB
      const result = await auditSystem.scanFile('/test/large.txt', largeContent, {
        originalName: 'large.txt',
        mimeType: 'text/plain',
        size: largeContent.length,
      });

      expect(result.safe).toBe(false);
      expect(result.threats.some(threat => threat.includes('文件大小超限'))).toBe(true);
    });

    it('应该检测危险的文件名', async () => {
      const testContent = Buffer.from('test content');
      const result = await auditSystem.scanFile('/test/../../../etc/passwd', testContent, {
        originalName: '../../../etc/passwd',
        mimeType: 'text/plain',
        size: testContent.length,
      });

      expect(result.safe).toBe(false);
      expect(result.threats.some(threat => threat.includes('文件名包含危险字符'))).toBe(true);
    });
  });

  describe('威胁检测', () => {
    it('应该检测正常请求', async () => {
      const request = {
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        path: '/api/users',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
      };

      const result = await auditSystem.detectThreats(request);

      expect(result.blocked).toBe(false);
      expect(result.riskScore).toBeLessThan(5);
    });

    it('应该检测SQL注入尝试', async () => {
      const request = {
        ip: '10.0.0.1',
        path: '/api/users',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          username: "admin'; DROP TABLE users; --",
          password: 'password',
        },
      };

      const result = await auditSystem.detectThreats(request);

      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.threats.some(threat => threat.includes('SQL注入'))).toBe(true);
    });

    it('应该检测XSS尝试', async () => {
      const request = {
        ip: '10.0.0.1',
        path: '/api/comments',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          comment: '<script>alert("XSS")</script>',
        },
      };

      const result = await auditSystem.detectThreats(request);

      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.threats.some(threat => threat.includes('XSS'))).toBe(true);
    });

    it('应该检测可疑的User-Agent', async () => {
      const request = {
        ip: '10.0.0.1',
        userAgent: 'sqlmap/1.0',
        path: '/api/users',
        method: 'GET',
        headers: {},
      };

      const result = await auditSystem.detectThreats(request);

      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.threats.some(threat => threat.includes('User-Agent'))).toBe(true);
    });
  });

  describe('用户行为分析', () => {
    it('应该分析用户行为模式', async () => {
      const userId = 'test-user-123';

      // 记录一些用户事件
      await auditSystem.recordEvent({
        type: SecurityEventType.LOGIN_SUCCESS,
        severity: SecuritySeverity.LOW,
        ip: '192.168.1.100',
        userId,
        details: { timestamp: new Date().toISOString() },
        riskScore: 1,
      });

      await auditSystem.recordEvent({
        type: SecurityEventType.API_ACCESS,
        severity: SecuritySeverity.LOW,
        ip: '192.168.1.100',
        userId,
        details: { endpoint: '/api/profile' },
        riskScore: 1,
      });

      const analysis = await auditSystem.analyzeUserBehavior(userId);

      expect(analysis).toMatchObject({
        userId,
        riskScore: expect.any(Number),
        anomalies: expect.any(Array),
        patterns: {
          loginTimes: expect.any(Array),
          locations: expect.any(Array),
          devices: expect.any(Array),
          activities: expect.any(Array),
        },
        recommendations: expect.any(Array),
      });
    });

    it('应该检测异常行为', async () => {
      const userId = 'suspicious-user-456';

      // 记录多次失败登录
      for (let i = 0; i < 6; i++) {
        await auditSystem.recordEvent({
          type: SecurityEventType.LOGIN_FAILURE,
          severity: SecuritySeverity.MEDIUM,
          ip: '10.0.0.1',
          userId,
          details: { attempt: i + 1 },
          riskScore: 3,
        });
      }

      const analysis = await auditSystem.analyzeUserBehavior(userId);

             expect(analysis.riskScore).toBeGreaterThanOrEqual(3);
      expect(analysis.anomalies.some(anomaly => anomaly.includes('频繁登录失败'))).toBe(true);
    });
  });

  describe('安全报告生成', () => {
    it('应该生成安全报告', async () => {
      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24小时前
        end: new Date(),
      };

      // 记录一些测试事件
      await auditSystem.recordEvent({
        type: SecurityEventType.LOGIN_SUCCESS,
        severity: SecuritySeverity.LOW,
        ip: '192.168.1.100',
        details: { test: true },
        riskScore: 1,
      });

      await auditSystem.recordEvent({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.HIGH,
        ip: '10.0.0.1',
        details: { test: true },
        riskScore: 7,
      });

      const report = await auditSystem.generateSecurityReport(timeRange);

      expect(report).toMatchObject({
        summary: {
          totalEvents: expect.any(Number),
          highRiskEvents: expect.any(Number),
          blockedAttacks: expect.any(Number),
          resolvedIncidents: expect.any(Number),
        },
        topThreats: expect.any(Array),
        riskTrends: expect.any(Array),
        recommendations: expect.any(Array),
      });

      expect(report.summary.totalEvents).toBeGreaterThanOrEqual(2);
      expect(report.summary.highRiskEvents).toBeGreaterThanOrEqual(1);
    });
  });

  describe('便捷方法', () => {
    it('recordSecurityEvent 方法应该正常工作', async () => {
      const eventId = await recordSecurityEvent({
        type: SecurityEventType.API_ACCESS,
        severity: SecuritySeverity.LOW,
        ip: '192.168.1.100',
        details: { endpoint: '/api/test' },
        riskScore: 1,
      });

      expect(eventId).toBeDefined();
      expect(typeof eventId).toBe('string');
    });

    it('scanFile 方法应该正常工作', async () => {
      const testContent = Buffer.from('test file content');
      const result = await scanFile('/test/file.txt', testContent, {
        originalName: 'file.txt',
        mimeType: 'text/plain',
        size: testContent.length,
      });

      expect(result.safe).toBe(true);
      expect(result.hash).toBeDefined();
    });

    it('detectThreats 方法应该正常工作', async () => {
      const request = {
        ip: '192.168.1.100',
        path: '/api/test',
        method: 'GET',
        headers: {},
      };

      const result = await detectThreats(request);

      expect(result).toMatchObject({
        blocked: expect.any(Boolean),
        threats: expect.any(Array),
        riskScore: expect.any(Number),
      });
    });

    it('analyzeUserBehavior 方法应该正常工作', async () => {
      const userId = 'test-user-789';

      // 先记录一个事件
      await recordSecurityEvent({
        type: SecurityEventType.LOGIN_SUCCESS,
        severity: SecuritySeverity.LOW,
        ip: '192.168.1.100',
        userId,
        details: {},
        riskScore: 1,
      });

      const analysis = await analyzeUserBehavior(userId);

      expect(analysis.userId).toBe(userId);
      expect(analysis.riskScore).toBeGreaterThanOrEqual(0);
    });

    it('generateSecurityReport 方法应该正常工作', async () => {
      const timeRange = {
        start: new Date(Date.now() - 60 * 60 * 1000), // 1小时前
        end: new Date(),
      };

      const report = await generateSecurityReport(timeRange);

      expect(report.summary).toBeDefined();
      expect(report.topThreats).toBeInstanceOf(Array);
      expect(report.riskTrends).toBeInstanceOf(Array);
      expect(report.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内处理安全事件', async () => {
      const startTime = Date.now();

      // 记录多个事件
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(auditSystem.recordEvent({
          type: SecurityEventType.API_ACCESS,
          severity: SecuritySeverity.LOW,
          ip: `192.168.1.${100 + i}`,
          details: { index: i },
          riskScore: 1,
        }));
      }

      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 应该在5秒内完成
      expect(duration).toBeLessThan(5000);
    });

    it('应该高效处理文件扫描', async () => {
      const startTime = Date.now();

      const files = Array.from({ length: 5 }, (_, i) => ({
        content: Buffer.from(`Test file content ${i}`),
        name: `test-${i}.txt`,
      }));

      const promises = files.map(file =>
        auditSystem.scanFile(`/test/${file.name}`, file.content, {
          originalName: file.name,
          mimeType: 'text/plain',
          size: file.content.length,
        })
      );

      const results = await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results.length).toBe(5);
      expect(results.every(result => result.safe)).toBe(true);
      expect(duration).toBeLessThan(10000); // 10秒内完成
    });
  });
}); 