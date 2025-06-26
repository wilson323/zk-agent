// @ts-nocheck
/**
 * @file __tests__/mocks/server.ts
 * @description MSW服务器配置 - API测试Mock服务
 * @author B团队测试架构师
 * @lastUpdate 2024-12-19
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// 设置MSW服务器
export const server = setupServer(...handlers);

// 服务器配置
server.events.on('request:start', ({ request }) => {
  console.log('MSW intercepted:', request.method, request.url);
});

server.events.on('request:match', ({ request }) => {
  console.log('MSW matched:', request.method, request.url);
});

server.events.on('request:unhandled', ({ request }) => {
  console.warn('MSW unhandled:', request.method, request.url);
}); 