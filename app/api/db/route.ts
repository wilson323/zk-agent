/**
 * @file db\route.ts
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date 2025-06-25
 */

import { NextRequest } from 'next/server';
import { createApiRoute, RouteConfigs } from '@/lib/middleware/api-route-wrapper';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { ErrorCode } from '@/types/core';
import * as fs from 'fs';
import * as path from 'path';

// 辅助函数
const AGENTS_FILE = path.join(process.cwd(), 'data', 'agents.json');

function readJsonFile(filePath: string, defaultValue: any = []) {
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
  RouteConfigs.protectedGet(),
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
          return ApiResponseWrapper.error(ErrorCode.NOT_FOUND, 'Agent not found', null);
        }
        
        return ApiResponseWrapper.success(agent);
      }

      return ApiResponseWrapper.error(ErrorCode.VALIDATION_ERROR, 'Invalid path', null);
    } catch (error) {
      console.error('GET /api/db error:', error);
      return ApiResponseWrapper.error(ErrorCode.INTERNAL_SERVER_ERROR, 'Internal server error', null);
    }
  }
);

export const POST = createApiRoute(
  RouteConfigs.protectedPost(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const { action, data } = validatedBody;

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
          return ApiResponseWrapper.error(ErrorCode.INTERNAL_SERVER_ERROR, '保存配置失败', null);
        }
      }

      if (action === 'getApiConfig') {
        try {
          // 从本地文件读取
          const configPath = path.join(process.cwd(), 'data', 'api-config.json');

          if (!fs.existsSync(configPath)) {
            return ApiResponseWrapper.error(ErrorCode.NOT_FOUND, '配置不存在', null);
          }

          const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          return ApiResponseWrapper.success({ data: configData });
        } catch (error) {
          console.error('Get API config error:', error);
          return ApiResponseWrapper.error(ErrorCode.INTERNAL_SERVER_ERROR, '读取配置失败', null);
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
          return ApiResponseWrapper.error(ErrorCode.INTERNAL_SERVER_ERROR, '创建代理失败', null);
        }
      }

      // 未知操作
      return ApiResponseWrapper.error(ErrorCode.VALIDATION_ERROR, `未知操作: ${action}`, null);
    } catch (error) {
      console.error('POST /api/db error:', error);
      return ApiResponseWrapper.error(ErrorCode.INTERNAL_SERVER_ERROR, 'Internal server error', null);
    }
  }
);

export const PUT = createApiRoute(
  RouteConfigs.protectedPut(),
  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {
    try {
      const url = new URL(req.url);
      const apiPath = url.pathname.split('/api/db/')[1];

      if (apiPath?.startsWith('agent/')) {
        const agentId = apiPath.split('agent/')[1];
        const agents = readJsonFile(AGENTS_FILE, []);
        const index = agents.findIndex((a: any) => a.id === agentId);

        if (index !== -1) {
          agents[index] = {
            ...agents[index],
            ...validatedBody,
            config: {
              ...agents[index].config,
              ...validatedBody.config,
            },
            updatedAt: new Date().toISOString(),
          };

          writeJsonFile(AGENTS_FILE, agents);
          return ApiResponseWrapper.success(agents[index]);
        } else {
          return ApiResponseWrapper.error(ErrorCode.NOT_FOUND, 'Agent not found', null);
        }
      }

      return ApiResponseWrapper.error(ErrorCode.VALIDATION_ERROR, 'Invalid path', null);
    } catch (error) {
      console.error('PUT /api/db error:', error);
      return ApiResponseWrapper.error(ErrorCode.INTERNAL_SERVER_ERROR, 'Internal server error', null);
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
          return ApiResponseWrapper.error(ErrorCode.NOT_FOUND, 'Agent not found', null);
        }

        writeJsonFile(AGENTS_FILE, filteredAgents);
        return ApiResponseWrapper.success({ message: 'Agent deleted successfully' });
      }

      return ApiResponseWrapper.error(ErrorCode.VALIDATION_ERROR, 'Invalid path', null);
    } catch (error) {
      console.error('DELETE /api/db error:', error);
      return ApiResponseWrapper.error(ErrorCode.INTERNAL_SERVER_ERROR, 'Internal server error', null);
    }
  }
);

