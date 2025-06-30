# 建议的Shell命令

## 开发命令
- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run start` - 启动生产服务器
- `npm run lint` - 运行ESLint检查
- `npm run lint:fix` - 自动修复ESLint问题
- `npm run format` - 运行Prettier格式化
- `npm run format:check` - 检查代码格式

## 测试命令
- `npm run test` - 运行Jest单元测试
- `npm run test:watch` - 监听模式运行测试
- `npm run test:coverage` - 生成测试覆盖率报告
- `npm run test:e2e` - 运行Playwright E2E测试
- `npm run test:performance` - 运行K6性能测试
- `npm run test:security` - 运行安全测试

## 数据库命令
- `npm run db:generate` - 生成Prisma客户端
- `npm run db:push` - 推送schema到数据库
- `npm run db:migrate` - 运行数据库迁移
- `npm run db:studio` - 打开Prisma Studio
- `npm run db:seed` - 填充种子数据
- `npm run db:reset` - 重置数据库
- `npm run db:health-check` - 数据库健康检查
- `npm run db:performance-report` - 生成性能报告

## 项目管理命令
- `npm run validate` - 验证项目完整性
- `npm run security:audit` - 安全审计
- `npm run security:scan` - 安全扫描
- `npm run prepare` - Husky安装
- `npm run clean` - 清理构建文件

## Docker命令
- `docker build -t zk-agent .` - 构建Docker镜像
- `docker run -p 3000:3000 zk-agent` - 运行容器
- `docker-compose up -d` - 启动完整环境