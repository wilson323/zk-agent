import express from 'express';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: '.env.local' });

const app = express();
const port = process.env.PORT || 3000;

// 基础中间件
app.use(express.json());

// 健康检查路由
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 启动服务器
app.listen(port, () => {
  // 服务器启动成功，端口: ${port}
});

export default app;