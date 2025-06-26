/**
 * @file db\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import fs from 'fs';
import path from 'path';

// 常量定义
const AGENTS_FILE = path.join(process.cwd(), 'data', 'agents.json');

// 辅助函数
function readJsonFile(filePath: string, defaultValue: any = null) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return defaultValue;
  } catch (error) {
    console.error('Error reading JSON file:', error);
    return defaultValue;
  }
}

function writeJsonFile(filePath: string, data: any) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing JSON file:', error);
    throw error;
  }
}

function getChatSessionsFilePath(agentId: string) {
  return path.join(process.cwd(), 'data', 'sessions', `${agentId}.json`);
}

export const GET = createApiRoute(
  RouteConfigs.publicGet(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const url = new URL(req.url);
      const apiPath = url.pathname.split('/api/db/')[1];

      if (apiPath === 'init') {
        // 检查是否已初始化
        const isInitialized = fs.existsSync(AGENTS_FILE) && readJsonFile(AGENTS_FILE, []).length > 0;
        return ApiResponseWrapper.success({ initialized: isInitialized });
      }

      if (apiPath?.startsWith('sessions/')) {
        const agentId = apiPath.split('sessions/')[1];
        const sessionsFilePath = getChatSessionsFilePath(agentId);
        const sessions = readJsonFile(sessionsFilePath, []);
        return ApiResponseWrapper.success(sessions);
      }

      if (apiPath?.startsWith('agent/')) {
        const agentId = apiPath.split('agent/')[1];
        const agents = readJsonFile(AGENTS_FILE, []);
        const agent = agents.find((a: any) => a.id === agentId);
        
        if (!agent) {
          return ApiResponseWrapper.error('Agent not found', 404);
        }
        
        return ApiResponseWrapper.success(agent);
      }

      return ApiResponseWrapper.error('Invalid path', 400);
    } catch (error) {
      console.error('GET /api/db error:', error);
      return ApiResponseWrapper.error('Internal server error', 500);
    }
  }
);

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const body = await req.json();
      const { action, data } = body;

      // 根据action执行不同的操作
      if (action === 'saveApiConfig') {
        try {
          // 保存到本地文件
          const configDir = path.join(process.cwd(), 'data');
          const configPath = path.join(configDir, 'api-config.json');

          // 确保目录存在
          if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
          }

          // 写入文件
          fs.writeFileSync(configPath, JSON.stringify(data, null, 2));

          return ApiResponseWrapper.success({ message: '配置已保存' });
        } catch (error) {
          console.error('Save API config error:', error);
          return ApiResponseWrapper.error('保存配置失败', 500);
        }
      }

      if (action === 'getApiConfig') {
        try {
          // 从本地文件读取
          const configPath = path.join(process.cwd(), 'data', 'api-config.json');

          if (!fs.existsSync(configPath)) {
            return ApiResponseWrapper.error('配置不存在', 404);
          }

          const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          return ApiResponseWrapper.success({ data: configData });
        } catch (error) {
          console.error('Get API config error:', error);
          return ApiResponseWrapper.error('读取配置失败', 500);
        }
      }

      if (action === 'createAgent') {
        try {
          const agents = readJsonFile(AGENTS_FILE, []);
          const newAgent = {
            id: data.id || Date.now().toString(),
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          agents.push(newAgent);
          writeJsonFile(AGENTS_FILE, agents);
          
          return ApiResponseWrapper.success(newAgent);
        } catch (error) {
          console.error('Create agent error:', error);
          return ApiResponseWrapper.error('创建代理失败', 500);
        }
      }

      // 未知操作
      return ApiResponseWrapper.error(`未知操作: ${action}`, 400);
    } catch (error) {
      console.error('POST /api/db error:', error);
      return ApiResponseWrapper.error('Internal server error', 500);
    }
  }
);

export const PUT = createApiRoute(
  RouteConfigs.protectedPut(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const url = new URL(req.url);
      const apiPath = url.pathname.split('/api/db/')[1];

      let body;
      try {
        body = await req.json();
      } catch (error) {
        return ApiResponseWrapper.error('Invalid JSON body', 400);
      }

      if (apiPath?.startsWith('agent/')) {
        const agentId = apiPath.split('agent/')[1];
        const agents = readJsonFile(AGENTS_FILE, []);
        const index = agents.findIndex((a: any) => a.id === agentId);

        if (index !== -1) {
          agents[index] = {
            ...agents[index],
            ...body,
            config: {
              ...agents[index].config,
              ...body.config,
            },
            updatedAt: new Date().toISOString(),
          };

          writeJsonFile(AGENTS_FILE, agents);
          return ApiResponseWrapper.success(agents[index]);
        } else {
          return ApiResponseWrapper.error('Agent not found', 404);
        }
      }

      return ApiResponseWrapper.error('Invalid path', 400);
    } catch (error) {
      console.error('PUT /api/db error:', error);
      return ApiResponseWrapper.error('Internal server error', 500);
    }
  }
);

export const DELETE = createApiRoute(
  RouteConfigs.protectedDelete(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const url = new URL(req.url);
      const apiPath = url.pathname.split('/api/db/')[1];

      if (apiPath?.startsWith('agent/')) {
        const agentId = apiPath.split('agent/')[1];
        const agents = readJsonFile(AGENTS_FILE, []);
        const filteredAgents = agents.filter((agent: any) => agent.id !== agentId);

        if (agents.length === filteredAgents.length) {
          return ApiResponseWrapper.error('Agent not found', 404);
        }

        writeJsonFile(AGENTS_FILE, filteredAgents);
        return ApiResponseWrapper.success({ message: 'Agent deleted successfully' });
      }

      return ApiResponseWrapper.error('Invalid path', 400);
    } catch (error) {
      console.error('DELETE /api/db error:', error);
      return ApiResponseWrapper.error('Internal server error', 500);
    }
  }
);

