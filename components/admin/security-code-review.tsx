/**
 * @file components/admin/security-code-review.tsx
 * @description Admin interface for security code review system
 * @author Security Team
 * @lastUpdate 2024-12-19
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Shield, 
  Play, 
  Pause, 
  RefreshCw, 
  Download, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileSearch,
  Target,
  BarChart3
} from 'lucide-react';

// Types
interface SecurityRule {
  id: string;
  name: string;
  category: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  description: string;
  enabled: boolean;
  fileExtensions: string[];
}

interface ScanJob {
  id: string;
  configId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
  triggeredBy: 'schedule' | 'commit' | 'manual' | 'api';
  results?: {
    totalFiles: number;
    scannedFiles: number;
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
  };
}

interface ScanConfig {
  id: string;
  name: string;
  enabled: boolean;
  schedule?: string;
  includePatterns: string[];
  excludePatterns: string[];
  thresholds: {
    critical: number;
    high: number;
    medium: number;
    riskScore: number;
  };
}

const SecurityCodeReview: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [scanJobs, setScanJobs] = useState<ScanJob[]>([]);
  const [scanConfigs, setScanConfigs] = useState<ScanConfig[]>([]);
  const [securityRules, setSecurityRules] = useState<SecurityRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<string>('default');

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load scan jobs, configs, and rules
      await Promise.all([
        loadScanJobs(),
        loadScanConfigs(),
        loadSecurityRules(),
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadScanJobs = async () => {
    try {
      const response = await fetch('/api/admin/security/scan-jobs');
      if (response.ok) {
        const jobs = await response.json();
        setScanJobs(jobs);
      }
    } catch (error) {
      console.error('Failed to load scan jobs:', error);
    }
  };

  const loadScanConfigs = async () => {
    try {
      const response = await fetch('/api/admin/security/scan-configs');
      if (response.ok) {
        const configs = await response.json();
        setScanConfigs(configs);
      }
    } catch (error) {
      console.error('Failed to load scan configs:', error);
    }
  };

  const loadSecurityRules = async () => {
    try {
      const response = await fetch('/api/admin/security/rules');
      if (response.ok) {
        const rules = await response.json();
        setSecurityRules(rules);
      }
    } catch (error) {
      console.error('Failed to load security rules:', error);
    }
  };

  const startScan = async (configId?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/security/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configId: configId || selectedConfig,
          triggeredBy: 'manual',
        }),
      });

      if (response.ok) {
        const { jobId } = await response.json();
        await loadScanJobs();
        // Auto-refresh job status
        pollJobStatus(jobId);
      }
    } catch (error) {
      console.error('Failed to start scan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const pollJobStatus = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/admin/security/scan-jobs/${jobId}`);
        if (response.ok) {
          const job = await response.json();
          if (job.status === 'completed' || job.status === 'failed') {
            clearInterval(interval);
            await loadScanJobs();
          }
        }
      } catch (error) {
        clearInterval(interval);
      }
    }, 2000);
  };

  const downloadReport = async (jobId: string) => {
    try {
      const response = await fetch(`/api/admin/security/scan-jobs/${jobId}/report`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-report-${jobId}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to download report:', error);
    }
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/admin/security/rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        await loadSecurityRules();
      }
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  };

  import { getSeverityColor, getStatusIcon, formatDuration } from "@/lib/admin/security-utils"

  const DashboardTab = () => {
    const recentJobs = scanJobs.slice(0, 5);
    const totalViolations = scanJobs.reduce((sum, job) => 
      sum + (job.results?.violations.total || 0), 0);
    const criticalIssues = scanJobs.reduce((sum, job) => 
      sum + (job.results?.violations.critical || 0), 0);

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Scans"
            icon={Shield}
            value={scanJobs.length}
          />

          <StatCard
            title="Critical Issues"
            icon={AlertTriangle}
            value={criticalIssues}
          />

          <StatCard
            title="Total Violations"
            icon={Target}
            value={totalViolations}
          />

          <StatCard
            title="Active Rules"
            icon={BarChart3}
            value={securityRules.filter(r => r.enabled).length}
          />
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <Select value={selectedConfig} onValueChange={setSelectedConfig}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select configuration" />
                </SelectTrigger>
                <SelectContent>
                  {scanConfigs.map(config => (
                    <SelectItem key={config.id} value={config.id}>
                      {config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                onClick={() => startScan()} 
                disabled={isLoading}
                className="flex items-center space-x-2"
              >
                <Play className="h-4 w-4" />
                <span>Start Scan</span>
              </Button>
              
              <Button 
                variant="outline" 
                onClick={loadDashboardData}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Scans */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Scans</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Configuration</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Violations</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentJobs.map(job => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(job.status)}
                        <span className="capitalize">{job.status}</span>
                      </div>
                    </TableCell>
                    <TableCell>{job.configId}</TableCell>
                    <TableCell>
                      {job.startedAt ? new Date(job.startedAt).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell>
                      {job.results?.duration ? formatDuration(job.results.duration) : '-'}
                    </TableCell>
                    <TableCell>
                      {job.results ? (
                        <div className="flex space-x-1">
                          {job.results.violations.critical > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {job.results.violations.critical}C
                            </Badge>
                          )}
                          {job.results.violations.high > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {job.results.violations.high}H
                            </Badge>
                          )}
                          {job.results.violations.medium > 0 && (
                            <Badge variant="default" className="text-xs">
                              {job.results.violations.medium}M
                            </Badge>
                          )}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {job.results ? (
                        <Badge variant={job.results.riskScore > 7 ? 'destructive' : 'secondary'}>
                          {job.results.riskScore.toFixed(1)}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {job.status === 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadReport(job.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const RulesTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Security Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>File Types</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {securityRules.map(rule => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{rule.name}</p>
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{rule.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getSeverityColor(rule.severity)}>
                      {rule.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {rule.fileExtensions.map(ext => (
                        <Badge key={ext} variant="secondary" className="text-xs">
                          {ext}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleRule(rule.id, !rule.enabled)}
                    >
                      {rule.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const ConfigsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Scan Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Thresholds</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scanConfigs.map(config => (
                <TableRow key={config.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{config.name}</p>
                      <p className="text-sm text-muted-foreground">{config.id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={config.enabled ? 'default' : 'secondary'}>
                      {config.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {config.schedule ? (
                      <Badge variant="outline">{config.schedule}</Badge>
                    ) : (
                      <span className="text-muted-foreground">Manual</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Badge variant="destructive" className="text-xs">
                        C:{config.thresholds.critical}
                      </Badge>
                      <Badge variant="destructive" className="text-xs">
                        H:{config.thresholds.high}
                      </Badge>
                      <Badge variant="default" className="text-xs">
                        M:{config.thresholds.medium}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startScan(config.id)}
                        disabled={isLoading}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Security Code Review</h1>
          <p className="text-muted-foreground">
            Automated security scanning and code review system
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadDashboardData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          This system provides automated security code review and vulnerability detection.
          All scans are logged and results are encrypted at rest.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="rules">Security Rules</TabsTrigger>
          <TabsTrigger value="configs">Configurations</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab />
        </TabsContent>

        <TabsContent value="rules">
          <RulesTab />
        </TabsContent>

        <TabsContent value="configs">
          <ConfigsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityCodeReview;