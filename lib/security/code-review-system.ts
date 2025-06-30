/**
 * @file lib/security/code-review-system.ts
 * @description Secure Code Review System - Enterprise-grade automated security code analysis
 * @author Security Team
 * @lastUpdate 2024-12-19
 * @security Production-level security code review implementation
 */

import { Logger } from '@/lib/utils/logger';
import { enhancedCacheManager } from '@/lib/cache/enhanced-cache-manager';
import { securityAuditSystem, SecurityEventType, SecuritySeverity } from './security-audit-system';
import { getErrorMessage } from '@/lib/utils/error-handler';

const logger = new Logger('CodeReviewSystem');

// Security Rule Categories
export enum SecurityRuleCategory {
  INPUT_VALIDATION = 'input_validation',
  OUTPUT_ENCODING = 'output_encoding',
  ACCESS_CONTROL = 'access_control',
  CRYPTOGRAPHY = 'cryptography',
  ERROR_HANDLING = 'error_handling',
  LOGGING_AUDITING = 'logging_auditing',
  DATA_PROTECTION = 'data_protection',
  SESSION_MANAGEMENT = 'session_management',
  INJECTION_PREVENTION = 'injection_prevention',
  CONFIGURATION = 'configuration',
}

// Security Rule Severity
export enum SecurityRuleSeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Security Rule Interface
export interface SecurityRule {
  id: string;
  name: string;
  category: SecurityRuleCategory;
  severity: SecurityRuleSeverity;
  description: string;
  pattern: RegExp;
  fileExtensions: string[];
  enabled: boolean;
  remediation: string;
  references: string[];
}

// Code Review Result
export interface CodeReviewResult {
  fileId: string;
  filePath: string;
  violations: SecurityViolation[];
  riskScore: number;
  linesScanned: number;
  scanDuration: number;
  reviewedAt: Date;
  reviewedBy: 'automated' | string;
}

// Security Violation
export interface SecurityViolation {
  ruleId: string;
  ruleName: string;
  category: SecurityRuleCategory;
  severity: SecurityRuleSeverity;
  line: number;
  column: number;
  code: string;
  message: string;
  remediation: string;
  references: string[];
  confidence: 'low' | 'medium' | 'high';
}

// Review Request
export interface ReviewRequest {
  id: string;
  files: Array<{
    path: string;
    content: string;
  }>;
  submittedBy: string;
  submittedAt: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export class CodeReviewSystem {
  private static instance: CodeReviewSystem;
  private securityRules: Map<string, SecurityRule> = new Map();
  private reviewResults: Map<string, CodeReviewResult> = new Map();
  private activeReviews: Map<string, ReviewRequest> = new Map();

  private constructor() {
    this.initializeSecurityRules();
  }

  public static getInstance(): CodeReviewSystem {
    if (!CodeReviewSystem.instance) {
      CodeReviewSystem.instance = new CodeReviewSystem();
    }
    return CodeReviewSystem.instance;
  }

  /**
   * Submit code for security review
   */
  async submitForReview(request: Omit<ReviewRequest, 'id' | 'submittedAt' | 'status'>): Promise<string> {
    const reviewId = this.generateReviewId();
    
    const reviewRequest: ReviewRequest = {
      id: reviewId,
      submittedAt: new Date(),
      status: 'pending',
      ...request,
    };

    this.activeReviews.set(reviewId, reviewRequest);

    // Log security event
    await securityAuditSystem.recordEvent({
      type: SecurityEventType.SECURITY_SCAN,
      severity: SecuritySeverity.LOW,
      ip: '127.0.0.1',
      details: {
        reviewId,
        fileCount: request.files.length,
        submittedBy: request.submittedBy,
        priority: request.priority,
      },
      riskScore: 1,
    });

    // Start review process asynchronously
    this.processReview(reviewId).catch(error => {
      logger.error('Failed to process code review', {
        reviewId,
        error: getErrorMessage(error),
      });
    });

    logger.info('Code review submitted', {
      reviewId,
      fileCount: request.files.length,
      submittedBy: request.submittedBy,
    });

    return reviewId;
  }

  /**
   * Get review status and results
   */
  async getReviewResults(reviewId: string): Promise<{
    request: ReviewRequest;
    results: CodeReviewResult[];
    summary: {
      totalViolations: number;
      criticalViolations: number;
      highViolations: number;
      riskScore: number;
      status: string;
    };
  } | null> {
    const request = this.activeReviews.get(reviewId);
    if (!request) {
      return null;
    }

    const results = Array.from(this.reviewResults.values())
      .filter(result => result.fileId.startsWith(reviewId));

    const totalViolations = results.reduce((sum, result) => sum + result.violations.length, 0);
    const criticalViolations = results.reduce((sum, result) => 
      sum + result.violations.filter(v => v.severity === SecurityRuleSeverity.CRITICAL).length, 0);
    const highViolations = results.reduce((sum, result) => 
      sum + result.violations.filter(v => v.severity === SecurityRuleSeverity.HIGH).length, 0);
    const riskScore = results.reduce((sum, result) => sum + result.riskScore, 0) / results.length || 0;

    return {
      request,
      results,
      summary: {
        totalViolations,
        criticalViolations,
        highViolations,
        riskScore,
        status: request.status,
      },
    };
  }

  /**
   * Scan single file for security issues
   */
  async scanFile(filePath: string, content: string, options: {
    rules?: string[];
    excludeRules?: string[];
  } = {}): Promise<CodeReviewResult> {
    const startTime = Date.now();
    const fileId = this.generateFileId(filePath);
    
    const result: CodeReviewResult = {
      fileId,
      filePath,
      violations: [],
      riskScore: 0,
      linesScanned: content.split('\n').length,
      scanDuration: 0,
      reviewedAt: new Date(),
      reviewedBy: 'automated',
    };

    try {
      // Get applicable rules
      const applicableRules = this.getApplicableRules(filePath, options);
      
      // Scan for violations
      for (const rule of applicableRules) {
        const violations = this.scanForRule(content, rule);
        result.violations.push(...violations);
      }

      // Calculate risk score
      result.riskScore = this.calculateRiskScore(result.violations);
      result.scanDuration = Date.now() - startTime;

      // Store result
      this.reviewResults.set(fileId, result);

      // Cache high-risk results
      if (result.riskScore >= 7) {
        await enhancedCacheManager.set(
          `security:code-review:high-risk:${fileId}`,
          result,
          { ttl: 86400000, tags: ['security', 'code-review', 'high-risk'] }
        );
      }

      // Log security event for high-risk findings
      if (result.violations.some(v => v.severity === SecurityRuleSeverity.CRITICAL)) {
        await securityAuditSystem.recordEvent({
          type: SecurityEventType.SECURITY_SCAN,
          severity: SecuritySeverity.HIGH,
          ip: '127.0.0.1',
          details: {
            fileId,
            filePath,
            violationCount: result.violations.length,
            criticalViolations: result.violations.filter(v => v.severity === SecurityRuleSeverity.CRITICAL).length,
            riskScore: result.riskScore,
          },
          riskScore: result.riskScore,
        });
      }

      logger.info('File security scan completed', {
        fileId,
        filePath,
        violations: result.violations.length,
        riskScore: result.riskScore,
        scanDuration: result.scanDuration,
      });

      return result;

    } catch (error) {
      logger.error('File security scan failed', {
        fileId,
        filePath,
        error: getErrorMessage(error),
      });

      result.violations.push({
        ruleId: 'scan-error',
        ruleName: 'Scan Error',
        category: SecurityRuleCategory.ERROR_HANDLING,
        severity: SecurityRuleSeverity.HIGH,
        line: 1,
        column: 1,
        code: '',
        message: 'Security scan failed: ' + getErrorMessage(error),
        remediation: 'Review file manually for security issues',
        references: [],
        confidence: 'high',
      });

      result.riskScore = 8;
      result.scanDuration = Date.now() - startTime;

      return result;
    }
  }

  /**
   * Get security rules
   */
  getSecurityRules(options: {
    category?: SecurityRuleCategory;
    severity?: SecurityRuleSeverity;
    enabled?: boolean;
  } = {}): SecurityRule[] {
    let rules = Array.from(this.securityRules.values());

    if (options.category) {
      rules = rules.filter(rule => rule.category === options.category);
    }

    if (options.severity) {
      rules = rules.filter(rule => rule.severity === options.severity);
    }

    if (options.enabled !== undefined) {
      rules = rules.filter(rule => rule.enabled === options.enabled);
    }

    return rules;
  }

  /**
   * Update security rule
   */
  async updateSecurityRule(ruleId: string, updates: Partial<SecurityRule>): Promise<boolean> {
    const rule = this.securityRules.get(ruleId);
    if (!rule) {
      return false;
    }

    const updatedRule = { ...rule, ...updates };
    this.securityRules.set(ruleId, updatedRule);

    // Cache updated rules
    await enhancedCacheManager.set(
      'security:rules:updated',
      Array.from(this.securityRules.values()),
      { ttl: 3600000, tags: ['security', 'rules'] }
    );

    logger.info('Security rule updated', {
      ruleId,
      updates: Object.keys(updates),
    });

    return true;
  }

  /**
   * Generate security report
   */
  async generateSecurityReport(options: {
    timeRange?: { start: Date; end: Date };
    filePattern?: string;
    severity?: SecurityRuleSeverity;
  } = {}): Promise<{
    summary: {
      totalScans: number;
      totalViolations: number;
      criticalViolations: number;
      highViolations: number;
      averageRiskScore: number;
    };
    topViolations: Array<{
      ruleId: string;
      ruleName: string;
      count: number;
      severity: SecurityRuleSeverity;
    }>;
    trends: Array<{
      date: string;
      scans: number;
      violations: number;
      riskScore: number;
    }>;
    recommendations: string[];
  }> {
    let results = Array.from(this.reviewResults.values());

    // Apply filters
    if (options.timeRange) {
      results = results.filter(result => 
        result.reviewedAt >= options.timeRange!.start && 
        result.reviewedAt <= options.timeRange!.end
      );
    }

    if (options.filePattern) {
      const pattern = new RegExp(options.filePattern, 'i');
      results = results.filter(result => pattern.test(result.filePath));
    }

    // Calculate summary
    const totalScans = results.length;
    const totalViolations = results.reduce((sum, result) => sum + result.violations.length, 0);
    const criticalViolations = results.reduce((sum, result) => 
      sum + result.violations.filter(v => v.severity === SecurityRuleSeverity.CRITICAL).length, 0);
    const highViolations = results.reduce((sum, result) => 
      sum + result.violations.filter(v => v.severity === SecurityRuleSeverity.HIGH).length, 0);
    const averageRiskScore = results.reduce((sum, result) => sum + result.riskScore, 0) / totalScans || 0;

    // Top violations
    const violationCounts = new Map<string, { count: number; rule: SecurityViolation }>();
    results.forEach(result => {
      result.violations.forEach(violation => {
        const key = violation.ruleId;
        const current = violationCounts.get(key);
        if (current) {
          current.count++;
        } else {
          violationCounts.set(key, { count: 1, rule: violation });
        }
      });
    });

    const topViolations = Array.from(violationCounts.entries())
      .map(([ruleId, data]) => ({
        ruleId,
        ruleName: data.rule.ruleName,
        count: data.count,
        severity: data.rule.severity,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Generate recommendations
    const recommendations = this.generateRecommendations(results);

    return {
      summary: {
        totalScans,
        totalViolations,
        criticalViolations,
        highViolations,
        averageRiskScore,
      },
      topViolations,
      trends: [], // Implement trend analysis if needed
      recommendations,
    };
  }

  /**
   * Private: Process review request
   */
  private async processReview(reviewId: string): Promise<void> {
    const request = this.activeReviews.get(reviewId);
    if (!request) {
      return;
    }

    try {
      // Update status
      request.status = 'in_progress';
      this.activeReviews.set(reviewId, request);

      // Scan all files
      for (const file of request.files) {
        await this.scanFile(file.path, file.content);
      }

      // Update status
      request.status = 'completed';
      this.activeReviews.set(reviewId, request);

      logger.info('Code review completed', {
        reviewId,
        fileCount: request.files.length,
      });

    } catch (error) {
      request.status = 'failed';
      this.activeReviews.set(reviewId, request);

      logger.error('Code review failed', {
        reviewId,
        error: getErrorMessage(error),
      });
    }
  }

  /**
   * Private: Initialize security rules
   */
  private initializeSecurityRules(): void {
    const rules: SecurityRule[] = [
      // Input Validation Rules
      {
        id: 'no-eval',
        name: 'Dangerous eval() Usage',
        category: SecurityRuleCategory.INPUT_VALIDATION,
        severity: SecurityRuleSeverity.CRITICAL,
        description: 'Using eval() can lead to code injection vulnerabilities',
        pattern: /\beval\s*\(/gi,
        fileExtensions: ['.js', '.ts', '.jsx', '.tsx'],
        enabled: true,
        remediation: 'Replace eval() with safer alternatives like JSON.parse() or Function constructor',
        references: ['https://owasp.org/www-community/attacks/Code_Injection'],
      },
      {
        id: 'sql-injection-risk',
        name: 'SQL Injection Risk',
        category: SecurityRuleCategory.INJECTION_PREVENTION,
        severity: SecurityRuleSeverity.HIGH,
        description: 'Dynamic SQL construction may lead to SQL injection',
        pattern: /['"]\s*\+\s*.*\s*\+\s*['"].*(?:SELECT|INSERT|UPDATE|DELETE|DROP)/gi,
        fileExtensions: ['.js', '.ts', '.py', '.php', '.java'],
        enabled: true,
        remediation: 'Use parameterized queries or prepared statements',
        references: ['https://owasp.org/www-community/attacks/SQL_Injection'],
      },
      {
        id: 'hardcoded-secrets',
        name: 'Hardcoded Secrets',
        category: SecurityRuleCategory.DATA_PROTECTION,
        severity: SecurityRuleSeverity.CRITICAL,
        description: 'Hardcoded secrets in source code',
        pattern: /(password|secret|key|token)\s*[=:]\s*['"][^'"]{8,}['"]/gi,
        fileExtensions: ['.js', '.ts', '.py', '.java', '.php', '.cs'],
        enabled: true,
        remediation: 'Use environment variables or secure key management systems',
        references: ['https://owasp.org/www-project-top-ten/2017/A3_2017-Sensitive_Data_Exposure'],
      },
      {
        id: 'xss-innerHTML',
        name: 'XSS via innerHTML',
        category: SecurityRuleCategory.OUTPUT_ENCODING,
        severity: SecurityRuleSeverity.HIGH,
        description: 'Using innerHTML with user input can lead to XSS',
        pattern: /\.innerHTML\s*=\s*(?!['"]\s*['"])/gi,
        fileExtensions: ['.js', '.ts', '.jsx', '.tsx'],
        enabled: true,
        remediation: 'Use textContent or sanitize input before setting innerHTML',
        references: ['https://owasp.org/www-community/attacks/xss/'],
      },
      {
        id: 'crypto-weak-random',
        name: 'Weak Random Number Generation',
        category: SecurityRuleCategory.CRYPTOGRAPHY,
        severity: SecurityRuleSeverity.MEDIUM,
        description: 'Math.random() is not cryptographically secure',
        pattern: /Math\.random\(\)/gi,
        fileExtensions: ['.js', '.ts', '.jsx', '.tsx'],
        enabled: true,
        remediation: 'Use crypto.getRandomValues() for cryptographic purposes',
        references: ['https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues'],
      },
      {
        id: 'console-log-production',
        name: 'Console Logging in Production',
        category: SecurityRuleCategory.LOGGING_AUDITING,
        severity: SecurityRuleSeverity.LOW,
        description: 'Console logs may expose sensitive information',
        pattern: /console\.(log|debug|info|warn|error)/gi,
        fileExtensions: ['.js', '.ts', '.jsx', '.tsx'],
        enabled: true,
        remediation: 'Use proper logging framework and remove console logs in production',
        references: ['https://owasp.org/www-project-top-ten/2017/A10_2017-Insufficient_Logging%2526Monitoring'],
      },
      {
        id: 'unsafe-file-upload',
        name: 'Unsafe File Upload',
        category: SecurityRuleCategory.INPUT_VALIDATION,
        severity: SecurityRuleSeverity.HIGH,
        description: 'File upload without proper validation',
        pattern: /\.upload\(|multer\(|formidable\(/gi,
        fileExtensions: ['.js', '.ts'],
        enabled: true,
        remediation: 'Implement file type validation, size limits, and virus scanning',
        references: ['https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload'],
      },
      {
        id: 'jwt-no-verify',
        name: 'JWT Without Verification',
        category: SecurityRuleCategory.SESSION_MANAGEMENT,
        severity: SecurityRuleSeverity.CRITICAL,
        description: 'JWT token used without proper verification',
        pattern: /jwt\.decode\s*\([^,)]*\)/gi,
        fileExtensions: ['.js', '.ts'],
        enabled: true,
        remediation: 'Always verify JWT tokens using jwt.verify() with secret',
        references: ['https://auth0.com/blog/a-look-at-the-latest-draft-for-oauth-token-exchange/'],
      },
    ];

    rules.forEach(rule => {
      this.securityRules.set(rule.id, rule);
    });

    logger.info('Security rules initialized', { count: rules.length });
  }

  /**
   * Private: Get applicable rules for file
   */
  private getApplicableRules(filePath: string, options: {
    rules?: string[];
    excludeRules?: string[];
  }): SecurityRule[] {
    const fileExtension = this.getFileExtension(filePath);
    let rules = Array.from(this.securityRules.values());

    // Filter by file extension
    rules = rules.filter(rule => 
      rule.fileExtensions.includes(fileExtension) && rule.enabled
    );

    // Include only specific rules if provided
    if (options.rules && options.rules.length > 0) {
      rules = rules.filter(rule => options.rules!.includes(rule.id));
    }

    // Exclude specific rules if provided
    if (options.excludeRules && options.excludeRules.length > 0) {
      rules = rules.filter(rule => !options.excludeRules!.includes(rule.id));
    }

    return rules;
  }

  /**
   * Private: Scan content for specific rule
   */
  private scanForRule(content: string, rule: SecurityRule): SecurityViolation[] {
    const violations: SecurityViolation[] = [];
    const lines = content.split('\n');

    lines.forEach((line, lineIndex) => {
      const matches = line.matchAll(rule.pattern);
      
      for (const match of matches) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          severity: rule.severity,
          line: lineIndex + 1,
          column: match.index! + 1,
          code: line.trim(),
          message: rule.description,
          remediation: rule.remediation,
          references: rule.references,
          confidence: this.calculateConfidence(rule, match[0]),
        });
      }
    });

    return violations;
  }

  /**
   * Private: Calculate risk score based on violations
   */
  private calculateRiskScore(violations: SecurityViolation[]): number {
    let score = 0;

    violations.forEach(violation => {
      switch (violation.severity) {
        case SecurityRuleSeverity.CRITICAL:
          score += 10;
          break;
        case SecurityRuleSeverity.HIGH:
          score += 6;
          break;
        case SecurityRuleSeverity.MEDIUM:
          score += 3;
          break;
        case SecurityRuleSeverity.LOW:
          score += 1;
          break;
        case SecurityRuleSeverity.INFO:
          score += 0.5;
          break;
      }

      // Adjust based on confidence
      if (violation.confidence === 'high') {
        score *= 1.2;
      } else if (violation.confidence === 'low') {
        score *= 0.8;
      }
    });

    return Math.min(score / violations.length || 0, 10);
  }

  /**
   * Private: Calculate confidence level
   */
  private calculateConfidence(rule: SecurityRule, match: string): 'low' | 'medium' | 'high' {
    // Simple heuristic for confidence calculation
    if (rule.severity === SecurityRuleSeverity.CRITICAL) {
      return 'high';
    }
    
    if (match.length > 20 || rule.severity === SecurityRuleSeverity.HIGH) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Private: Generate recommendations
   */
  private generateRecommendations(results: CodeReviewResult[]): string[] {
    const recommendations: string[] = [];
    
    const criticalCount = results.reduce((sum, result) => 
      sum + result.violations.filter(v => v.severity === SecurityRuleSeverity.CRITICAL).length, 0);
    
    if (criticalCount > 0) {
      recommendations.push(`Address ${criticalCount} critical security vulnerabilities immediately`);
    }

    const highCount = results.reduce((sum, result) => 
      sum + result.violations.filter(v => v.severity === SecurityRuleSeverity.HIGH).length, 0);
    
    if (highCount > 5) {
      recommendations.push('Implement comprehensive input validation across the application');
    }

    const evalUsage = results.some(result => 
      result.violations.some(v => v.ruleId === 'no-eval'));
    
    if (evalUsage) {
      recommendations.push('Eliminate all eval() usage and implement safer alternatives');
    }

    return recommendations;
  }

  /**
   * Private: Utility methods
   */
  private generateReviewId(): string {
    return `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateFileId(filePath: string): string {
    return `file_${Date.now()}_${Buffer.from(filePath).toString('base64').substr(0, 8)}`;
  }

  private getFileExtension(filePath: string): string {
    return '.' + filePath.split('.').pop()?.toLowerCase() || '';
  }
}

// Export singleton instance
export const codeReviewSystem = CodeReviewSystem.getInstance();

// Export convenience methods
export const submitForReview = codeReviewSystem.submitForReview.bind(codeReviewSystem);
export const getReviewResults = codeReviewSystem.getReviewResults.bind(codeReviewSystem);
export const scanFile = codeReviewSystem.scanFile.bind(codeReviewSystem);
export const getSecurityRules = codeReviewSystem.getSecurityRules.bind(codeReviewSystem);
export const generateSecurityReport = codeReviewSystem.generateSecurityReport.bind(codeReviewSystem);