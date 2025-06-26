// @ts-nocheck
/**
 * @file lib/mocks/enhanced-mock-service.ts
 * @description 增强Mock数据服务 - B团队协作组件
 * @author B团队后端架构师
 * @lastUpdate 2024-12-19
 * @purpose 提供完整Mock数据，支持前后端协作
 */

import { Logger } from '@/lib/utils/logger';

// Mock数据类型定义
interface MockUser {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'user' | 'moderator';
  status: 'active' | 'inactive' | 'banned';
  createdAt: string;
  updatedAt: string;
  profile: {
    firstName: string;
    lastName: string;
    bio?: string;
    location?: string;
    website?: string;
  };
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    notifications: boolean;
  };
}

interface MockCADFile {
  id: string;
  name: string;
  description?: string;
  fileSize: number;
  fileType: string;
  uploadedBy: string;
  uploadedAt: string;
  status: 'processing' | 'completed' | 'failed';
  analysisResult?: {
    complexity: number;
    errors: number;
    warnings: number;
    suggestions: string[];
  };
  tags: string[];
  isPublic: boolean;
}

interface MockChatMessage {
  id: string;
  conversationId: string;
  userId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  timestamp: string;
  metadata?: {
    aiProvider?: string;
    tokens?: number;
    latency?: number;
  };
}

interface MockAIModel {
  id: string;
  name: string;
  provider: 'fastgpt' | 'qianwen' | 'siliconflow';
  description: string;
  capabilities: string[];
  pricing: {
    inputTokens: number;
    outputTokens: number;
  };
  limits: {
    maxTokens: number;
    rateLimit: number;
  };
  status: 'active' | 'maintenance' | 'deprecated';
  performance: {
    averageLatency: number;
    successRate: number;
    uptime: number;
  };
}

interface MockPoster {
  id: string;
  title: string;
  description?: string;
  templateId: string;
  createdBy: string;
  createdAt: string;
  status: 'draft' | 'generating' | 'completed' | 'failed';
  config: {
    width: number;
    height: number;
    format: 'png' | 'jpg' | 'pdf';
    quality: number;
  };
  elements: Array<{
    type: 'text' | 'image' | 'shape';
    content: string;
    position: { x: number; y: number };
    style: Record<string, any>;
  }>;
}

interface MockMetrics {
  id: string;
  type: 'api_call' | 'database_query' | 'ai_request' | 'user_action';
  timestamp: string;
  duration: number;
  status: 'success' | 'error';
  metadata: Record<string, any>;
}

export class EnhancedMockService {
  private static instance: EnhancedMockService;
  private logger = new Logger('EnhancedMockService');
  private mockEnabled = process.env.NODE_ENV === 'development' || process.env.ENABLE_MOCKS === 'true';

  // Mock数据存储
  private mockUsers: MockUser[] = [];
  private mockCADFiles: MockCADFile[] = [];
  private mockChatMessages: MockChatMessage[] = [];
  private mockAIModels: MockAIModel[] = [];
  private mockPosters: MockPoster[] = [];
  private mockMetrics: MockMetrics[] = [];

  private constructor() {
    if (this.mockEnabled) {
      this.initializeMockData();
      this.logger.info('Enhanced Mock Service initialized');
    }
  }

  public static getInstance(): EnhancedMockService {
    if (!EnhancedMockService.instance) {
      EnhancedMockService.instance = new EnhancedMockService();
    }
    return EnhancedMockService.instance;
  }

  /**
   * 初始化Mock数据
   */
  private initializeMockData(): void {
    this.generateMockUsers();
    this.generateMockCADFiles();
    this.generateMockChatMessages();
    this.generateMockAIModels();
    this.generateMockPosters();
    this.generateMockMetrics();
  }

  /**
   * 生成Mock用户数据
   */
  private generateMockUsers(): void {
    const roles: MockUser['role'][] = ['admin', 'user', 'moderator'];
    const statuses: MockUser['status'][] = ['active', 'inactive', 'banned'];
    const themes: MockUser['preferences']['theme'][] = ['light', 'dark', 'auto'];

    for (let i = 1; i <= 50; i++) {
      this.mockUsers.push({
        id: `user_${i}`,
        username: `user${i}`,
        email: `user${i}@example.com`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=user${i}`,
        role: roles[Math.floor(Math.random() * roles.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        profile: {
          firstName: `First${i}`,
          lastName: `Last${i}`,
          bio: `Bio for user ${i}`,
          location: `City ${i}`,
          website: `https://user${i}.example.com`,
        },
        preferences: {
          theme: themes[Math.floor(Math.random() * themes.length)],
          language: 'zh-CN',
          notifications: Math.random() > 0.5,
        },
      });
    }
  }

  /**
   * 生成Mock CAD文件数据
   */
  private generateMockCADFiles(): void {
    const fileTypes = ['dwg', 'dxf', 'step', 'iges', 'stl'];
    const statuses: MockCADFile['status'][] = ['processing', 'completed', 'failed'];

    for (let i = 1; i <= 30; i++) {
      this.mockCADFiles.push({
        id: `cad_${i}`,
        name: `CAD_File_${i}.${fileTypes[Math.floor(Math.random() * fileTypes.length)]}`,
        description: `Description for CAD file ${i}`,
        fileSize: Math.floor(Math.random() * 10000000) + 1000000, // 1MB - 10MB
        fileType: fileTypes[Math.floor(Math.random() * fileTypes.length)],
        uploadedBy: `user_${Math.floor(Math.random() * 50) + 1}`,
        uploadedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: statuses[Math.floor(Math.random() * statuses.length)],
        analysisResult: {
          complexity: Math.floor(Math.random() * 100),
          errors: Math.floor(Math.random() * 10),
          warnings: Math.floor(Math.random() * 20),
          suggestions: [
            'Optimize geometry complexity',
            'Fix overlapping surfaces',
            'Reduce file size',
          ],
        },
        tags: [`tag${i}`, `category${Math.floor(i / 10) + 1}`],
        isPublic: Math.random() > 0.5,
      });
    }
  }

  /**
   * 生成Mock聊天消息数据
   */
  private generateMockChatMessages(): void {
    const messageTypes: MockChatMessage['type'][] = ['text', 'image', 'file', 'system'];
    const aiProviders = ['fastgpt', 'qianwen', 'siliconflow'];

    for (let i = 1; i <= 100; i++) {
      this.mockChatMessages.push({
        id: `msg_${i}`,
        conversationId: `conv_${Math.floor(i / 10) + 1}`,
        userId: `user_${Math.floor(Math.random() * 50) + 1}`,
        content: `This is message content ${i}`,
        type: messageTypes[Math.floor(Math.random() * messageTypes.length)],
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        metadata: {
          aiProvider: aiProviders[Math.floor(Math.random() * aiProviders.length)],
          tokens: Math.floor(Math.random() * 1000) + 100,
          latency: Math.floor(Math.random() * 2000) + 200,
        },
      });
    }
  }

  /**
   * 生成Mock AI模型数据
   */
  private generateMockAIModels(): void {
    const providers: MockAIModel['provider'][] = ['fastgpt', 'qianwen', 'siliconflow'];
    const statuses: MockAIModel['status'][] = ['active', 'maintenance', 'deprecated'];

    const models = [
      { name: 'GPT-3.5-Turbo', capabilities: ['text-generation', 'conversation', 'code-completion'] },
      { name: 'Qwen-Turbo', capabilities: ['text-generation', 'translation', 'summarization'] },
      { name: 'DeepSeek-Chat', capabilities: ['conversation', 'reasoning', 'code-generation'] },
      { name: 'GPT-4', capabilities: ['advanced-reasoning', 'multimodal', 'complex-tasks'] },
      { name: 'Qwen-Plus', capabilities: ['long-context', 'document-analysis', 'research'] },
    ];

    models.forEach((model, i) => {
      this.mockAIModels.push({
        id: `model_${i + 1}`,
        name: model.name,
        provider: providers[Math.floor(Math.random() * providers.length)],
        description: `${model.name} is a powerful AI model for various tasks`,
        capabilities: model.capabilities,
        pricing: {
          inputTokens: Math.random() * 0.01 + 0.001,
          outputTokens: Math.random() * 0.02 + 0.002,
        },
        limits: {
          maxTokens: Math.floor(Math.random() * 32000) + 4000,
          rateLimit: Math.floor(Math.random() * 1000) + 100,
        },
        status: statuses[Math.floor(Math.random() * statuses.length)],
        performance: {
          averageLatency: Math.floor(Math.random() * 2000) + 500,
          successRate: Math.random() * 10 + 90,
          uptime: Math.random() * 5 + 95,
        },
      });
    });
  }

  /**
   * 生成Mock海报数据
   */
  private generateMockPosters(): void {
    const statuses: MockPoster['status'][] = ['draft', 'generating', 'completed', 'failed'];
    const formats: MockPoster['config']['format'][] = ['png', 'jpg', 'pdf'];

    for (let i = 1; i <= 20; i++) {
      this.mockPosters.push({
        id: `poster_${i}`,
        title: `Poster ${i}`,
        description: `Description for poster ${i}`,
        templateId: `template_${Math.floor(Math.random() * 5) + 1}`,
        createdBy: `user_${Math.floor(Math.random() * 50) + 1}`,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: statuses[Math.floor(Math.random() * statuses.length)],
        config: {
          width: 1920,
          height: 1080,
          format: formats[Math.floor(Math.random() * formats.length)],
          quality: Math.floor(Math.random() * 40) + 60,
        },
        elements: [
          {
            type: 'text',
            content: `Title ${i}`,
            position: { x: 100, y: 100 },
            style: { fontSize: 24, color: '#000000' },
          },
          {
            type: 'image',
            content: `https://picsum.photos/400/300?random=${i}`,
            position: { x: 200, y: 200 },
            style: { width: 400, height: 300 },
          },
        ],
      });
    }
  }

  /**
   * 生成Mock指标数据
   */
  private generateMockMetrics(): void {
    const types: MockMetrics['type'][] = ['api_call', 'database_query', 'ai_request', 'user_action'];
    const statuses: MockMetrics['status'][] = ['success', 'error'];

    for (let i = 1; i <= 200; i++) {
      this.mockMetrics.push({
        id: `metric_${i}`,
        type: types[Math.floor(Math.random() * types.length)],
        timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        duration: Math.floor(Math.random() * 2000) + 50,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        metadata: {
          endpoint: `/api/endpoint${Math.floor(Math.random() * 10) + 1}`,
          userId: `user_${Math.floor(Math.random() * 50) + 1}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
    }
  }

  /**
   * 获取Mock用户数据
   */
  getMockUsers(page = 1, limit = 10, filters?: Partial<MockUser>): {
    data: MockUser[];
    total: number;
    page: number;
    limit: number;
  } {
    if (!this.mockEnabled) {
      return { data: [], total: 0, page, limit };
    }

    let filteredUsers = this.mockUsers;

    // 应用过滤器
    if (filters) {
      filteredUsers = this.mockUsers.filter(user => {
        return Object.entries(filters).every(([key, value]) => {
          if (value === undefined) {return true;}
          return user[key as keyof MockUser] === value;
        });
      });
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return {
      data: filteredUsers.slice(startIndex, endIndex),
      total: filteredUsers.length,
      page,
      limit,
    };
  }

  /**
   * 获取Mock CAD文件数据
   */
  getMockCADFiles(page = 1, limit = 10): {
    data: MockCADFile[];
    total: number;
    page: number;
    limit: number;
  } {
    if (!this.mockEnabled) {
      return { data: [], total: 0, page, limit };
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return {
      data: this.mockCADFiles.slice(startIndex, endIndex),
      total: this.mockCADFiles.length,
      page,
      limit,
    };
  }

  /**
   * 获取Mock聊天消息数据
   */
  getMockChatMessages(conversationId?: string, limit = 50): MockChatMessage[] {
    if (!this.mockEnabled) {
      return [];
    }

    let messages = this.mockChatMessages;

    if (conversationId) {
      messages = messages.filter(msg => msg.conversationId === conversationId);
    }

    return messages.slice(0, limit);
  }

  /**
   * 获取Mock AI模型数据
   */
  getMockAIModels(): MockAIModel[] {
    if (!this.mockEnabled) {
      return [];
    }

    return this.mockAIModels;
  }

  /**
   * 获取Mock海报数据
   */
  getMockPosters(userId?: string): MockPoster[] {
    if (!this.mockEnabled) {
      return [];
    }

    let posters = this.mockPosters;

    if (userId) {
      posters = posters.filter(poster => poster.createdBy === userId);
    }

    return posters;
  }

  /**
   * 获取Mock指标数据
   */
  getMockMetrics(type?: MockMetrics['type'], hours = 24): MockMetrics[] {
    if (!this.mockEnabled) {
      return [];
    }

    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    let metrics = this.mockMetrics.filter(
      metric => new Date(metric.timestamp).getTime() > cutoffTime
    );

    if (type) {
      metrics = metrics.filter(metric => metric.type === type);
    }

    return metrics;
  }

  /**
   * 创建Mock用户
   */
  createMockUser(userData: Partial<MockUser>): MockUser {
    if (!this.mockEnabled) {
      throw new Error('Mock service is disabled');
    }

    const newUser: MockUser = {
      id: `user_${Date.now()}`,
      username: userData.username || `user_${Date.now()}`,
      email: userData.email || `user_${Date.now()}@example.com`,
      avatar: userData.avatar,
      role: userData.role || 'user',
      status: userData.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      profile: {
        firstName: userData.profile?.firstName || 'First',
        lastName: userData.profile?.lastName || 'Last',
        bio: userData.profile?.bio,
        location: userData.profile?.location,
        website: userData.profile?.website,
      },
      preferences: {
        theme: userData.preferences?.theme || 'light',
        language: userData.preferences?.language || 'zh-CN',
        notifications: userData.preferences?.notifications ?? true,
      },
    };

    this.mockUsers.push(newUser);
    this.logger.info('Mock user created', { id: newUser.id, username: newUser.username });

    return newUser;
  }

  /**
   * 模拟API延迟
   */
  async simulateDelay(min = 100, max = 500): Promise<void> {
    if (!this.mockEnabled) {
      return;
    }

    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 模拟API错误
   */
  simulateError(errorRate = 0.1): void {
    if (!this.mockEnabled) {
      return;
    }

    if (Math.random() < errorRate) {
      throw new Error('Simulated API error');
    }
  }

  /**
   * 获取Mock统计数据
   */
  getMockStatistics(): any {
    if (!this.mockEnabled) {
      return null;
    }

    return {
      users: {
        total: this.mockUsers.length,
        active: this.mockUsers.filter(u => u.status === 'active').length,
        admins: this.mockUsers.filter(u => u.role === 'admin').length,
      },
      cadFiles: {
        total: this.mockCADFiles.length,
        completed: this.mockCADFiles.filter(f => f.status === 'completed').length,
        processing: this.mockCADFiles.filter(f => f.status === 'processing').length,
      },
      chatMessages: {
        total: this.mockChatMessages.length,
        today: this.mockChatMessages.filter(
          m => new Date(m.timestamp).toDateString() === new Date().toDateString()
        ).length,
      },
      aiModels: {
        total: this.mockAIModels.length,
        active: this.mockAIModels.filter(m => m.status === 'active').length,
      },
      posters: {
        total: this.mockPosters.length,
        completed: this.mockPosters.filter(p => p.status === 'completed').length,
      },
    };
  }

  /**
   * 重置Mock数据
   */
  resetMockData(): void {
    if (!this.mockEnabled) {
      return;
    }

    this.mockUsers = [];
    this.mockCADFiles = [];
    this.mockChatMessages = [];
    this.mockAIModels = [];
    this.mockPosters = [];
    this.mockMetrics = [];

    this.initializeMockData();
    this.logger.info('Mock data reset and regenerated');
  }

  /**
   * 检查Mock服务状态
   */
  isEnabled(): boolean {
    return this.mockEnabled;
  }
}

// 导出单例实例
export const enhancedMockService = EnhancedMockService.getInstance();

// 导出便捷方法
export const getMockUsers = enhancedMockService.getMockUsers.bind(enhancedMockService);
export const getMockCADFiles = enhancedMockService.getMockCADFiles.bind(enhancedMockService);
export const getMockChatMessages = enhancedMockService.getMockChatMessages.bind(enhancedMockService);
export const getMockAIModels = enhancedMockService.getMockAIModels.bind(enhancedMockService);
export const getMockPosters = enhancedMockService.getMockPosters.bind(enhancedMockService);
export const getMockMetrics = enhancedMockService.getMockMetrics.bind(enhancedMockService); 