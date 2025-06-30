'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Download, Play, Square, RotateCcw, AlertTriangle, CheckCircle, XCircle, Search } from 'lucide-react';
import { toast } from 'sonner';

interface ErrorMonitoringStatus {
  monitoring: {
    isActive: boolean;
    config: {
      interval: number;
      errorRateThreshold: number;
      criticalErrorThreshold: number;
      autoRecoveryEnabled: boolean;
      notificationsEnabled: boolean;
    };
  };
  errorStats: {
    total: number;
    recentErrors: number;
    errorRate: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  alerts: {
    active: number;
    list: Array<{
      id: string;
      message: string;
      severity: string;
      timestamp: string;
      resolved: boolean;
    }>;
  };
  recentErrors: Array<{
    id: string;
    message: string;
    type: string;
    severity: string;
    timestamp: string;
    resolved: boolean;
  }>;
  healthCheck: {
    status: string;
    score: number;
    issues: string[];
  };
  tracker: {
    totalTracked: number;
    recentActivity: number;
    isActive: boolean;
  };
  timestamp: string;
}

interface ErrorReport {
  reportMetadata: {
    generatedAt: string;
    timeRange: {
      start: string;
      end: string;
      duration: string;
    };
    totalErrors: number;
  };
  summary: {
    healthStatus: string;
    healthScore: number;
    activeAlertsCount: number;
    totalErrorsInPeriod: number;
    errorRate: number;
    criticalIssues: number;
  };
  recommendations: Array<{
    priority: string;
    category: string;
    message: string;
    action: string;
  }>;
}

interface RootCauseAnalysis {
  rootCause: string;
  confidence: number;
  impactAssessment?: {
    affectedUsers: number;
    businessImpact: string;
  };
  recommendations?: Array<{
    priority: string;
    action: string;
  }>;
  analysisTimestamp: string;
}

export default function ErrorMonitoringPage() {
  const [status, setStatus] = useState<ErrorMonitoringStatus | null>(null);
  const [report, setReport] = useState<ErrorReport | null>(null);
  const [rootCauseAnalysis, setRootCauseAnalysis] = useState<RootCauseAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [_selectedErrorId, _setSelectedErrorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState<Set<string>>(new Set());

  // 获取监控状态
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/error-monitoring/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data.data);
      } else {
        toast.error('获取监控状态失败');
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
      toast.error('获取监控状态失败');
    }
  };

  // 获取监控报告
  const fetchReport = async (timeRange: string = '24h') => {
    try {
      const response = await fetch(`/api/admin/error-monitoring/report?timeRange=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setReport(data.data);
      } else {
        toast.error('获取监控报告失败');
      }
    } catch (error) {
      // console.log("Error fetching error report:", error);
      toast.error('获取监控报告失败');
    }
  };

  // 控制监控系统
  const controlMonitoring = async (action: 'start' | 'stop' | 'restart') => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/admin/error-monitoring/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        await fetchStatus();
      } else {
        toast.error('操作失败');
      }
    } catch (error) {
      console.error('Failed to control monitoring:', error);
      toast.error('操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  // 下载报告
  const downloadReport = async (format: 'json' | 'csv' = 'csv') => {
    try {
      const response = await fetch(`/api/admin/error-monitoring/report?timeRange=${selectedTimeRange}&format=${format}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `error-report-${selectedTimeRange}-${new Date().toISOString().slice(0, 10)}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('报告下载成功');
      } else {
        toast.error('下载报告失败');
      }
    } catch (error) {
      console.error('Failed to download report:', error);
      toast.error('下载报告失败');
    }
  };

  // 获取根因分析
  const getRootCauseAnalysis = async (errorId: string) => {
    try {
      setError(null);
      setLoading(true);
      const response = await fetch(`/api/admin/error-monitoring/root-cause?errorId=${encodeURIComponent(errorId)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setRootCauseAnalysis(result.data);
        _setSelectedErrorId(errorId);
      } else {
        throw new Error(result.error || '获取根因分析失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取根因分析失败';
      // console.error('获取根因分析失败:', error);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 触发根因分析
  const triggerRootCauseAnalysis = async (errorId: string) => {
    try {
      setError(null);
      setSuccess(null);
      setAnalysisLoading(prev => new Set(prev).add(errorId));
      
      const response = await fetch('/api/admin/error-monitoring/root-cause', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ errorId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setRootCauseAnalysis(result.data);
        _setSelectedErrorId(errorId);
        setSuccess('根因分析触发成功');
        await fetchData(); // 刷新数据
      } else {
        throw new Error(result.error || '触发根因分析失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '触发根因分析失败';
      // console.error('触发根因分析失败:', error);
      setError(errorMessage);
    } finally {
      setAnalysisLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(errorId);
        return newSet;
      });
    }
  };

  // 批量根因分析
  const batchRootCauseAnalysis = async () => {
    try {
      setError(null);
      setSuccess(null);
      setLoading(true);
      
      const response = await fetch('/api/admin/error-monitoring/root-cause', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeRange: 24 * 60 * 60 * 1000, // 24小时
          severity: ['HIGH', 'CRITICAL'],
          limit: 10
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        await fetchData(); // 刷新数据
        setSuccess(`批量分析完成：成功 ${result.data.analyzed} 个，失败 ${result.data.failed} 个`);
      } else {
        throw new Error(result.error || '批量根因分析失败');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '批量根因分析失败';
      // console.error('批量根因分析失败:', error);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 刷新数据
  const fetchData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchStatus(),
      fetchReport(selectedTimeRange)
    ]);
    setLoading(false);
  }, [selectedTimeRange]);

  const refreshData = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    refreshData();
  }, [selectedTimeRange, refreshData]);

  // 自动刷新
  useEffect(() => {
    const interval = setInterval(() => {
      if (!actionLoading) {
        fetchStatus();
      }
    }, 30000); // 30秒刷新一次

    return () => clearInterval(interval);
  }, [actionLoading]);

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'text-green-600';
      case 'WARNING': return 'text-yellow-600';
      case 'UNHEALTHY': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">加载中...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">错误监控系统</h1>
          <p className="text-muted-foreground">实时监控系统错误和性能指标</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={refreshData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button
            variant="outline"
            onClick={() => downloadReport('csv')}
          >
            <Download className="h-4 w-4 mr-2" />
            下载报告
          </Button>
        </div>
      </div>

      {/* 系统状态概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">系统健康状态</CardTitle>
            {status?.healthCheck.status === 'HEALTHY' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : status?.healthCheck.status === 'WARNING' ? (
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthStatusColor(status?.healthCheck.status || '')}`}>
              {status?.healthCheck.status || 'UNKNOWN'}
            </div>
            <p className="text-xs text-muted-foreground">
              健康评分: {status?.healthCheck.score || 0}/100
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总错误数</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.errorStats.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              最近错误: {status?.errorStats.recentErrors || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">错误率</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.errorStats.errorRate?.toFixed(2) || 0} /分钟
            </div>
            <p className="text-xs text-muted-foreground">
              阈值: {status?.monitoring.config.errorRateThreshold || 0} /分钟
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃告警</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {status?.alerts.active || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              需要处理的告警
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 监控控制 */}
      <Card>
        <CardHeader>
          <CardTitle>监控控制</CardTitle>
          <CardDescription>管理错误监控系统的运行状态</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">状态:</span>
              <Badge variant={status?.monitoring.isActive ? 'default' : 'secondary'}>
                {status?.monitoring.isActive ? '运行中' : '已停止'}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => controlMonitoring('start')}
                disabled={actionLoading || status?.monitoring.isActive}
              >
                <Play className="h-4 w-4 mr-2" />
                启动
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => controlMonitoring('stop')}
                disabled={actionLoading || !status?.monitoring.isActive}
              >
                <Square className="h-4 w-4 mr-2" />
                停止
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => controlMonitoring('restart')}
                disabled={actionLoading}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                重启
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => batchRootCauseAnalysis()}
                disabled={actionLoading}
              >
                <Search className="h-4 w-4 mr-2" />
                批量分析
              </Button>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">检查间隔:</span>
              <span className="ml-2">{status?.monitoring.config.interval || 0}ms</span>
            </div>
            <div>
              <span className="font-medium">自动恢复:</span>
              <span className="ml-2">{status?.monitoring.config.autoRecoveryEnabled ? '启用' : '禁用'}</span>
            </div>
            <div>
              <span className="font-medium">通知:</span>
              <span className="ml-2">{status?.monitoring.config.notificationsEnabled ? '启用' : '禁用'}</span>
            </div>
            <div>
              <span className="font-medium">追踪器:</span>
              <span className="ml-2">{status?.tracker.isActive ? '活跃' : '非活跃'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
        <TabsList>
          <TabsTrigger value="1h">1小时</TabsTrigger>
          <TabsTrigger value="6h">6小时</TabsTrigger>
          <TabsTrigger value="24h">24小时</TabsTrigger>
          <TabsTrigger value="7d">7天</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTimeRange} className="space-y-6">
              {/* 错误和成功消息显示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">错误</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      className="bg-red-50 text-red-800 rounded-md p-2 inline-flex items-center text-sm font-medium hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      onClick={() => setError(null)}
                    >
                      关闭
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">成功</h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>{success}</p>
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      className="bg-green-50 text-green-800 rounded-md p-2 inline-flex items-center text-sm font-medium hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      onClick={() => setSuccess(null)}
                    >
                      关闭
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 活跃告警 */}
          {status?.alerts.list && status.alerts.list.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>活跃告警</CardTitle>
                <CardDescription>需要立即处理的告警</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {status.alerts.list.map((alert) => (
                    <Alert key={alert.id}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="flex justify-between items-center">
                        <div className="flex-1">
                          <span className="font-medium">{alert.message}</span>
                          <Badge className={`ml-2 ${getSeverityColor(alert.severity)}`}>
                            {alert.severity}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(alert.timestamp).toLocaleString()}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => triggerRootCauseAnalysis(alert.id)}
                            disabled={analysisLoading.has(alert.id)}
                          >
                            {analysisLoading.has(alert.id) ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                分析中...
                              </>
                            ) : (
                              '根因分析'
                            )}
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 根因分析结果 */}
          {rootCauseAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span className="text-purple-600">🔍 根因分析结果</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRootCauseAnalysis(null)}
                  >
                    ✕
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-purple-50 rounded">
                      <h4 className="font-medium text-purple-800 mb-2">根本原因</h4>
                      <p className="text-sm text-purple-700">{rootCauseAnalysis.rootCause}</p>
                      <p className="text-xs text-purple-600 mt-1">
                        置信度: {(rootCauseAnalysis.confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                    
                    <div className="p-4 bg-blue-50 rounded">
                      <h4 className="font-medium text-blue-800 mb-2">影响评估</h4>
                      <p className="text-sm text-blue-700">
                        受影响用户: {rootCauseAnalysis.impactAssessment?.affectedUsers || 0}
                      </p>
                      <p className="text-sm text-blue-700">
                        业务影响: {rootCauseAnalysis.impactAssessment?.businessImpact || 'LOW'}
                      </p>
                    </div>
                  </div>
                  
                  {rootCauseAnalysis.recommendations && rootCauseAnalysis.recommendations.length > 0 && (
                    <div className="p-4 bg-green-50 rounded">
                      <h4 className="font-medium text-green-800 mb-2">修复建议</h4>
                      <div className="space-y-2">
                        {rootCauseAnalysis.recommendations.slice(0, 3).map((rec: any, index: number) => (
                          <div key={index} className="flex items-start gap-2">
                            <Badge className={getSeverityColor(rec.priority)}>
                              {rec.priority}
                            </Badge>
                            <p className="text-sm text-green-700 flex-1">{rec.action}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    分析时间: {new Date(rootCauseAnalysis.analysisTimestamp).toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 建议 */}
          {report?.recommendations && report.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>系统建议</CardTitle>
                <CardDescription>基于当前错误分析的改进建议</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.recommendations.map((rec, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4">
                      <div className="flex items-center gap-2">
                        <Badge variant={rec.priority === 'HIGH' ? 'destructive' : 'secondary'}>
                          {rec.priority}
                        </Badge>
                        <span className="font-medium">{rec.category}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{rec.message}</p>
                      <p className="text-sm font-medium mt-1">{rec.action}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 最近错误 */}
          <Card>
            <CardHeader>
              <CardTitle>最近错误</CardTitle>
              <CardDescription>最新发生的错误列表</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {status?.recentErrors && status.recentErrors.length > 0 ? (
                  status.recentErrors.slice(0, 10).map((error) => (
                    <div key={error.id} className="flex justify-between items-center p-3 border rounded">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className={getSeverityColor(error.severity)}>
                            {error.severity}
                          </Badge>
                          <span className="font-medium">{error.type}</span>
                          {error.resolved && (
                            <Badge variant="outline" className="text-green-600">
                              已解决
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {error.message}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => getRootCauseAnalysis(error.id)}
                          disabled={loading}
                        >
                          <Search className="h-3 w-3" />
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {new Date(error.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    暂无错误记录
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}