# 安全配置指南

## 环境变量安全配置

### 1. 数据库安全

#### 密码要求
- 使用至少16位的强密码
- 包含大小写字母、数字和特殊字符
- 避免使用常见密码或字典词汇
- 定期更换密码（建议每90天）

#### 生产环境配置
```bash
# 生产环境必须启用SSL
DATABASE_URL="postgresql://username:STRONG_PASSWORD@host:5432/db?sslmode=require"
```

### 2. JWT和认证密钥

#### 生成安全密钥
```bash
# 生成NextAuth密钥
openssl rand -base64 32

# 生成JWT密钥
openssl rand -base64 64
```

#### 密钥管理最佳实践
- 每个环境使用不同的密钥
- 定期轮换密钥
- 使用密钥管理服务（如AWS KMS、Azure Key Vault）
- 永远不要在代码中硬编码密钥

### 3. API密钥安全

#### OpenAI API密钥
- 从OpenAI控制台获取
- 设置使用限制和监控
- 定期检查使用情况

#### FastGPT配置
- 使用HTTPS端点
- 配置适当的访问控制
- 监控API调用

### 4. Redis安全

#### 配置要求
- 设置强密码
- 启用TLS加密
- 配置防火墙规则
- 定期备份数据

### 5. 生产环境部署清单

#### 部署前检查
- [ ] 所有默认密码已更改
- [ ] SSL/TLS已启用
- [ ] 防火墙规则已配置
- [ ] 日志监控已设置
- [ ] 备份策略已实施
- [ ] 访问控制已配置
- [ ] 安全扫描已完成

#### 环境变量验证
```bash
# 检查关键环境变量是否设置
echo "Checking environment variables..."
[ -z "$DATABASE_URL" ] && echo "❌ DATABASE_URL not set"
[ -z "$NEXTAUTH_SECRET" ] && echo "❌ NEXTAUTH_SECRET not set"
[ -z "$JWT_SECRET" ] && echo "❌ JWT_SECRET not set"
echo "✅ Environment check complete"
```

### 6. 安全监控

#### 日志监控
- 监控失败的登录尝试
- 跟踪异常的API调用
- 记录数据库连接错误
- 监控文件上传活动

#### 告警设置
- 设置异常活动告警
- 配置性能阈值告警
- 监控错误率增长
- 跟踪资源使用情况

### 7. 定期安全维护

#### 每月任务
- [ ] 更新依赖包
- [ ] 检查安全漏洞
- [ ] 审查访问日志
- [ ] 验证备份完整性

#### 每季度任务
- [ ] 轮换密钥
- [ ] 安全审计
- [ ] 渗透测试
- [ ] 更新安全策略

### 8. 应急响应

#### 安全事件处理
1. 立即隔离受影响系统
2. 收集和保存证据
3. 评估影响范围
4. 通知相关人员
5. 实施修复措施
6. 更新安全策略

#### 联系信息
- 安全团队：security@company.com
- 紧急联系：+86-xxx-xxxx-xxxx
- 事件报告：incidents@company.com

---

**重要提醒**：此文档包含敏感的安全配置信息，请确保只有授权人员可以访问。定期更新此文档以反映最新的安全最佳实践。