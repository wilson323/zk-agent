# 代码结构

## 项目目录结构
```
zk-agent/
├── .github/           # GitHub Actions CI/CD配置
├── app/              # Next.js应用目录
├── lib/              # 核心库文件
│   ├── database/     # 数据库相关
│   │   ├── index.ts                    # 基础数据库服务
│   │   ├── enhanced-database-manager.ts # 增强数据库管理器
│   │   ├── enhanced-connection.ts      # 增强连接管理
│   │   ├── monitoring.ts               # 监控系统
│   │   ├── performance-monitor.js      # 性能监控
│   │   ├── pool-optimizer.ts           # 连接池优化器
│   │   ├── security-config.js          # 安全配置
│   │   ├── database.config.js          # 数据库配置
│   │   ├── connection-health.js        # 连接健康检查
│   │   ├── error-recovery.ts           # 错误恢复
│   │   ├── poster-config.ts            # 海报配置
│   │   ├── poster-db.ts                # 海报数据库
│   │   └── production-database-manager.ts # 生产数据库管理
├── prisma/           # Prisma配置和schema
│   └── schema.prisma # 数据库模型定义
├── package.json      # 项目配置和依赖
├── README.md         # 项目文档
├── Dockerfile        # Docker配置
└── jest.env.js       # Jest环境配置
```

## 核心模块
- **数据库层**: 完整的数据库管理体系
- **监控系统**: 性能监控和告警
- **安全配置**: SSL、密码策略、权限控制
- **连接池优化**: 动态调优和策略管理
- **错误恢复**: 自动重连和故障处理