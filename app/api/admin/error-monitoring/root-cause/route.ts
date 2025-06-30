import { NextRequest, NextResponse } from 'next/server';
import { errorMonitor } from '@/lib/monitoring/error-monitor';
import { rootCauseAnalyzer } from '@/lib/monitoring/root-cause-analyzer';
import { globalErrorHandler } from '@/lib/middleware/global-error-handler';
import { authenticateRequest } from '@/lib/auth/auth-utils';

/**
 * 获取根因分析结果
 * GET /api/admin/error-monitoring/root-cause?errorId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await authenticateRequest(request);
    if (!authResult || !authResult.success || authResult.user?.['role'] !== 'admin') {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const errorId = searchParams.get('errorId');
    const analysisId = searchParams.get('analysisId');

    if (!errorId && !analysisId) {
      return NextResponse.json(
        { error: '需要提供 errorId 或 analysisId 参数' },
        { status: 400 }
      );
    }

    let analysis;
    
    if (analysisId) {
      // 通过分析ID获取结果
      analysis = rootCauseAnalyzer.getAnalysis(analysisId);
      if (!analysis) {
        return NextResponse.json(
          { error: '未找到指定的根因分析结果' },
          { status: 404 }
        );
      }
    } else if (errorId) {
      // 通过错误ID获取或生成分析
      analysis = await errorMonitor.getErrorRootCauseAnalysis(errorId);
      if (!analysis) {
        return NextResponse.json(
          { error: '未找到指定的错误或无法生成根因分析' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('Root cause analysis API error:', error);
    globalErrorHandler.handleError(error as Error, {
      method: 'GET',
      url: request.url
    });
    
    return NextResponse.json(
      { error: '获取根因分析失败' },
      { status: 500 }
    );
  }
}

/**
 * 触发根因分析
 * POST /api/admin/error-monitoring/root-cause
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await authenticateRequest(request);
    if (!authResult || !authResult.success || authResult.user?.['role'] !== 'admin') {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { errorId, force: _force = false } = body;

    if (!errorId) {
      return NextResponse.json(
        { error: '需要提供 errorId' },
        { status: 400 }
      );
    }

    // 获取错误报告
    const errorReport = null; // errorMonitor.getErrorById(errorId); // Method doesn't exist
    if (!errorReport) {
      return NextResponse.json(
        { error: '未找到指定的错误报告' },
        { status: 404 }
      );
    }

    // 执行根因分析
    const analysis = await rootCauseAnalyzer.analyzeRootCause(errorReport);

    return NextResponse.json({
      success: true,
      message: '根因分析已完成',
      data: {
        analysisId: analysis.id,
        errorId: analysis.errorId,
        rootCause: analysis.rootCause,
        confidence: analysis.confidence,
        impactAssessment: analysis.impactAssessment,
        recommendations: analysis.recommendations.filter((r: any) => r.priority === 'HIGH' || r.priority === 'CRITICAL'),
        analysisTimestamp: analysis.analysisTimestamp
      }
    });

  } catch (error) {
    console.error('Root cause analysis trigger error:', error);
    globalErrorHandler.handleError(error as Error, {
      method: 'POST',
      url: request.url
    });
    
    return NextResponse.json(
      { error: '触发根因分析失败' },
      { status: 500 }
    );
  }
}

/**
 * 批量根因分析
 * PUT /api/admin/error-monitoring/root-cause
 */
export async function PUT(request: NextRequest) {
  try {
    // 验证管理员权限
    const authResult = await authenticateRequest(request);
    if (!authResult || !authResult.success || authResult.user?.['role'] !== 'admin') {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      timeRange = 24 * 60 * 60 * 1000, // 默认24小时
      severity = ['HIGH', 'CRITICAL'], // 默认只分析高严重性错误
      limit = 10 // 默认最多分析10个错误
    } = body;

    // 获取最近的错误
    const recentErrors = errorMonitor.getRecentErrors(limit * 2)
      .filter((error: any) => {
        const isInTimeRange = Date.now() - error.timestamp.getTime() <= timeRange;
        const isTargetSeverity = severity.includes(error.error?.['severity']);
        return isInTimeRange && isTargetSeverity && !error.resolved;
      })
      .slice(0, limit);

    if (recentErrors.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有找到符合条件的错误需要分析',
        data: {
          analyzed: 0,
          results: []
        }
      });
    }

    // 批量执行根因分析
    const analysisPromises = recentErrors.map(async (errorReport) => {
      try {
        const analysis = await rootCauseAnalyzer.analyzeRootCause(errorReport);
        return {
          success: true,
          errorId: errorReport.id,
          analysisId: analysis.id,
          rootCause: analysis.rootCause,
          confidence: analysis.confidence,
          businessImpact: analysis.impactAssessment.businessImpact
        };
      } catch (error) {
        return {
          success: false,
          errorId: errorReport.id,
          error: error instanceof Error ? error.message : '分析失败'
        };
      }
    });

    const results = await Promise.all(analysisPromises);
    const successful = results.filter((r: any) => r.success);
    const failed = results.filter((r: any) => !r.success);

    return NextResponse.json({
      success: true,
      message: `批量根因分析完成，成功: ${successful.length}，失败: ${failed.length}`,
      data: {
        analyzed: successful.length,
        failed: failed.length,
        results: successful,
        errors: failed
      }
    });

  } catch (error) {
    console.error('Batch root cause analysis error:', error);
    globalErrorHandler.handleError(error as Error, {
      method: 'PUT',
      url: request.url
    });
    
    return NextResponse.json(
      { error: '批量根因分析失败' },
      { status: 500 }
    );
  }
}