-- 测试数据库初始化脚本
-- 创建测试用户和数据库

-- 创建测试数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS zkagent_dev;

-- 切换到测试数据库
\c zkagent_dev;

-- 创建基础表结构（简化版本用于测试）
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agents (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100) NOT NULL,
    config JSONB,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    agent_id INTEGER REFERENCES agents(id),
    title VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入测试数据
INSERT INTO users (email, password_hash, name, role) VALUES
('admin@test.com', '$2b$10$test.hash.admin', 'Test Admin', 'admin'),
('user@test.com', '$2b$10$test.hash.user', 'Test User', 'user')
ON CONFLICT (email) DO NOTHING;

INSERT INTO agents (name, description, type, config) VALUES
('Test Chat Agent', 'Test chat agent for testing', 'chat', '{"model": "test"}'),
('Test CAD Agent', 'Test CAD analyzer for testing', 'cad', '{"precision": "standard"}'),
('Test Poster Agent', 'Test poster generator for testing', 'poster', '{"template": "default"}')
ON CONFLICT DO NOTHING;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);

-- 授予权限
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO test;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO test;