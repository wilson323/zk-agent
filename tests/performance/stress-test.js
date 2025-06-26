import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// 自定义指标
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const requestCount = new Counter('requests');

// 压力测试配置
export let options = {
  stages: [
    { duration: '1m', target: 50 },    // 快速上升到50用户
    { duration: '2m', target: 100 },   // 上升到100用户
    { duration: '3m', target: 200 },   // 上升到200用户
    { duration: '2m', target: 300 },   // 峰值压力300用户
    { duration: '1m', target: 400 },   // 极限压力400用户
    { duration: '2m', target: 200 },   // 快速降低
    { duration: '2m', target: 0 },     // 完全停止
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95%的请求响应时间小于1秒
    http_req_failed: ['rate<0.05'],    // 错误率小于5%
    errors: ['rate<0.05'],
    requests: ['count>1000'],          // 总请求数大于1000
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// 压力测试场景
export default function() {
  requestCount.add(1);
  
  // 随机选择测试场景
  const scenarios = [
    testHealthEndpoint,
    testAuthFlow,
    testChatFlow,
    testCADFlow,
    testPosterFlow,
    testConcurrentRequests
  ];
  
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario();
  
  sleep(Math.random() * 2); // 随机等待0-2秒
}

// 健康检查压力测试
function testHealthEndpoint() {
  const response = http.get(`${BASE_URL}/api/health`);
  
  const success = check(response, {
    'health endpoint available': (r) => r.status === 200,
    'health response time acceptable': (r) => r.timings.duration < 500,
  });
  
  if (!success) errorRate.add(1);
  responseTime.add(response.timings.duration);
}

// 认证流程压力测试
function testAuthFlow() {
  // 注册用户
  let response = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify({
    email: `stress-test-${Math.random()}@example.com`,
    password: 'StressTest123!',
    name: 'Stress Test User'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const registerSuccess = check(response, {
    'register status acceptable': (r) => r.status === 200 || r.status === 201 || r.status === 409,
    'register response time acceptable': (r) => r.timings.duration < 2000,
  });
  
  if (!registerSuccess) {
    errorRate.add(1);
    return;
  }
  
  // 登录用户
  response = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'admin@test.com', // 使用测试用户
    password: 'password123'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const loginSuccess = check(response, {
    'login status is 200': (r) => r.status === 200,
    'login response time acceptable': (r) => r.timings.duration < 2000,
  });
  
  if (!loginSuccess) errorRate.add(1);
  responseTime.add(response.timings.duration);
}

// 聊天流程压力测试
function testChatFlow() {
  // 模拟快速连续的聊天请求
  for (let i = 0; i < 3; i++) {
    const response = http.post(`${BASE_URL}/api/chat/messages`, JSON.stringify({
      message: `Stress test message ${i} - ${Math.random()}`,
      sessionId: `stress-session-${Math.random()}`
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    const success = check(response, {
      'chat message processed': (r) => r.status === 200 || r.status === 201,
      'chat response time acceptable': (r) => r.timings.duration < 3000,
    });
    
    if (!success) errorRate.add(1);
    responseTime.add(response.timings.duration);
    
    sleep(0.1); // 短暂间隔
  }
}

// CAD分析压力测试
function testCADFlow() {
  // 获取CAD模板
  let response = http.get(`${BASE_URL}/api/cad/templates`);
  
  check(response, {
    'cad templates available': (r) => r.status === 200,
    'cad templates response time': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);
  
  // 模拟CAD分析请求
  response = http.post(`${BASE_URL}/api/cad/analyze`, JSON.stringify({
    fileType: 'dwg',
    precision: 'standard',
    mockData: true // 标记为压力测试
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const success = check(response, {
    'cad analysis processed': (r) => r.status === 200 || r.status === 202,
    'cad analysis response time': (r) => r.timings.duration < 5000,
  });
  
  if (!success) errorRate.add(1);
  responseTime.add(response.timings.duration);
}

// 海报生成压力测试
function testPosterFlow() {
  // 获取海报模板
  let response = http.get(`${BASE_URL}/api/poster/templates`);
  
  check(response, {
    'poster templates available': (r) => r.status === 200,
    'poster templates response time': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);
  
  // 模拟海报生成请求
  response = http.post(`${BASE_URL}/api/poster/generate`, JSON.stringify({
    template: 'default',
    title: `Stress Test Poster ${Math.random()}`,
    content: 'This is a stress test poster',
    mockData: true // 标记为压力测试
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const success = check(response, {
    'poster generation processed': (r) => r.status === 200 || r.status === 202,
    'poster generation response time': (r) => r.timings.duration < 5000,
  });
  
  if (!success) errorRate.add(1);
  responseTime.add(response.timings.duration);
}

// 并发请求压力测试
function testConcurrentRequests() {
  const requests = [
    { method: 'GET', url: `${BASE_URL}/api/health` },
    { method: 'GET', url: `${BASE_URL}/api/agents` },
    { method: 'GET', url: `${BASE_URL}/api/cad/templates` },
    { method: 'GET', url: `${BASE_URL}/api/poster/templates` },
  ];
  
  // 并发发送多个请求
  const responses = http.batch(requests);
  
  responses.forEach((response, index) => {
    const success = check(response, {
      [`concurrent request ${index} successful`]: (r) => r.status === 200,
      [`concurrent request ${index} fast`]: (r) => r.timings.duration < 1000,
    });
    
    if (!success) errorRate.add(1);
    responseTime.add(response.timings.duration);
  });
}

// 测试开始
export function setup() {
  console.log('🔥 Starting stress test...');
  console.log(`Target URL: ${BASE_URL}`);
  console.log('This test will push the system to its limits');
  
  // 验证服务可用性
  const response = http.get(`${BASE_URL}/api/health`);
  if (response.status !== 200) {
    throw new Error(`Service not available for stress testing. Status: ${response.status}`);
  }
  
  return { startTime: new Date() };
}

// 测试结束
export function teardown(data) {
  const endTime = new Date();
  const duration = (endTime - data.startTime) / 1000;
  console.log(`🔥 Stress test completed in ${duration}s`);
  console.log('Check the metrics to see how the system performed under stress');
} 