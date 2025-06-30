/**
 * @file lib/security/rule-validator.ts
 * @description Security rule validation and testing framework
 * @author Security Team
 * @lastUpdate 2024-12-19
 * @security Production-level rule validation and testing
 */

import { Logger } from '@/lib/utils/logger';
import { getErrorMessage } from '@/lib/utils/error-handler';
import { SecurityRule, SecurityRuleCategory, SecurityRuleSeverity } from './code-review-system';

const logger = new Logger('RuleValidator');

// Rule validation result
export interface RuleValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  performance: {
    regexComplexity: 'low' | 'medium' | 'high';
    estimatedExecutionTime: number;
    memoryUsage: 'low' | 'medium' | 'high';
  };
}

// Test case for rule validation
export interface RuleTestCase {
  name: string;
  code: string;
  expectedMatches: number;
  expectedPositions?: Array<{ line: number; column: number }>;
  description: string;
}

// Rule validation configuration
export interface ValidationConfig {
  maxRegexComplexity: number;
  maxExecutionTime: number;
  enablePerformanceChecks: boolean;
  enableSecurityChecks: boolean;
  customPatterns?: Array<{
    pattern: RegExp;
    message: string;
    severity: 'error' | 'warning';
  }>;
}

export class RuleValidator {
  private static instance: RuleValidator;
  private validationConfig: ValidationConfig;
  private testCases: Map<string, RuleTestCase[]> = new Map();

  private constructor() {
    this.validationConfig = {
      maxRegexComplexity: 100,
      maxExecutionTime: 1000, // 1 second
      enablePerformanceChecks: true,
      enableSecurityChecks: true,
    };
    this.initializeDefaultTestCases();
  }

  public static getInstance(): RuleValidator {
    if (!RuleValidator.instance) {
      RuleValidator.instance = new RuleValidator();
    }
    return RuleValidator.instance;
  }

  /**
   * Validate a security rule
   */
  async validateRule(rule: SecurityRule): Promise<RuleValidationResult> {
    const result: RuleValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      performance: {
        regexComplexity: 'low',
        estimatedExecutionTime: 0,
        memoryUsage: 'low',
      },
    };

    try {
      // Basic validation
      this.validateBasicProperties(rule, result);
      
      // Regex validation
      this.validateRegexPattern(rule, result);
      
      // Performance validation
      if (this.validationConfig.enablePerformanceChecks) {
        await this.validatePerformance(rule, result);
      }
      
      // Security validation
      if (this.validationConfig.enableSecurityChecks) {
        this.validateSecurity(rule, result);
      }
      
      // Test case validation
      await this.runTestCases(rule, result);
      
      // Generate suggestions
      this.generateSuggestions(rule, result);

      // Mark as invalid if there are errors
      if (result.errors.length > 0) {
        result.valid = false;
      }

      logger.info('Rule validation completed', {
        ruleId: rule.id,
        valid: result.valid,
        errors: result.errors.length,
        warnings: result.warnings.length,
      });

      return result;

    } catch (error) {
      result.valid = false;
      result.errors.push(`Validation failed: ${getErrorMessage(error)}`);
      
      logger.error('Rule validation failed', {
        ruleId: rule.id,
        error: getErrorMessage(error),
      });

      return result;
    }
  }

  /**
   * Test rule against sample code
   */
  async testRule(rule: SecurityRule, testCode: string): Promise<{
    matches: Array<{
      line: number;
      column: number;
      match: string;
      context: string;
    }>;
    executionTime: number;
    memoryUsage: number;
  }> {
    const startTime = process.hrtime.bigint();
    const initialMemory = process.memoryUsage().heapUsed;

    try {
      const matches: Array<{
        line: number;
        column: number;
        match: string;
        context: string;
      }> = [];

      const lines = testCode.split('\n');
      
      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const lineMatches = Array.from(line.matchAll(rule.pattern));
        
        for (const match of lineMatches) {
          matches.push({
            line: lineIndex + 1,
            column: (match.index || 0) + 1,
            match: match[0],
            context: line.trim(),
          });
        }
      }

      const endTime = process.hrtime.bigint();
      const finalMemory = process.memoryUsage().heapUsed;

      return {
        matches,
        executionTime: Number(endTime - startTime) / 1000000, // Convert to milliseconds
        memoryUsage: finalMemory - initialMemory,
      };

    } catch (error) {
      logger.error('Rule testing failed', {
        ruleId: rule.id,
        error: getErrorMessage(error),
      });
      
      throw error;
    }
  }

  /**
   * Batch validate multiple rules
   */
  async validateRules(rules: SecurityRule[]): Promise<Map<string, RuleValidationResult>> {
    const results = new Map<string, RuleValidationResult>();
    
    for (const rule of rules) {
      try {
        const result = await this.validateRule(rule);
        results.set(rule.id, result);
      } catch (error) {
        results.set(rule.id, {
          valid: false,
          errors: [`Validation failed: ${getErrorMessage(error)}`],
          warnings: [],
          suggestions: [],
          performance: {
            regexComplexity: 'high',
            estimatedExecutionTime: -1,
            memoryUsage: 'high',
          },
        });
      }
    }

    logger.info('Batch rule validation completed', {
      totalRules: rules.length,
      validRules: Array.from(results.values()).filter(r => r.valid).length,
      invalidRules: Array.from(results.values()).filter(r => !r.valid).length,
    });

    return results;
  }

  /**
   * Add custom test case for a rule
   */
  addTestCase(ruleId: string, testCase: RuleTestCase): void {
    const existingTests = this.testCases.get(ruleId) || [];
    existingTests.push(testCase);
    this.testCases.set(ruleId, existingTests);

    logger.info('Test case added', {
      ruleId,
      testName: testCase.name,
    });
  }

  /**
   * Get test cases for a rule
   */
  getTestCases(ruleId: string): RuleTestCase[] {
    return this.testCases.get(ruleId) || [];
  }

  /**
   * Update validation configuration
   */
  updateConfig(config: Partial<ValidationConfig>): void {
    this.validationConfig = { ...this.validationConfig, ...config };
    
    logger.info('Validation configuration updated', {
      updates: Object.keys(config),
    });
  }

  /**
   * Private: Validate basic rule properties
   */
  private validateBasicProperties(rule: SecurityRule, result: RuleValidationResult): void {
    // Required fields
    if (!rule.id || typeof rule.id !== 'string') {
      result.errors.push('Rule ID is required and must be a string');
    }

    if (!rule.name || typeof rule.name !== 'string') {
      result.errors.push('Rule name is required and must be a string');
    }

    if (!rule.description || typeof rule.description !== 'string') {
      result.errors.push('Rule description is required and must be a string');
    }

    // Validate category
    if (!Object.values(SecurityRuleCategory).includes(rule.category)) {
      result.errors.push(`Invalid rule category: ${rule.category}`);
    }

    // Validate severity
    if (!Object.values(SecurityRuleSeverity).includes(rule.severity)) {
      result.errors.push(`Invalid rule severity: ${rule.severity}`);
    }

    // Validate file extensions
    if (!Array.isArray(rule.fileExtensions) || rule.fileExtensions.length === 0) {
      result.errors.push('Rule must specify at least one file extension');
    }

    rule.fileExtensions.forEach(ext => {
      if (!ext.startsWith('.')) {
        result.warnings.push(`File extension should start with dot: ${ext}`);
      }
    });

    // Validate remediation
    if (!rule.remediation || typeof rule.remediation !== 'string') {
      result.warnings.push('Rule should include remediation guidance');
    }

    // Validate references
    if (!Array.isArray(rule.references)) {
      result.warnings.push('Rule should include security references');
    }
  }

  /**
   * Private: Validate regex pattern
   */
  private validateRegexPattern(rule: SecurityRule, result: RuleValidationResult): void {
    try {
      // Test if regex is valid
      const testString = 'test';
      rule.pattern.test(testString);

      // Check for common regex issues
      const patternSource = rule.pattern.source;

      // Check for catastrophic backtracking
      if (this.hasCatastrophicBacktracking(patternSource)) {
        result.errors.push('Regex pattern may cause catastrophic backtracking');
      }

      // Check for case sensitivity
      if (!rule.pattern.flags.includes('i') && patternSource.includes('[a-z]')) {
        result.warnings.push('Consider making pattern case-insensitive with /i flag');
      }

      // Check for global flag
      if (!rule.pattern.flags.includes('g')) {
        result.warnings.push('Consider using global flag /g to find all matches');
      }

      // Check for overly broad patterns
      if (patternSource.includes('.*') && patternSource.length < 10) {
        result.warnings.push('Pattern may be too broad and generate false positives');
      }

      // Check for anchors
      if (!patternSource.includes('^') && !patternSource.includes('$') && 
          !patternSource.includes('\\b')) {
        result.suggestions.push('Consider using word boundaries (\\b) or anchors (^ $) for more precise matching');
      }

    } catch (error) {
      result.errors.push(`Invalid regex pattern: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Private: Validate performance characteristics
   */
  private async validatePerformance(rule: SecurityRule, result: RuleValidationResult): Promise<void> {
    try {
      // Calculate regex complexity
      const complexity = this.calculateRegexComplexity(rule.pattern.source);
      result.performance.regexComplexity = complexity;

      if (complexity === 'high') {
        result.warnings.push('High regex complexity may impact performance');
      }

      // Test execution time with sample data
      const sampleCode = this.generateSampleCode(rule.fileExtensions[0]);
      const testResult = await this.testRule(rule, sampleCode);
      
      result.performance.estimatedExecutionTime = testResult.executionTime;
      result.performance.memoryUsage = this.categorizeMemoryUsage(testResult.memoryUsage);

      if (testResult.executionTime > this.validationConfig.maxExecutionTime) {
        result.warnings.push(`Execution time (${testResult.executionTime}ms) exceeds threshold`);
      }

      if (result.performance.memoryUsage === 'high') {
        result.warnings.push('High memory usage detected during pattern matching');
      }

    } catch (error) {
      result.warnings.push(`Performance validation failed: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Private: Validate security aspects
   */
  private validateSecurity(rule: SecurityRule, result: RuleValidationResult): void {
    const patternSource = rule.pattern.source;

    // Check for potential ReDoS patterns
    const redosPatterns = [
      /\(\.\*\+\)/,
      /\(\.\+\*\)/,
      /\(\[.*\]\+\)\+/,
      /\(\[.*\]\*\)\+/,
    ];

    for (const redosPattern of redosPatterns) {
      if (redosPattern.test(patternSource)) {
        result.errors.push('Pattern contains potential ReDoS (Regular Expression Denial of Service) vulnerability');
        break;
      }
    }

    // Check for overly permissive patterns
    if (patternSource === '.*' || patternSource === '.+') {
      result.errors.push('Pattern is too permissive and will match everything');
    }

    // Check for patterns that might leak sensitive data
    const sensitivePatterns = ['password', 'token', 'key', 'secret'];
    const lowerPattern = patternSource.toLowerCase();
    
    for (const sensitive of sensitivePatterns) {
      if (lowerPattern.includes(sensitive) && !lowerPattern.includes('\\b')) {
        result.suggestions.push(`Consider using word boundaries when matching '${sensitive}' to avoid false positives`);
      }
    }

    // Validate pattern matches intended security issue
    this.validateSecurityRelevance(rule, result);
  }

  /**
   * Private: Run test cases against rule
   */
  private async runTestCases(rule: SecurityRule, result: RuleValidationResult): Promise<void> {
    const testCases = this.testCases.get(rule.id) || this.getDefaultTestCases(rule.category);
    
    for (const testCase of testCases) {
      try {
        const testResult = await this.testRule(rule, testCase.code);
        
        if (testResult.matches.length !== testCase.expectedMatches) {
          result.warnings.push(
            `Test case '${testCase.name}': expected ${testCase.expectedMatches} matches, got ${testResult.matches.length}`
          );
        }

        // Check expected positions if provided
        if (testCase.expectedPositions) {
          for (let i = 0; i < testCase.expectedPositions.length; i++) {
            const expected = testCase.expectedPositions[i];
            const actual = testResult.matches[i];
            
            if (!actual || actual.line !== expected.line || actual.column !== expected.column) {
              result.warnings.push(
                `Test case '${testCase.name}': position mismatch at match ${i + 1}`
              );
            }
          }
        }

      } catch (error) {
        result.errors.push(`Test case '${testCase.name}' failed: ${getErrorMessage(error)}`);
      }
    }
  }

  /**
   * Private: Generate improvement suggestions
   */
  private generateSuggestions(rule: SecurityRule, result: RuleValidationResult): void {
    // Suggest improvements based on category
    switch (rule.category) {
      case SecurityRuleCategory.INPUT_VALIDATION:
        if (!rule.pattern.source.includes('\\b')) {
          result.suggestions.push('Consider using word boundaries for input validation patterns');
        }
        break;
        
      case SecurityRuleCategory.INJECTION_PREVENTION:
        if (rule.severity !== SecurityRuleSeverity.HIGH && rule.severity !== SecurityRuleSeverity.CRITICAL) {
          result.suggestions.push('Injection prevention rules should typically be HIGH or CRITICAL severity');
        }
        break;
        
      case SecurityRuleCategory.CRYPTOGRAPHY:
        if (!rule.remediation.toLowerCase().includes('secure')) {
          result.suggestions.push('Cryptography rules should emphasize secure alternatives in remediation');
        }
        break;
    }

    // Suggest documentation improvements
    if (rule.references.length === 0) {
      result.suggestions.push('Add security references (OWASP, CWE, etc.) for better context');
    }

    if (rule.remediation.length < 50) {
      result.suggestions.push('Provide more detailed remediation guidance');
    }
  }

  /**
   * Private: Helper methods
   */
  private hasCatastrophicBacktracking(pattern: string): boolean {
    // Simple heuristic for catastrophic backtracking detection
    const problematicPatterns = [
      /\(\.\*\)\+/,
      /\(\.\+\)\*/,
      /\(\[.*?\]\+\)\+/,
      /\(\.\*\?\)\*/,
    ];

    return problematicPatterns.some(p => p.test(pattern));
  }

  private calculateRegexComplexity(pattern: string): 'low' | 'medium' | 'high' {
    let complexity = 0;
    
    // Count complex constructs
    complexity += (pattern.match(/\(.*?\)/g) || []).length * 2; // Groups
    complexity += (pattern.match(/\[.*?\]/g) || []).length; // Character classes
    complexity += (pattern.match(/[+*?{]/g) || []).length; // Quantifiers
    complexity += (pattern.match(/\|/g) || []).length * 2; // Alternations
    complexity += (pattern.match(/\\\w/g) || []).length; // Escape sequences

    if (complexity > 20) {return 'high';}
    if (complexity > 10) {return 'medium';}
    return 'low';
  }

  private categorizeMemoryUsage(bytes: number): 'low' | 'medium' | 'high' {
    if (bytes > 1024 * 1024) {return 'high';} // > 1MB
    if (bytes > 100 * 1024) {return 'medium';} // > 100KB
    return 'low';
  }

  private generateSampleCode(fileExtension: string): string {
    const samples: Record<string, string> = {
      '.js': `
        const password = "hardcoded123";
        eval(userInput);
        document.innerHTML = unsafeData;
        console.log("debug info");
      `,
      '.ts': `
        const apiKey: string = "sk-1234567890abcdef";
        const result = eval(dynamicCode);
        Math.random();
      `,
      '.py': `
        password = "secret123"
        eval(user_input)
        exec(dangerous_code)
      `,
      '.java': `
        String password = "hardcoded";
        Runtime.getRuntime().exec(command);
      `,
    };

    return samples[fileExtension] || samples['.js'];
  }

  private validateSecurityRelevance(rule: SecurityRule, result: RuleValidationResult): void {
    const pattern = rule.pattern.source.toLowerCase();
    const category = rule.category;

    // Validate pattern relevance to category
    const categoryPatterns: Record<SecurityRuleCategory, string[]> = {
      [SecurityRuleCategory.INPUT_VALIDATION]: ['input', 'validate', 'sanitize', 'escape'],
      [SecurityRuleCategory.INJECTION_PREVENTION]: ['sql', 'inject', 'eval', 'exec'],
      [SecurityRuleCategory.CRYPTOGRAPHY]: ['crypto', 'random', 'hash', 'encrypt'],
      [SecurityRuleCategory.ACCESS_CONTROL]: ['auth', 'permission', 'role', 'access'],
      [SecurityRuleCategory.DATA_PROTECTION]: ['password', 'secret', 'key', 'token'],
      [SecurityRuleCategory.OUTPUT_ENCODING]: ['innerHTML', 'output', 'encode', 'escape'],
      [SecurityRuleCategory.ERROR_HANDLING]: ['error', 'exception', 'catch', 'throw'],
      [SecurityRuleCategory.LOGGING_AUDITING]: ['log', 'audit', 'track', 'monitor'],
      [SecurityRuleCategory.SESSION_MANAGEMENT]: ['session', 'cookie', 'jwt', 'token'],
      [SecurityRuleCategory.CONFIGURATION]: ['config', 'setting', 'env', 'property'],
    };

    const relevantKeywords = categoryPatterns[category] || [];
    const hasRelevantKeyword = relevantKeywords.some(keyword => 
      pattern.includes(keyword) || rule.name.toLowerCase().includes(keyword)
    );

    if (!hasRelevantKeyword) {
      result.warnings.push(`Pattern may not be relevant to category '${category}'`);
    }
  }

  private initializeDefaultTestCases(): void {
    // Add default test cases for common rule categories
    this.testCases.set('eval-detection', [
      {
        name: 'Basic eval usage',
        code: 'eval("alert(1)")',
        expectedMatches: 1,
        description: 'Should detect basic eval usage',
      },
      {
        name: 'No false positives',
        code: 'const evaluate = () => {}',
        expectedMatches: 0,
        description: 'Should not match similar words',
      },
    ]);
  }

  private getDefaultTestCases(category: SecurityRuleCategory): RuleTestCase[] {
    // Return category-specific default test cases
    return [];
  }
}

// Export singleton instance
export const ruleValidator = RuleValidator.getInstance();

// Export convenience methods
export const validateRule = ruleValidator.validateRule.bind(ruleValidator);
export const testRule = ruleValidator.testRule.bind(ruleValidator);
export const validateRules = ruleValidator.validateRules.bind(ruleValidator);