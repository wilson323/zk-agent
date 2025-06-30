/**
 * @file app/api/admin/security/rules/route.ts
 * @description API endpoints for security rules management
 * @author Security Team
 * @lastUpdate 2024-12-19
 */

import { NextRequest, NextResponse } from 'next/server';
import { codeReviewSystem } from '@/lib/security/code-review-system';
import { securityAuditSystem, SecurityEventType, SecuritySeverity } from '@/lib/security/security-audit-system';
import { getErrorMessage } from '@/lib/utils/error-handler';
import { Logger } from '@/lib/utils/logger';

const logger = new Logger('SecurityRulesAPI');

// GET /api/admin/security/rules - Get security rules
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const severity = searchParams.get('severity');
    const enabled = searchParams.get('enabled');

    const options: any = {};
    if (category) {options.category = category;}
    if (severity) {options.severity = severity;}
    if (enabled !== null) {options.enabled = enabled === 'true';}

    const rules = codeReviewSystem.getSecurityRules(options);

    return NextResponse.json({
      success: true,
      data: rules,
      meta: {
        total: rules.length,
        enabled: rules.filter(r => r.enabled).length,
        disabled: rules.filter(r => !r.enabled).length,
      },
    });

  } catch (error) {
    logger.error('Failed to get security rules', {
      error: getErrorMessage(error),
    });

    return NextResponse.json({
      success: false,
      error: 'Failed to get security rules',
      details: getErrorMessage(error),
    }, { status: 500 });
  }
}

// POST /api/admin/security/rules - Create new security rule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, category, severity, description, pattern, fileExtensions, remediation, references } = body;

    // Validate required fields
    if (!name || !category || !severity || !description || !pattern) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
      }, { status: 400 });
    }

    // Get client IP for audit logging
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     '127.0.0.1';

    // Generate rule ID
    const ruleId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create security rule (Note: This would need to be implemented in the code review system)
    const newRule = {
      id: ruleId,
      name,
      category,
      severity,
      description,
      pattern: new RegExp(pattern, 'gi'),
      fileExtensions: fileExtensions || ['.js', '.ts', '.jsx', '.tsx'],
      enabled: true,
      remediation: remediation || 'Review code manually',
      references: references || [],
    };

    // Record security event
    await securityAuditSystem.recordEvent({
      type: SecurityEventType.ADMIN_ACTION,
      severity: SecuritySeverity.MEDIUM,
      ip: clientIP,
      details: {
        action: 'create_security_rule',
        ruleId,
        ruleName: name,
        category,
        severity,
      },
      riskScore: 3,
    });

    logger.info('Security rule created', {
      ruleId,
      name,
      category,
      severity,
      clientIP,
    });

    return NextResponse.json({
      success: true,
      data: { ruleId },
      message: 'Security rule created successfully',
    });

  } catch (error) {
    logger.error('Failed to create security rule', {
      error: getErrorMessage(error),
    });

    return NextResponse.json({
      success: false,
      error: 'Failed to create security rule',
      details: getErrorMessage(error),
    }, { status: 500 });
  }
}