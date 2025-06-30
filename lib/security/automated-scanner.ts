/**
 * @file lib/security/automated-scanner.ts
 * @description Automated Security Scanner - CI/CD integration for continuous security scanning
 * @author Security Team
 * @lastUpdate 2024-12-19
 * @security Production-level automated security scanning
 */

import { Logger } from '@/lib/utils/logger';
import { enhancedCacheManager } from '@/lib/cache/enhanced-cache-manager';
import { codeReviewSystem, CodeReviewResult } from './code-review-system';
import { securityAuditSystem, SecurityEventType, SecuritySeverity } from './security-audit-system';
import { getErrorMessage } from '@/lib/utils/error-handler';
import * as fs from 'fs/promises';
import * as path from 'path';

const logger = new Logger('AutomatedScanner');

// Scan Configuration
export interface ScanConfig {
  id: string;
  name: string;
  enabled: boolean;
  schedule?: string; // Cron expression
  includePatterns: string[];
  excludePatterns: string[];
  rulesets: string[];
  thresholds: {
    critical: number;
    high: number;
    medium: number;
    riskScore: number;
  };
  notifications: {
    email?: string[];
    webhook?: string;
    slack?: string;
  };
}

// Scan Job
export interface ScanJob {
  id: string;
  configId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
  triggeredBy: 'schedule' | 'commit' | 'manual' | 'api';
  results?: ScanJobResult;
  error?: string;
}

// Scan Job Result
export interface ScanJobResult {
  totalFiles: number;
  scannedFiles: number;
  skippedFiles: number;
  violations: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  riskScore: number;
  duration: number;
  reportUrl?: string;
}

// File Change Detection
interface FileChange {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  content?: string;
}

export class AutomatedScanner {
  private static instance: AutomatedScanner;
  private scanConfigs: Map<string, ScanConfig> = new Map();
  private scanJobs: Map<string, ScanJob> = new Map();
  private activeScans: Set<string> = new Set();
  private scheduledScans: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    this.initializeDefaultConfigs();
    this.startScheduler();
  }

  public static getInstance(): AutomatedScanner {
    if (!AutomatedScanner.instance) {
      AutomatedScanner.instance = new AutomatedScanner();
    }
    return AutomatedScanner.instance;
  }

  /**
   * Scan repository for security issues
   */
  async scanRepository(options: {
    configId?: string;
    includePatterns?: string[];
    excludePatterns?: string[];
    triggeredBy?: 'schedule' | 'commit' | 'manual' | 'api';
  } = {}): Promise<string> {
    const configId = options.configId || 'default';
    const config = this.scanConfigs.get(configId);
    
    if (!config) {
      throw new Error(`Scan configuration not found: ${configId}`);
    }

    if (!config.enabled) {
      throw new Error(`Scan configuration is disabled: ${configId}`);
    }

    const jobId = this.generateJobId();
    const job: ScanJob = {
      id: jobId,
      configId,
      status: 'queued',
      triggeredBy: options.triggeredBy || 'manual',
    };

    this.scanJobs.set(jobId, job);

    // Start scan asynchronously
    this.executeScan(jobId, config, options).catch(error => {
      logger.error('Scan execution failed', {
        jobId,
        configId,
        error: getErrorMessage(error),
      });
    });

    logger.info('Repository scan initiated', {
      jobId,
      configId,
      triggeredBy: job.triggeredBy,
    });

    return jobId;
  }

  /**
   * Scan specific files (for CI/CD integration)
   */
  async scanFiles(files: Array<{ path: string; content: string }>, options: {
    configId?: string;
    rulesets?: string[];
  } = {}): Promise<{
    jobId: string;
    results: CodeReviewResult[];
    passed: boolean;
    summary: ScanJobResult;
  }> {
    const configId = options.configId || 'default';
    const config = this.scanConfigs.get(configId);
    
    if (!config) {
      throw new Error(`Scan configuration not found: ${configId}`);
    }

    const jobId = this.generateJobId();
    const startTime = Date.now();

    try {
      const results: CodeReviewResult[] = [];
      let scannedFiles = 0;
      let skippedFiles = 0;

      for (const file of files) {
        // Check if file should be scanned
        if (!this.shouldScanFile(file.path, config)) {
          skippedFiles++;
          continue;
        }

        // Scan file
        const result = await codeReviewSystem.scanFile(file.path, file.content, {
          rules: options.rulesets || config.rulesets,
        });

        results.push(result);
        scannedFiles++;
      }

      // Calculate summary
      const summary = this.calculateScanSummary(results, files.length, startTime);
      
      // Check if scan passed based on thresholds
      const passed = this.checkThresholds(summary, config.thresholds);

      // Record scan event
      await securityAuditSystem.recordEvent({
        type: SecurityEventType.SECURITY_SCAN,
        severity: passed ? SecuritySeverity.LOW : SecuritySeverity.HIGH,
        ip: '127.0.0.1',
        details: {
          jobId,
          configId,
          filesScanned: scannedFiles,
          violations: summary.violations.total,
          passed,
          riskScore: summary.riskScore,
        },
        riskScore: passed ? 2 : 8,
      });

      logger.info('Files scan completed', {
        jobId,
        scannedFiles,
        skippedFiles,
        violations: summary.violations.total,
        passed,
        riskScore: summary.riskScore,
      });

      return { jobId, results, passed, summary };

    } catch (error) {
      logger.error('Files scan failed', {
        jobId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  /**
   * Scan changed files (for Git hooks)
   */
  async scanChangedFiles(changes: FileChange[], options: {
    configId?: string;
    baseBranch?: string;
  } = {}): Promise<{
    jobId: string;
    passed: boolean;
    blockedFiles: string[];
    warnings: string[];
  }> {
    const configId = options.configId || 'default';
    const config = this.scanConfigs.get(configId);
    
    if (!config) {
      throw new Error(`Scan configuration not found: ${configId}`);
    }

    const jobId = this.generateJobId();
    const blockedFiles: string[] = [];
    const warnings: string[] = [];

    try {
      // Filter relevant changes
      const relevantChanges = changes.filter(change => 
        change.type !== 'deleted' && 
        change.content &&
        this.shouldScanFile(change.path, config)
      );

      if (relevantChanges.length === 0) {
        logger.info('No relevant files to scan', { jobId });
        return { jobId, passed: true, blockedFiles: [], warnings: [] };
      }

      // Scan changed files
      for (const change of relevantChanges) {
        const result = await codeReviewSystem.scanFile(change.path, change.content!);

        // Check for blocking violations
        const criticalViolations = result.violations.filter(v => v.severity === 'critical');
        const highViolations = result.violations.filter(v => v.severity === 'high');

        if (criticalViolations.length > config.thresholds.critical) {
          blockedFiles.push(change.path);
        }

        if (highViolations.length > config.thresholds.high) {
          warnings.push(`${change.path}: ${highViolations.length} high-severity issues found`);
        }
      }

      const passed = blockedFiles.length === 0;

      // Record scan event
      await securityAuditSystem.recordEvent({
        type: SecurityEventType.SECURITY_SCAN,
        severity: passed ? SecuritySeverity.LOW : SecuritySeverity.CRITICAL,
        ip: '127.0.0.1',
        details: {
          jobId,
          configId,
          changedFiles: relevantChanges.length,
          blockedFiles: blockedFiles.length,
          warnings: warnings.length,
          passed,
        },
        riskScore: passed ? 1 : 9,
      });

      logger.info('Changed files scan completed', {
        jobId,
        changedFiles: relevantChanges.length,
        blockedFiles: blockedFiles.length,
        warnings: warnings.length,
        passed,
      });

      return { jobId, passed, blockedFiles, warnings };

    } catch (error) {
      logger.error('Changed files scan failed', {
        jobId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  /**
   * Get scan job status
   */
  getScanJob(jobId: string): ScanJob | null {
    return this.scanJobs.get(jobId) || null;
  }

  /**
   * Cancel running scan
   */
  async cancelScan(jobId: string): Promise<boolean> {
    const job = this.scanJobs.get(jobId);
    if (!job || job.status !== 'running') {
      return false;
    }

    job.status = 'cancelled';
    job.completedAt = new Date();
    this.activeScans.delete(jobId);

    logger.info('Scan cancelled', { jobId });
    return true;
  }

  /**
   * Create or update scan configuration
   */
  async createScanConfig(config: Omit<ScanConfig, 'id'>): Promise<string> {
    const configId = this.generateConfigId();
    const fullConfig: ScanConfig = {
      id: configId,
      ...config,
    };

    this.scanConfigs.set(configId, fullConfig);

    // Schedule if needed
    if (fullConfig.enabled && fullConfig.schedule) {
      this.scheduleConfig(fullConfig);
    }

    // Cache configuration
    await enhancedCacheManager.set(
      `security:scan-config:${configId}`,
      fullConfig,
      { ttl: 86400000, tags: ['security', 'scan-config'] }
    );

    logger.info('Scan configuration created', {
      configId,
      name: config.name,
      enabled: config.enabled,
    });

    return configId;
  }

  /**
   * Get scan configurations
   */
  getScanConfigs(): ScanConfig[] {
    return Array.from(this.scanConfigs.values());
  }

  /**
   * Update scan configuration
   */
  async updateScanConfig(configId: string, updates: Partial<ScanConfig>): Promise<boolean> {
    const config = this.scanConfigs.get(configId);
    if (!config) {
      return false;
    }

    const updatedConfig = { ...config, ...updates };
    this.scanConfigs.set(configId, updatedConfig);

    // Update scheduling
    this.unscheduleConfig(configId);
    if (updatedConfig.enabled && updatedConfig.schedule) {
      this.scheduleConfig(updatedConfig);
    }

    // Update cache
    await enhancedCacheManager.set(
      `security:scan-config:${configId}`,
      updatedConfig,
      { ttl: 86400000, tags: ['security', 'scan-config'] }
    );

    logger.info('Scan configuration updated', {
      configId,
      updates: Object.keys(updates),
    });

    return true;
  }

  /**
   * Generate CI/CD integration script
   */
  generateCIScript(configId: string, platform: 'github' | 'gitlab' | 'jenkins' | 'generic'): string {
    const config = this.scanConfigs.get(configId);
    if (!config) {
      throw new Error(`Configuration not found: ${configId}`);
    }

    switch (platform) {
      case 'github':
        return this.generateGitHubAction(config);
      case 'gitlab':
        return this.generateGitLabCI(config);
      case 'jenkins':
        return this.generateJenkinsfile(config);
      default:
        return this.generateGenericScript(config);
    }
  }

  /**
   * Private: Execute scan job
   */
  private async executeScan(jobId: string, config: ScanConfig, options: any): Promise<void> {
    const job = this.scanJobs.get(jobId)!;
    
    try {
      job.status = 'running';
      job.startedAt = new Date();
      this.activeScans.add(jobId);

      const startTime = Date.now();
      const results: CodeReviewResult[] = [];
      let totalFiles = 0;
      let scannedFiles = 0;
      let skippedFiles = 0;

      // Discover files to scan
      const filesToScan = await this.discoverFiles(config, options);
      totalFiles = filesToScan.length;

      // Scan each file
      for (const filePath of filesToScan) {
        if (job.status === 'cancelled') {
          break;
        }

        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const result = await codeReviewSystem.scanFile(filePath, content, {
            rules: config.rulesets,
          });
          
          results.push(result);
          scannedFiles++;
        } catch (error) {
          logger.warn('Failed to scan file', {
            filePath,
            error: getErrorMessage(error),
          });
          skippedFiles++;
        }
      }

      // Calculate results
      const summary = this.calculateScanSummary(results, totalFiles, startTime);
      
      job.results = summary;
      job.status = 'completed';
      job.completedAt = new Date();

      // Send notifications if thresholds exceeded
      if (!this.checkThresholds(summary, config.thresholds)) {
        await this.sendNotifications(config, summary, jobId);
      }

      this.activeScans.delete(jobId);

      logger.info('Scan job completed', {
        jobId,
        configId: config.id,
        totalFiles,
        scannedFiles,
        violations: summary.violations.total,
        riskScore: summary.riskScore,
      });

    } catch (error) {
      job.status = 'failed';
      job.error = getErrorMessage(error);
      job.completedAt = new Date();
      this.activeScans.delete(jobId);

      logger.error('Scan job failed', {
        jobId,
        configId: config.id,
        error: getErrorMessage(error),
      });
    }
  }

  /**
   * Private: Initialize default configurations
   */
  private initializeDefaultConfigs(): void {
    const defaultConfig: ScanConfig = {
      id: 'default',
      name: 'Default Security Scan',
      enabled: true,
      includePatterns: ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'],
      excludePatterns: ['**/node_modules/**', '**/dist/**', '**/*.test.*', '**/*.spec.*'],
      rulesets: [],
      thresholds: {
        critical: 0,
        high: 5,
        medium: 20,
        riskScore: 7,
      },
      notifications: {},
    };

    this.scanConfigs.set('default', defaultConfig);

    const strictConfig: ScanConfig = {
      id: 'strict',
      name: 'Strict Security Scan',
      enabled: true,
      includePatterns: ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx', '**/*.py', '**/*.java'],
      excludePatterns: ['**/node_modules/**', '**/dist/**', '**/*.test.*', '**/*.spec.*'],
      rulesets: [],
      thresholds: {
        critical: 0,
        high: 0,
        medium: 10,
        riskScore: 5,
      },
      notifications: {},
    };

    this.scanConfigs.set('strict', strictConfig);

    logger.info('Default scan configurations initialized');
  }

  /**
   * Private: Start scheduler
   */
  private startScheduler(): void {
    // Check for scheduled scans every minute
    setInterval(() => {
      this.checkScheduledScans();
    }, 60000);

    logger.info('Scan scheduler started');
  }

  /**
   * Private: Check for scheduled scans
   */
  private checkScheduledScans(): void {
    for (const config of this.scanConfigs.values()) {
      if (config.enabled && config.schedule && !this.scheduledScans.has(config.id)) {
        this.scheduleConfig(config);
      }
    }
  }

  /**
   * Private: Schedule configuration
   */
  private scheduleConfig(config: ScanConfig): void {
    if (!config.schedule) {return;}

    // Simple cron-like scheduling (basic implementation)
    // In production, use a proper cron library like node-cron
    const interval = this.parseCronExpression(config.schedule);
    
    const timer = setInterval(async () => {
      try {
        await this.scanRepository({
          configId: config.id,
          triggeredBy: 'schedule',
        });
      } catch (error) {
        logger.error('Scheduled scan failed', {
          configId: config.id,
          error: getErrorMessage(error),
        });
      }
    }, interval);

    this.scheduledScans.set(config.id, timer);
  }

  /**
   * Private: Unschedule configuration
   */
  private unscheduleConfig(configId: string): void {
    const timer = this.scheduledScans.get(configId);
    if (timer) {
      clearInterval(timer);
      this.scheduledScans.delete(configId);
    }
  }

  /**
   * Private: Utility methods
   */
  private generateJobId(): string {
    return `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateConfigId(): string {
    return `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldScanFile(filePath: string, config: ScanConfig): boolean {
    // Check exclude patterns first
    for (const pattern of config.excludePatterns) {
      if (this.matchesPattern(filePath, pattern)) {
        return false;
      }
    }

    // Check include patterns
    for (const pattern of config.includePatterns) {
      if (this.matchesPattern(filePath, pattern)) {
        return true;
      }
    }

    return false;
  }

  private matchesPattern(filePath: string, pattern: string): boolean {
    // Simple glob pattern matching (basic implementation)
    const regex = new RegExp(
      pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '.'),
      'i'
    );
    return regex.test(filePath);
  }

  private calculateScanSummary(results: CodeReviewResult[], totalFiles: number, startTime: number): ScanJobResult {
    const violations = {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    let totalRiskScore = 0;

    results.forEach(result => {
      result.violations.forEach(violation => {
        violations.total++;
        violations[violation.severity]++;
      });
      totalRiskScore += result.riskScore;
    });

    return {
      totalFiles,
      scannedFiles: results.length,
      skippedFiles: totalFiles - results.length,
      violations,
      riskScore: totalRiskScore / results.length || 0,
      duration: Date.now() - startTime,
    };
  }

  private checkThresholds(summary: ScanJobResult, thresholds: ScanConfig['thresholds']): boolean {
    return (
      summary.violations.critical <= thresholds.critical &&
      summary.violations.high <= thresholds.high &&
      summary.violations.medium <= thresholds.medium &&
      summary.riskScore <= thresholds.riskScore
    );
  }

  private async discoverFiles(config: ScanConfig, options: any): Promise<string[]> {
    // Simple file discovery (in production, use a proper glob library)
    const files: string[] = [];
    
    const scanDir = async (dir: string) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            await scanDir(fullPath);
          } else if (entry.isFile() && this.shouldScanFile(fullPath, config)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Ignore directories we can't read
      }
    };

    await scanDir(process.cwd());
    return files;
  }

  private parseCronExpression(expression: string): number {
    // Simple cron parser (basic implementation)
    // In production, use a proper cron library
    if (expression === '0 */6 * * *') {return 6 * 60 * 60 * 1000;} // Every 6 hours
    if (expression === '0 0 * * *') {return 24 * 60 * 60 * 1000;} // Daily
    return 60 * 60 * 1000; // Default: hourly
  }

  private async sendNotifications(config: ScanConfig, summary: ScanJobResult, jobId: string): Promise<void> {
    // Implement notification sending
    logger.warn('Security scan thresholds exceeded', {
      configId: config.id,
      jobId,
      violations: summary.violations,
      riskScore: summary.riskScore,
    });
  }

  private generateGitHubAction(config: ScanConfig): string {
    return `
name: Security Code Review
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run security scan
        run: npm run security:scan
        env:
          SCAN_CONFIG_ID: ${config.id}
      - name: Upload results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: security-scan-results
          path: security-report.json
`;
  }

  private generateGitLabCI(config: ScanConfig): string {
    return `
security-scan:
  stage: test
  image: node:18-alpine
  script:
    - npm ci
    - npm run security:scan
  variables:
    SCAN_CONFIG_ID: ${config.id}
  artifacts:
    reports:
      junit: security-report.xml
    paths:
      - security-report.json
  only:
    - merge_requests
    - main
    - develop
`;
  }

  private generateJenkinsfile(config: ScanConfig): string {
    return `
pipeline {
    agent any
    environment {
        SCAN_CONFIG_ID = '${config.id}'
    }
    stages {
        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }
        stage('Security Scan') {
            steps {
                sh 'npm run security:scan'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'security-report.json', allowEmptyArchive: true
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: '.',
                        reportFiles: 'security-report.html',
                        reportName: 'Security Scan Report'
                    ])
                }
            }
        }
    }
}
`;
  }

  private generateGenericScript(config: ScanConfig): string {
    return `#!/bin/bash
# Security scan script for ${config.name}

set -e

echo "Starting security scan..."
export SCAN_CONFIG_ID="${config.id}"

# Install dependencies
npm ci

# Run security scan
npm run security:scan

echo "Security scan completed"
`;
  }
}

// Export singleton instance
export const automatedScanner = AutomatedScanner.getInstance();

// Export convenience methods
export const scanRepository = automatedScanner.scanRepository.bind(automatedScanner);
export const scanFiles = automatedScanner.scanFiles.bind(automatedScanner);
export const scanChangedFiles = automatedScanner.scanChangedFiles.bind(automatedScanner);
export const createScanConfig = automatedScanner.createScanConfig.bind(automatedScanner);