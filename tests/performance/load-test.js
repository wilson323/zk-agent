import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// 自定义指标
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

// 测试配置
export let options = {
  stages: [
    { duration: '2m', target: 10 },   // 预热阶段
    { duration: '5m', target: 50 },   // 正常负载
    { duration: '2m', target: 100 },  // 峰值负载
    { duration: '3m', target: 50 },   // 恢复阶段
    { duration: '2m', target: 0 },    // 冷却阶段
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95%的请求响应时间小于500ms
    http_req_failed: ['rate<0.01'],   // 错误率小于1%
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// 测试数据
const testUsers = [
  { email: 'test1@example.com', password: 'password123' },
  { email: 'test2@example.com', password: 'password123' },
  { email: 'test3@example.com', password: 'password123' },
];

// 主测试函数
export default function() {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  
  // 1. 健康检查
  let response = http.get(`${BASE_URL}/api/health`);
  check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 200ms': (r) => r.timings.duration < 200,
  }) || errorRate.add(1);
  
  sleep(1);
  
  // 2. 用户登录
  response = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: user.email,
    password: user.password
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const loginSuccess = check(response, {
    'login status is 200': (r) => r.status === 200,
    'login response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  if (!loginSuccess) {
    errorRate.add(1);
    return;
  }
  
  // 提取认证token
  let authToken = '';
  try {
    const loginData = JSON.parse(response.body);
    authToken = loginData.token || '';
  } catch (e) {
    errorRate.add(1);
    return;
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  };
  
  sleep(1);
  
  // 3. 获取智能体列表
  response = http.get(`${BASE_URL}/api/agents`, { headers });
  check(response, {
    'agents list status is 200': (r) => r.status === 200,
    'agents list response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);
  
  sleep(1);
  
  // 4. 创建聊天会话
  response = http.post(`${BASE_URL}/api/chat/sessions`, JSON.stringify({
    agentId: 'test-agent-1',
    title: 'Load Test Session'
  }), { headers });
  
  const sessionSuccess = check(response, {
    'create session status is 200': (r) => r.status === 200 || r.status === 201,
    'create session response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  if (!sessionSuccess) {
    errorRate.add(1);
    return;
  }
  
  sleep(1);
  
  // 5. 发送聊天消息
  response = http.post(`${BASE_URL}/api/chat/messages`, JSON.stringify({
    message: 'Hello, this is a load test message',
    sessionId: 'test-session-' + Math.random()
  }), { headers });
  
  check(response, {
    'send message status is 200': (r) => r.status === 200,
    'send message response time < 2000ms': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);
  
  // 记录响应时间
  responseTime.add(response.timings.duration);
  
  sleep(2);
  
  // 6. CAD分析测试（模拟）
  response = http.get(`${BASE_URL}/api/cad/templates`, { headers });
  check(response, {
    'cad templates status is 200': (r) => r.status === 200,
    'cad templates response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);
  
  sleep(1);
  
  // 7. 海报生成测试（模拟）
  response = http.get(`${BASE_URL}/api/poster/templates`, { headers });
  check(response, {
    'poster templates status is 200': (r) => r.status === 200,
    'poster templates response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);
  
  sleep(1);
}

// 测试开始时执行
export function setup() {
  console.log('🚀 Starting load test...');
  console.log(`Target URL: ${BASE_URL}`);
  
  // 验证服务可用性
  const response = http.get(`${BASE_URL}/api/health`);
  if (response.status !== 200) {
    throw new Error(`Service not available. Status: ${response.status}`);
  }
  
  return { startTime: new Date() };
}

// 测试结束时执行
export function teardown(data) {
  const endTime = new Date();
  const duration = (endTime - data.startTime) / 1000;
  console.log(`✅ Load test completed in ${duration}s`);
} 