/**
 * Jest环境变量配置
 * 为测试环境设置必要的环境变量
 */

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_ENV = 'test';

// 数据库配置
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/zk_agent_test';
process.env.DATABASE_URL_TEST = 'postgresql://test:test@localhost:5432/zk_agent_test';

// Redis配置
process.env.REDIS_URL = 'redis://localhost:6379/1';

// JWT配置
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret-for-testing';

// API配置
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.FASTGPT_API_KEY = 'test-fastgpt-key';
process.env.FASTGPT_BASE_URL = 'http://localhost:3001';

// 其他配置
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters';
process.env.CSRF_SECRET = 'test-csrf-secret-key';
process.env.SESSION_SECRET = 'test-session-secret-key';

// 禁用遥测
process.env.NEXT_TELEMETRY_DISABLED = '1';

// 测试端口
process.env.PORT = '3000';