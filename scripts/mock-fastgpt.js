const http = require('http');
const url = require('url');

// Mock FastGPT服务器
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 处理OPTIONS请求
  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 健康检查
  if (path === '/api/health' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'mock-fastgpt',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // 聊天完成接口
  if (path === '/api/v1/chat/completions' && method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        
        // 模拟流式响应
        if (data.stream) {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          });

          // 模拟流式数据
          const messages = [
            'Hello! This is a mock response from FastGPT.',
            ' I can help you with various tasks.',
            ' This is a test environment.',
            ' All responses are simulated.'
          ];

          let index = 0;
          const interval = setInterval(() => {
            if (index < messages.length) {
              const chunk = {
                id: 'mock-' + Date.now(),
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: 'mock-model',
                choices: [{
                  index: 0,
                  delta: {
                    content: messages[index]
                  },
                  finish_reason: null
                }]
              };
              
              res.write(`data: ${JSON.stringify(chunk)}\n\n`);
              index++;
            } else {
              // 发送结束标记
              const endChunk = {
                id: 'mock-' + Date.now(),
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: 'mock-model',
                choices: [{
                  index: 0,
                  delta: {},
                  finish_reason: 'stop'
                }]
              };
              
              res.write(`data: ${JSON.stringify(endChunk)}\n\n`);
              res.write('data: [DONE]\n\n');
              res.end();
              clearInterval(interval);
            }
          }, 100);
        } else {
          // 非流式响应
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            id: 'mock-' + Date.now(),
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: 'mock-model',
            choices: [{
              index: 0,
              message: {
                role: 'assistant',
                content: 'Hello! This is a mock response from FastGPT. I can help you with various tasks. This is a test environment.'
              },
              finish_reason: 'stop'
            }],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 20,
              total_tokens: 30
            }
          }));
        }
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // 初始化聊天接口
  if (path === '/api/init-chat' && method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      chatId: 'mock-chat-' + Date.now(),
      appId: 'mock-app-id',
      status: 'initialized'
    }));
    return;
  }

  // 批量转发接口
  if (path === '/api/batch-forward' && method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      processed: 1,
      results: [{
        id: 'mock-result-' + Date.now(),
        status: 'completed',
        response: 'Mock batch processing completed'
      }]
    }));
    return;
  }

  // 反馈接口
  if (path === '/api/feedback' && method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: 'Feedback received'
    }));
    return;
  }

  // 测试连接接口
  if (path === '/api/test-connection' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'connected',
      latency: Math.floor(Math.random() * 100) + 10,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // 404 处理
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Mock FastGPT server running on port ${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET  /api/health');
  console.log('  POST /api/v1/chat/completions');
  console.log('  POST /api/init-chat');
  console.log('  POST /api/batch-forward');
  console.log('  POST /api/feedback');
  console.log('  GET  /api/test-connection');
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('Shutting down mock FastGPT server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Shutting down mock FastGPT server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}); 