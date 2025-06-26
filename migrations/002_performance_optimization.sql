-- 性能优化迁移
-- 创建时间: 2024-01-02
-- 描述: 添加性能监控和优化相关表结构

-- 创建查询性能监控表
CREATE TABLE IF NOT EXISTS query_performance_logs (
    id SERIAL PRIMARY KEY,
    query_id VARCHAR(255) NOT NULL,
    query_text TEXT,
    execution_time INTEGER NOT NULL, -- 毫秒
    connection_id VARCHAR(255),
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建连接池监控表
CREATE TABLE IF NOT EXISTS connection_pool_logs (
    id SERIAL PRIMARY KEY,
    active_connections INTEGER NOT NULL,
    idle_connections INTEGER NOT NULL,
    waiting_connections INTEGER NOT NULL,
    total_connections INTEGER NOT NULL,
    pool_status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建系统健康检查日志表
CREATE TABLE IF NOT EXISTS health_check_logs (
    id SERIAL PRIMARY KEY,
    check_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    latency INTEGER, -- 毫秒
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建缓存统计表
CREATE TABLE IF NOT EXISTS cache_statistics (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) NOT NULL,
    hit_count INTEGER DEFAULT 0,
    miss_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建性能相关索引
CREATE INDEX IF NOT EXISTS idx_query_performance_logs_query_id ON query_performance_logs(query_id);
CREATE INDEX IF NOT EXISTS idx_query_performance_logs_execution_time ON query_performance_logs(execution_time);
CREATE INDEX IF NOT EXISTS idx_query_performance_logs_created_at ON query_performance_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_connection_pool_logs_created_at ON connection_pool_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_health_check_logs_check_type ON health_check_logs(check_type);
CREATE INDEX IF NOT EXISTS idx_health_check_logs_status ON health_check_logs(status);
CREATE INDEX IF NOT EXISTS idx_health_check_logs_created_at ON health_check_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_cache_statistics_cache_key ON cache_statistics(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_statistics_last_accessed ON cache_statistics(last_accessed);

-- 为缓存统计表添加更新时间触发器
CREATE TRIGGER update_cache_statistics_updated_at BEFORE UPDATE ON cache_statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建分区表（按月分区查询性能日志）
CREATE TABLE IF NOT EXISTS query_performance_logs_y2024m01 PARTITION OF query_performance_logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE IF NOT EXISTS query_performance_logs_y2024m02 PARTITION OF query_performance_logs
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- 创建清理旧数据的函数
CREATE OR REPLACE FUNCTION cleanup_old_performance_data(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- 清理旧的查询性能日志
    DELETE FROM query_performance_logs 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * days_to_keep;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- 清理旧的连接池日志
    DELETE FROM connection_pool_logs 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * days_to_keep;
    
    -- 清理旧的健康检查日志
    DELETE FROM health_check_logs 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * days_to_keep;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 创建性能统计视图
CREATE OR REPLACE VIEW performance_summary AS
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as total_queries,
    AVG(execution_time) as avg_execution_time,
    MAX(execution_time) as max_execution_time,
    MIN(execution_time) as min_execution_time,
    COUNT(CASE WHEN success = false THEN 1 END) as failed_queries,
    COUNT(CASE WHEN execution_time > 1000 THEN 1 END) as slow_queries
FROM query_performance_logs
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;