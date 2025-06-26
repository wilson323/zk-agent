/**
 * 指标监控API路由错误处理测试
 * 测试系统指标收集、监控、报警等各种错误场景
 */

import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '../../../app/api/metrics/route';
import { GlobalErrorHandler } from '../../../lib/middleware/global-error-handler';
// import { AgentError, AgentErrorType, ErrorSeverity } from '../../../lib/errors/agent-errors';

// Mock dependencies
jest.mock('../../../lib/services/metrics-collector', () => ({
  collectSystemMetrics: jest.fn(),
  collectApplicationMetrics: jest.fn(),
  collectPerformanceMetrics: jest.fn(),
  collectErrorMetrics: jest.fn(),
  aggregateMetrics: jest.fn(),
  validateMetricData: jest.fn(),
  calculateMetricTrends: jest.fn()
}));

jest.mock('../../../lib/storage/metrics-store', () => ({
  storeMetrics: jest.fn(),
  retrieveMetrics: jest.fn(),
  deleteMetrics: jest.fn(),
  queryMetrics: jest.fn(),
  getMetricHistory: jest.fn(),
  checkStorageCapacity: jest.fn()
}));

jest.mock('../../../lib/services/alert-manager', () => ({
  checkAlertThresholds: jest.fn(),
  triggerAlert: jest.fn(),
  resolveAlert: jest.fn(),
  getActiveAlerts: jest.fn(),
  validateAlertRules: jest.fn()
}));

jest.mock('../../../lib/auth/session', () => ({
  validateSession: jest.fn(),
  checkMetricsPermissions: jest.fn()
}));

describe('Metrics API Error Handling', () => {
  let errorHandler: GlobalErrorHandler;

  beforeEach(() => {
    errorHandler = GlobalErrorHandler.getInstance();
    jest.clearAllMocks();
  });

  describe('GET /api/metrics - Get Metrics', () => {
    it('should handle metrics collection service unavailable', async () => {
      const { collectSystemMetrics } = require('../../../lib/services/metrics-collector');
      collectSystemMetrics.mockRejectedValue(new Error('Metrics collection service unavailable'));

      const request = new NextRequest('http://localhost:3000/api/metrics?type=system');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Metrics collection service unavailable');
    });

    it('should handle invalid metric type parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/metrics?type=invalid');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid metric type');
    });

    it('should handle invalid time range parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/metrics?from=invalid&to=invalid');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid time range');
    });

    it('should handle metrics storage query failure', async () => {
      const { queryMetrics } = require('../../../lib/storage/metrics-store');
      queryMetrics.mockRejectedValue(new Error('Metrics database query failed'));

      const request = new NextRequest('http://localhost:3000/api/metrics?type=application');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Metrics database query failed');
    });

    it('should handle metrics data corruption', async () => {
      const { retrieveMetrics } = require('../../../lib/storage/metrics-store');
      retrieveMetrics.mockRejectedValue(new Error('Metrics data corrupted'));

      const request = new NextRequest('http://localhost:3000/api/metrics?type=performance');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Metrics data corrupted');
    });

    it('should handle insufficient permissions for metrics access', async () => {
      const { checkMetricsPermissions } = require('../../../lib/auth/session');
      checkMetricsPermissions.mockRejectedValue(new Error('Metrics access permissions required'));

      const request = new NextRequest('http://localhost:3000/api/metrics', {
        headers: { 'Authorization': 'Bearer user-token' }
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('should handle metrics aggregation timeout', async () => {
      const { aggregateMetrics } = require('../../../lib/services/metrics-collector');
      aggregateMetrics.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Metrics aggregation timeout')), 100)
        )
      );

      const request = new NextRequest('http://localhost:3000/api/metrics?aggregate=true');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(408);
      expect(data.error.message).toContain('Metrics aggregation timeout');
    });

    it('should handle missing metrics data for requested period', async () => {
      const { queryMetrics } = require('../../../lib/storage/metrics-store');
      queryMetrics.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/metrics?from=2023-01-01&to=2023-01-02');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toContain('No metrics data found');
    });
  });

  describe('POST /api/metrics - Store Custom Metrics', () => {
    let validMetricData: any;

    beforeEach(() => {
      validMetricData = {
        name: 'custom.api.response_time',
        value: 150,
        unit: 'ms',
        timestamp: new Date().toISOString(),
        tags: {
          endpoint: '/api/test',
          method: 'GET',
          status: '200'
        },
        metadata: {
          source: 'application',
          environment: 'production'
        }
      };
    });

    it('should handle invalid metric data format', async () => {
      const { validateMetricData } = require('../../../lib/services/metrics-collector');
      validateMetricData.mockRejectedValue(new Error('Invalid metric data format'));

      const invalidData = { name: 'test', value: 'invalid' };
      const request = new NextRequest('http://localhost:3000/api/metrics', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid metric data format');
    });

    it('should handle missing required metric fields', async () => {
      const incompleteData = { name: 'test.metric' }; // Missing value, timestamp
      const request = new NextRequest('http://localhost:3000/api/metrics', {
        method: 'POST',
        body: JSON.stringify(incompleteData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toContain('value');
    });

    it('should handle metric name validation failure', async () => {
      const { validateMetricData } = require('../../../lib/services/metrics-collector');
      validateMetricData.mockRejectedValue(new Error('Invalid metric name: must follow naming convention'));

      const invalidNameData = { ...validMetricData, name: 'invalid-metric-name!' };
      const request = new NextRequest('http://localhost:3000/api/metrics', {
        method: 'POST',
        body: JSON.stringify(invalidNameData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Invalid metric name');
    });

    it('should handle metrics storage capacity exceeded', async () => {
      const { checkStorageCapacity } = require('../../../lib/storage/metrics-store');
      checkStorageCapacity.mockRejectedValue(new Error('Metrics storage capacity exceeded'));

      const request = new NextRequest('http://localhost:3000/api/metrics', {
        method: 'POST',
        body: JSON.stringify(validMetricData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(507); // Insufficient storage
      expect(data.error.message).toContain('Metrics storage capacity exceeded');
    });

    it('should handle metrics storage service unavailable', async () => {
      const { storeMetrics } = require('../../../lib/storage/metrics-store');
      storeMetrics.mockRejectedValue(new Error('Metrics storage service unavailable'));

      const request = new NextRequest('http://localhost:3000/api/metrics', {
        method: 'POST',
        body: JSON.stringify(validMetricData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.message).toContain('Metrics storage service unavailable');
    });

    it('should handle duplicate metric timestamp conflict', async () => {
      const { storeMetrics } = require('../../../lib/storage/metrics-store');
      storeMetrics.mockRejectedValue(new Error('Metric with same name and timestamp already exists'));

      const request = new NextRequest('http://localhost:3000/api/metrics', {
        method: 'POST',
        body: JSON.stringify(validMetricData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.message).toContain('Metric with same name and timestamp already exists');
    });

    it('should handle metric value out of range', async () => {
      const { validateMetricData } = require('../../../lib/services/metrics-collector');
      validateMetricData.mockRejectedValue(new Error('Metric value exceeds allowed range'));

      const outOfRangeData = { ...validMetricData, value: Number.MAX_SAFE_INTEGER + 1 };
      const request = new NextRequest('http://localhost:3000/api/metrics', {
        method: 'POST',
        body: JSON.stringify(outOfRangeData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Metric value exceeds allowed range');
    });

    it('should handle invalid timestamp format', async () => {
      const { validateMetricData } = require('../../../lib/services/metrics-collector');
      validateMetricData.mockRejectedValue(new Error('Invalid timestamp format'));

      const invalidTimestampData = { ...validMetricData, timestamp: 'invalid-date' };
      const request = new NextRequest('http://localhost:3000/api/metrics', {
        method: 'POST',
        body: JSON.stringify(invalidTimestampData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Invalid timestamp format');
    });
  });

  describe('PUT /api/metrics/alerts - Update Alert Rules', () => {
    let validAlertRule: any;

    beforeEach(() => {
      validAlertRule = {
        name: 'high_response_time',
        metric: 'api.response_time',
        condition: 'greater_than',
        threshold: 1000,
        duration: '5m',
        severity: 'warning',
        enabled: true,
        notifications: {
          email: ['admin@example.com'],
          webhook: 'https://hooks.example.com/alert'
        }
      };
    });

    it('should handle invalid alert rule format', async () => {
      const { validateAlertRules } = require('../../../lib/services/alert-manager');
      validateAlertRules.mockRejectedValue(new Error('Invalid alert rule format'));

      const invalidRule = { name: 'test' }; // Missing required fields
      const request = new NextRequest('http://localhost:3000/api/metrics/alerts', {
        method: 'PUT',
        body: JSON.stringify(invalidRule),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid alert rule format');
    });

    it('should handle unsupported alert condition', async () => {
      const { validateAlertRules } = require('../../../lib/services/alert-manager');
      validateAlertRules.mockRejectedValue(new Error('Unsupported alert condition: invalid_condition'));

      const invalidConditionRule = { ...validAlertRule, condition: 'invalid_condition' };
      const request = new NextRequest('http://localhost:3000/api/metrics/alerts', {
        method: 'PUT',
        body: JSON.stringify(invalidConditionRule),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Unsupported alert condition');
    });

    it('should handle alert rule conflict', async () => {
      const { validateAlertRules } = require('../../../lib/services/alert-manager');
      validateAlertRules.mockRejectedValue(new Error('Alert rule with same name already exists'));

      const request = new NextRequest('http://localhost:3000/api/metrics/alerts', {
        method: 'PUT',
        body: JSON.stringify(validAlertRule),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.message).toContain('Alert rule with same name already exists');
    });

    it('should handle invalid notification configuration', async () => {
      const { validateAlertRules } = require('../../../lib/services/alert-manager');
      validateAlertRules.mockRejectedValue(new Error('Invalid notification webhook URL'));

      const invalidNotificationRule = {
        ...validAlertRule,
        notifications: { webhook: 'invalid-url' }
      };
      const request = new NextRequest('http://localhost:3000/api/metrics/alerts', {
        method: 'PUT',
        body: JSON.stringify(invalidNotificationRule),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Invalid notification webhook URL');
    });

    it('should handle alert manager service unavailable', async () => {
      const { validateAlertRules } = require('../../../lib/services/alert-manager');
      validateAlertRules.mockRejectedValue(new Error('Alert manager service unavailable'));

      const request = new NextRequest('http://localhost:3000/api/metrics/alerts', {
        method: 'PUT',
        body: JSON.stringify(validAlertRule),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.message).toContain('Alert manager service unavailable');
    });
  });

  describe('DELETE /api/metrics - Delete Metrics', () => {
    it('should handle metrics not found for deletion', async () => {
      const { queryMetrics } = require('../../../lib/storage/metrics-store');
      queryMetrics.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/metrics?name=nonexistent.metric', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
      expect(data.error.message).toContain('No metrics found');
    });

    it('should handle metrics deletion failure', async () => {
      const { deleteMetrics } = require('../../../lib/storage/metrics-store');
      deleteMetrics.mockRejectedValue(new Error('Failed to delete metrics from storage'));

      const request = new NextRequest('http://localhost:3000/api/metrics?name=test.metric', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to delete metrics from storage');
    });

    it('should handle attempt to delete system metrics', async () => {
      const { deleteMetrics } = require('../../../lib/storage/metrics-store');
      deleteMetrics.mockRejectedValue(new Error('Cannot delete system metrics'));

      const request = new NextRequest('http://localhost:3000/api/metrics?name=system.cpu.usage', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error.message).toContain('Cannot delete system metrics');
    });

    it('should handle metrics in use by active alerts', async () => {
      const { deleteMetrics } = require('../../../lib/storage/metrics-store');
      deleteMetrics.mockRejectedValue(new Error('Metrics are referenced by active alert rules'));

      const request = new NextRequest('http://localhost:3000/api/metrics?name=api.response_time', {
        method: 'DELETE'
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error.message).toContain('Metrics are referenced by active alert rules');
    });
  });

  describe('Alert Management Errors', () => {
    it('should handle alert threshold check failure', async () => {
      const { checkAlertThresholds } = require('../../../lib/services/alert-manager');
      checkAlertThresholds.mockRejectedValue(new Error('Alert threshold check failed'));

      const request = new NextRequest('http://localhost:3000/api/metrics/alerts/check');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Alert threshold check failed');
    });

    it('should handle alert trigger failure', async () => {
      const { triggerAlert } = require('../../../lib/services/alert-manager');
      triggerAlert.mockRejectedValue(new Error('Failed to trigger alert notification'));

      const request = new NextRequest('http://localhost:3000/api/metrics/alerts/trigger', {
        method: 'POST',
        body: JSON.stringify({ alertName: 'high_cpu_usage' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to trigger alert notification');
    });

    it('should handle alert resolution failure', async () => {
      const { resolveAlert } = require('../../../lib/services/alert-manager');
      resolveAlert.mockRejectedValue(new Error('Failed to resolve alert'));

      const request = new NextRequest('http://localhost:3000/api/metrics/alerts/resolve', {
        method: 'POST',
        body: JSON.stringify({ alertId: 'alert-123' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to resolve alert');
    });

    it('should handle active alerts retrieval failure', async () => {
      const { getActiveAlerts } = require('../../../lib/services/alert-manager');
      getActiveAlerts.mockRejectedValue(new Error('Failed to retrieve active alerts'));

      const request = new NextRequest('http://localhost:3000/api/metrics/alerts/active');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toContain('Failed to retrieve active alerts');
    });
  });

  describe('Metrics Trend Analysis Errors', () => {
    it('should handle trend calculation failure', async () => {
      const { calculateMetricTrends } = require('../../../lib/services/metrics-collector');
      calculateMetricTrends.mockRejectedValue(new Error('Trend calculation failed: insufficient data'));

      const request = new NextRequest('http://localhost:3000/api/metrics/trends?metric=api.response_time');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.message).toContain('Trend calculation failed');
    });

    it('should handle invalid trend analysis parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/metrics/trends?period=invalid');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid trend analysis parameters');
    });

    it('should handle trend analysis timeout', async () => {
      const { calculateMetricTrends } = require('../../../lib/services/metrics-collector');
      calculateMetricTrends.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Trend analysis timeout')), 100)
        )
      );

      const request = new NextRequest('http://localhost:3000/api/metrics/trends?metric=system.cpu.usage');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(408);
      expect(data.error.message).toContain('Trend analysis timeout');
    });
  });

  describe('Batch Metrics Operations', () => {
    it('should handle batch metrics ingestion with partial failures', async () => {
      const { storeMetrics } = require('../../../lib/storage/metrics-store');
      storeMetrics.mockImplementation((metrics: any) => {
        if (metrics.some((m: any) => m.name === 'invalid.metric')) {
          throw new Error('Invalid metric in batch');
        }
        return Promise.resolve();
      });

      const batchMetrics = [
        { name: 'valid.metric', value: 100, timestamp: new Date().toISOString() },
        { name: 'invalid.metric', value: 'invalid', timestamp: new Date().toISOString() }
      ];

      const request = new NextRequest('http://localhost:3000/api/metrics/batch', {
        method: 'POST',
        body: JSON.stringify({ metrics: batchMetrics }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(207); // Multi-status
      expect(data.results).toBeDefined();
      expect(data.errors).toBeDefined();
    });

    it('should handle batch metrics query with large result set', async () => {
      const { queryMetrics } = require('../../../lib/storage/metrics-store');
      queryMetrics.mockRejectedValue(new Error('Query result set too large'));

      const request = new NextRequest('http://localhost:3000/api/metrics/batch?names=metric1,metric2,metric3');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(413); // Payload too large
      expect(data.error.message).toContain('Query result set too large');
    });
  });

  describe('Error Recovery and Monitoring', () => {
    it('should provide metrics operation recovery suggestions', async () => {
      const { storeMetrics } = require('../../../lib/storage/metrics-store');
      storeMetrics.mockRejectedValue(new Error('Temporary metrics storage outage'));

      const validMetricData = {
        name: 'test.metric',
        value: 100,
        timestamp: new Date().toISOString()
      };

      const request = new NextRequest('http://localhost:3000/api/metrics', {
        method: 'POST',
        body: JSON.stringify(validMetricData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.error.recovery).toBeDefined();
      expect(data.error.recovery.suggestions).toContain('Retry metric storage');
    });

    it('should track metrics operation performance', async () => {
      const { storeMetrics } = require('../../../lib/storage/metrics-store');
      storeMetrics.mockRejectedValue(new Error('Test error'));

      const validMetricData = {
        name: 'test.metric',
        value: 100,
        timestamp: new Date().toISOString()
      };

      const request = new NextRequest('http://localhost:3000/api/metrics', {
        method: 'POST',
        body: JSON.stringify(validMetricData),
        headers: { 'Content-Type': 'application/json' }
      });

      await POST(request);

      const stats = errorHandler.getErrorStats();
      expect(stats.errorCount).toBeGreaterThan(0);
    });

    it('should include metrics context in error responses', async () => {
      const { storeMetrics } = require('../../../lib/storage/metrics-store');
      storeMetrics.mockRejectedValue(new Error('Test error'));

      const validMetricData = {
        name: 'test.metric',
        value: 100,
        timestamp: new Date().toISOString()
      };

      const request = new NextRequest('http://localhost:3000/api/metrics', {
        method: 'POST',
        body: JSON.stringify(validMetricData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.error.context).toBeDefined();
      expect(data.error.context.operation).toBe('storeMetrics');
      expect(data.error.context.metricName).toBe('test.metric');
    });
  });
});