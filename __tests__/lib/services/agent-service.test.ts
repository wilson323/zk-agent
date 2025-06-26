// @ts-nocheck
/**
 * @file __tests__/lib/services/agent-service.test.ts
 * @description 智能体服务层单元测试
 * @author zk-agent开发团队
 * @lastUpdate 2024-12-19
 * @updateLog
 *   - 2024-12-19 初始创建智能体服务测试
 */

import { AgentService } from '@/lib/services/agent-service';
import { AgentType, AgentStatus } from '@/types/agents';
import { prisma } from '@/lib/database';

// Mock Prisma
jest.mock('@/lib/database', () => ({
  prisma: {
    agentConfig: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('AgentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAgents', () => {
    it('应该返回智能体列表和分页信息', async () => {
      const mockAgents = [
        {
          id: '1',
          name: 'Test Agent',
          description: 'Test Description',
          type: AgentType.CHAT,
          status: AgentStatus.ACTIVE,
          tags: ['test'],
          apiEndpoint: 'https://api.test.com',
          capabilities: ['chat'],
          configuration: {},
          metrics: {
            totalRequests: 100,
            successfulRequests: 95,
            failedRequests: 5,
            averageResponseTime: 200,
            dailyActiveUsers: 10,
            weeklyActiveUsers: 50,
            monthlyActiveUsers: 200,
            rating: 4.5,
            reviewCount: 10,
            uptime: 99.9
          },
          version: '1.0.0',
          isPublic: true,
          ownerId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { sessions: 5, messages: 100 }
        }
      ];

      mockPrisma.agentConfig.findMany.mockResolvedValue(mockAgents);
      mockPrisma.agentConfig.count.mockResolvedValue(1);

      const result = await AgentService.getAgents({
        page: 1,
        limit: 10
      });

      expect(result.agents).toHaveLength(1);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1
      });
      expect(mockPrisma.agentConfig.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              sessions: true,
              messages: true
            }
          }
        }
      });
    });

    it('应该支持搜索功能', async () => {
      mockPrisma.agentConfig.findMany.mockResolvedValue([]);
      mockPrisma.agentConfig.count.mockResolvedValue(0);

      await AgentService.getAgents({
        search: 'test query'
      });

      expect(mockPrisma.agentConfig.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'test query', mode: 'insensitive' } },
            { description: { contains: 'test query', mode: 'insensitive' } },
            { capabilities: { hasSome: ['test query'] } }
          ]
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              sessions: true,
              messages: true
            }
          }
        }
      });
    });

    it('应该支持标签筛选', async () => {
      mockPrisma.agentConfig.findMany.mockResolvedValue([]);
      mockPrisma.agentConfig.count.mockResolvedValue(0);

      await AgentService.getAgents({
        tags: ['chat', 'ai']
      });

      expect(mockPrisma.agentConfig.findMany).toHaveBeenCalledWith({
        where: {
          tags: { hasSome: ['chat', 'ai'] }
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              sessions: true,
              messages: true
            }
          }
        }
      });
    });
  });

  describe('getAgentById', () => {
    it('应该返回单个智能体', async () => {
      const mockAgent = {
        id: '1',
        name: 'Test Agent',
        description: 'Test Description',
        type: AgentType.CHAT,
        status: AgentStatus.ACTIVE,
        tags: ['test'],
        apiEndpoint: 'https://api.test.com',
        capabilities: ['chat'],
        configuration: {},
        metrics: {},
        version: '1.0.0',
        isPublic: true,
        ownerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { sessions: 5, messages: 100 }
      };

      mockPrisma.agentConfig.findUnique.mockResolvedValue(mockAgent);

      const result = await AgentService.getAgentById('1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('1');
      expect(mockPrisma.agentConfig.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          _count: {
            select: {
              sessions: true,
              messages: true
            }
          }
        }
      });
    });

    it('找不到智能体时应该返回null', async () => {
      mockPrisma.agentConfig.findUnique.mockResolvedValue(null);

      const result = await AgentService.getAgentById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createAgent', () => {
    it('应该创建新的智能体', async () => {
      const createData = {
        name: 'New Agent',
        description: 'New Description',
        type: AgentType.CHAT,
        tags: ['new'],
        apiEndpoint: 'https://api.new.com',
        capabilities: ['chat'],
        configuration: {
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 2000,
          systemPrompt: 'You are a helpful assistant',
          tools: [],
          rateLimits: {
            requestsPerMinute: 60,
            requestsPerHour: 1000,
            requestsPerDay: 10000
          },
          security: {
            requireAuth: true,
            allowedRoles: ['USER']
          }
        }
      };

      const mockCreatedAgent = {
        id: '2',
        ...createData,
        status: AgentStatus.ACTIVE,
        version: '1.0.0',
        isPublic: true,
        ownerId: 'user1',
        metrics: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0,
          dailyActiveUsers: 0,
          weeklyActiveUsers: 0,
          monthlyActiveUsers: 0,
          rating: 0,
          reviewCount: 0,
          uptime: 0
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { sessions: 0, messages: 0 }
      };

      mockPrisma.agentConfig.create.mockResolvedValue(mockCreatedAgent);

      const result = await AgentService.createAgent(createData, 'user1');

      expect(result.id).toBe('2');
      expect(result.name).toBe('New Agent');
      expect(mockPrisma.agentConfig.create).toHaveBeenCalledWith({
        data: {
          name: 'New Agent',
          description: 'New Description',
          type: AgentType.CHAT,
          status: AgentStatus.ACTIVE,
          tags: ['new'],
          apiEndpoint: 'https://api.new.com',
          capabilities: ['chat'],
          configuration: createData.configuration,
          version: '1.0.0',
          isPublic: true,
          ownerId: 'user1',
          metrics: expect.any(Object)
        },
        include: {
          _count: {
            select: {
              sessions: true,
              messages: true
            }
          }
        }
      });
    });
  });

  describe('updateAgent', () => {
    it('应该更新智能体', async () => {
      const updateData = {
        name: 'Updated Agent',
        description: 'Updated Description'
      };

      const mockUpdatedAgent = {
        id: '1',
        name: 'Updated Agent',
        description: 'Updated Description',
        type: AgentType.CHAT,
        status: AgentStatus.ACTIVE,
        tags: ['updated'],
        apiEndpoint: 'https://api.updated.com',
        capabilities: ['chat'],
        configuration: {},
        metrics: {},
        version: '1.0.0',
        isPublic: true,
        ownerId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { sessions: 5, messages: 100 }
      };

      mockPrisma.agentConfig.findUnique.mockResolvedValue({
        ownerId: 'user1'
      } as any);
      mockPrisma.agentConfig.update.mockResolvedValue(mockUpdatedAgent);

      const result = await AgentService.updateAgent('1', updateData, 'user1');

      expect(result?.name).toBe('Updated Agent');
      expect(mockPrisma.agentConfig.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          name: 'Updated Agent',
          description: 'Updated Description'
        },
        include: {
          _count: {
            select: {
              sessions: true,
              messages: true
            }
          }
        }
      });
    });

    it('无权限时应该抛出错误', async () => {
      mockPrisma.agentConfig.findUnique.mockResolvedValue({
        ownerId: 'other-user'
      } as any);

      await expect(
        AgentService.updateAgent('1', { name: 'Updated' }, 'user1')
      ).rejects.toThrow('Unauthorized to update this agent');
    });
  });

  describe('deleteAgent', () => {
    it('应该删除智能体', async () => {
      mockPrisma.agentConfig.findUnique.mockResolvedValue({
        ownerId: 'user1'
      } as any);
      mockPrisma.agentConfig.delete.mockResolvedValue({} as any);

      const result = await AgentService.deleteAgent('1', 'user1');

      expect(result).toBe(true);
      expect(mockPrisma.agentConfig.delete).toHaveBeenCalledWith({
        where: { id: '1' }
      });
    });

    it('无权限时应该抛出错误', async () => {
      mockPrisma.agentConfig.findUnique.mockResolvedValue({
        ownerId: 'other-user'
      } as any);

      await expect(
        AgentService.deleteAgent('1', 'user1')
      ).rejects.toThrow('Unauthorized to delete this agent');
    });
  });
}); 