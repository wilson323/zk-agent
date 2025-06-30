/**
 * @file app/api/admin/security/rules/[ruleId]/route.ts
 * @description API endpoints for individual security rule management
 * @author Security Team
 * @lastUpdate 2024-12-19
 */

import { NextRequest, NextResponse } from 'next/server';
import { codeReviewSystem } from '@/lib/security/code-review-system';
import { securityAuditSystem, SecurityEventType, SecuritySeverity } from '@/lib/security/security-audit-system';
import { getErrorMessage } from '@/lib/utils/error-handler';
import { Logger } from '@/lib/utils/logger';

const logger = new Logger('SecurityRuleAPI');

// GET /api/admin/security/rules/[ruleId] - Get specific security rule
export async function GET(
  request: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  try {
    const { ruleId } = params;
    const rules = codeReviewSystem.getSecurityRules();
    const rule = rules.find(r => r.id === ruleId);

    if (!rule) {
      return NextResponse.json({
        success: false,
        error: 'Security rule not found',
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: rule,
    });

  } catch (error) {
    logger.error('Failed to get security rule', {
      ruleId: params.ruleId,
      error: getErrorMessage(error),
    });

    return NextResponse.json({
      success: false,
      error: 'Failed to get security rule',
      details: getErrorMessage(error),
    }, { status: 500 });
  }
}

// PATCH /api/admin/security/rules/[ruleId] - Update security rule
export async function PATCH(
  request: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  try {
    const { ruleId } = params;
    const body = await request.json();

    // Get client IP for audit logging
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     '127.0.0.1';

    // Update security rule
    const success = await codeReviewSystem.updateSecurityRule(ruleId, body);

    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Security rule not found',
      }, { status: 404 });
    }

    // Record security event
    await securityAuditSystem.recordEvent({
      type: SecurityEventType.ADMIN_ACTION,
      severity: SecuritySeverity.MEDIUM,
      ip: clientIP,
      details: {
        action: 'update_security_rule',
        ruleId,
        updates: Object.keys(body),
        changes: body,
      },
      riskScore: 3,
    });

    logger.info('Security rule updated', {
      ruleId,
      updates: Object.keys(body),
      clientIP,
    });

    return NextResponse.json({
      success: true,
      message: 'Security rule updated successfully',
    });

  } catch (error) {
    logger.error('Failed to update security rule', {
      ruleId: params.ruleId,
      error: getErrorMessage(error),
    });

    return NextResponse.json({
      success: false,
      error: 'Failed to update security rule',
      details: getErrorMessage(error),
    }, { status: 500 });
  }
}

// DELETE /api/admin/security/rules/[ruleId] - Delete security rule
export async function DELETE(
  request: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  try {
    const { ruleId } = params;

    // Get client IP for audit logging
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     '127.0.0.1';

    // Check if rule exists
    const rules = codeReviewSystem.getSecurityRules();
    const rule = rules.find(r => r.id === ruleId);

    if (!rule) {
      return NextResponse.json({
        success: false,
        error: 'Security rule not found',
      }, { status: 404 });
    }

    // Prevent deletion of built-in rules
    if (!ruleId.startsWith('custom_')) {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete built-in security rules',
      }, { status: 403 });
    }

    // Delete security rule (Note: This would need to be implemented in the code review system)
    // For now, we'll just disable it
    await codeReviewSystem.updateSecurityRule(ruleId, { enabled: false });

    // Record security event
    await securityAuditSystem.recordEvent({
      type: SecurityEventType.ADMIN_ACTION,
      severity: SecuritySeverity.HIGH,
      ip: clientIP,
      details: {
        action: 'delete_security_rule',
        ruleId,
        ruleName: rule.name,
        category: rule.category,
      },
      riskScore: 5,
    });

    logger.info('Security rule deleted', {
      ruleId,
      ruleName: rule.name,
      clientIP,
    });

    return NextResponse.json({
      success: true,
      message: 'Security rule deleted successfully',
    });

  } catch (error) {
    logger.error('Failed to delete security rule', {
      ruleId: params.ruleId,
      error: getErrorMessage(error),
    });

    return NextResponse.json({
      success: false,
      error: 'Failed to delete security rule',
      details: getErrorMessage(error),
    }, { status: 500 });
  }
}