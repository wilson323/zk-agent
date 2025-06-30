/**
 * @file app/api/admin/security/scan/route.ts
 * @description API endpoints for security code scanning
 * @author Security Team
 * @lastUpdate 2024-12-19
 */

import { NextRequest, NextResponse } from 'next/server';
import { automatedScanner } from '@/lib/security/automated-scanner';
import { securityAuditSystem, SecurityEventType, SecuritySeverity } from '@/lib/security/security-audit-system';
import { getErrorMessage } from '@/lib/utils/error-handler';
import { Logger } from '@/lib/utils/logger';

const logger = new Logger('SecurityScanAPI');

// POST /api/admin/security/scan - Start security scan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { configId, includePatterns, excludePatterns, triggeredBy = 'api' } = body;

    // Get client IP for audit logging
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     '127.0.0.1';

    // Start security scan
    const jobId = await automatedScanner.scanRepository({
      configId,
      includePatterns,
      excludePatterns,
      triggeredBy,
    });

    // Record security event
    await securityAuditSystem.recordEvent({
      type: SecurityEventType.SECURITY_SCAN,
      severity: SecuritySeverity.LOW,
      ip: clientIP,
      details: {
        action: 'scan_initiated',
        jobId,
        configId,
        triggeredBy,
      },
      riskScore: 1,
    });

    logger.info('Security scan initiated via API', {
      jobId,
      configId,
      triggeredBy,
      clientIP,
    });

    return NextResponse.json({
      success: true,
      data: { jobId },
      message: 'Security scan started successfully',
    });

  } catch (error) {
    logger.error('Failed to start security scan', {
      error: getErrorMessage(error),
    });

    return NextResponse.json({
      success: false,
      error: 'Failed to start security scan',
      details: getErrorMessage(error),
    }, { status: 500 });
  }
}

// GET /api/admin/security/scan - Get scan status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (jobId) {
      // Get specific scan job
      const job = automatedScanner.getScanJob(jobId);
      
      if (!job) {
        return NextResponse.json({
          success: false,
          error: 'Scan job not found',
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: job,
      });
    } else {
      // Get all scan configurations
      const configs = automatedScanner.getScanConfigs();
      
      return NextResponse.json({
        success: true,
        data: configs,
      });
    }

  } catch (error) {
    logger.error('Failed to get scan information', {
      error: getErrorMessage(error),
    });

    return NextResponse.json({
      success: false,
      error: 'Failed to get scan information',
      details: getErrorMessage(error),
    }, { status: 500 });
  }
}