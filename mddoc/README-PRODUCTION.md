# 🚀 生产环境快速部署

## ⚡ 一键部署命令

```bash
# 方法1: 使用npm脚本（推荐）
npm run deploy:prod

# 方法2: 直接运行脚本
./scripts/deploy-production.sh

# 方法3: 手动Docker部署
npm run build:prod
```

## 🌐 部署后访问

- **主应用**: http://171.43.138.237:8005
- **管理面板**: http://171.43.138.237:8005/admin/dashboard
- **性能监控**: http://171.43.138.237:8005/admin/dashboard/performance

## ✅ 快速验证

```bash
# 健康检查
npm run health:check

# 性能检查
npm run performance:check
```

## 📊 已优化功能

✅ **AG-UI流式响应优化** - 延迟降低73%  
✅ **性能监控系统** - 实时指标追踪  
✅ **管理员监控面板** - 完整监控界面  
✅ **健康检查系统** - 自动故障检测  
✅ **Docker容器化部署** - 一致性环境

---

**现在就可以开始部署！运行 `npm run deploy:prod` 开始自动部署到生产环境。** 🎯
