# 开发计划B：智能体功能集成与CAD整合专家

## 👨‍💻 开发者B 职责范围

### 🎯 核心职责
- **CAD智能体功能整合**：整合三个项目的CAD解读功能到当前项目
- **智能体系统完善**：建立完整的智能体管理和交互系统
- **API接口开发**：实现所有智能体的后端接口和服务
- **数据处理优化**：优化文件上传、解析、分析流程
- **生产级部署**：确保所有功能可直接部署到生产环境

### 📂 负责目录和文件

#### 主要工作目录
```
├── components/agui/             # 智能体UI组件（完全负责）
│   ├── AgentChatContainer.tsx  # 对话智能体容器
│   ├── CADAnalyzerContainer.tsx # CAD分析师容器
│   ├── PosterGeneratorContainer.tsx # 海报设计师容器
│   ├── AgentSwitcher.tsx       # 智能体切换器
│   └── AgentProvider.tsx       # 智能体状态管理
├── app/api/                     # API路由（完全负责）
│   ├── ag-ui/                  # 智能体UI相关API
│   ├── cad/                    # CAD处理API
│   ├── fastgpt/                # FastGPT集成API
│   ├── analytics/              # 数据分析API
│   └── images/                 # 图像处理API
├── lib/                        # 业务逻辑（完全负责）
│   ├── agents/                 # 智能体管理
│   ├── api/                    # API客户端
│   ├── services/               # 业务服务
│   ├── managers/               # 数据管理器
│   └── utils/                  # 业务工具函数
├── types/                      # 类型定义（智能体相关）
│   ├── agents/                 # 智能体类型
│   ├── cad/                    # CAD相关类型
│   └── api/                    # API类型
```

#### 页面功能文件
```
├── app/
│   ├── chat/page.tsx           # 聊天页面（智能体集成逻辑）
│   ├── cad-analyzer/[fileId]/page.tsx # CAD分析页面
│   ├── poster-generator/page.tsx # 海报生成页面
│   └── admin/                  # 管理后台
```

#### 配置和集成文件
```
├── config/                     # 配置文件
│   ├── agents.config.ts        # 智能体配置
│   ├── cad-analyzer.config.ts  # CAD分析配置
│   └── api.config.ts           # API配置
├── middleware/                 # 中间件
└── scripts/                    # 构建和部署脚本
```

## 🛠️ 开发任务清单

### 第一阶段：智能体系统架构 (2周)

#### Week 1: 核心智能体管理系统
- [ ] **智能体注册和管理系统**
  ```typescript
  // lib/agents/registry.ts
  export class AgentRegistry {
    private agents: Map<string, Agent> = new Map();
    
    register(agent: Agent): void {
      this.agents.set(agent.id, agent);
    }
    
    getAgent(id: string): Agent | undefined {
      return this.agents.get(id);
    }
    
    getAllAgents(): Agent[] {
      return Array.from(this.agents.values());
    }
    
    getAgentsByCategory(category: AgentCategory): Agent[] {
      return this.getAllAgents().filter(agent => agent.category === category);
    }
  }
  ```

- [ ] **智能体状态管理**
  ```typescript
  // lib/stores/agent-store.ts
  import { create } from 'zustand';
  
  interface AgentStore {
    currentAgent: Agent | null;
    agentHistory: Agent[];
    isLoading: boolean;
    error: string | null;
    
    setCurrentAgent: (agent: Agent) => void;
    addToHistory: (agent: Agent) => void;
    clearHistory: () => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
  }
  
  export const useAgentStore = create<AgentStore>((set, get) => ({
    currentAgent: null,
    agentHistory: [],
    isLoading: false,
    error: null,
    
    setCurrentAgent: (agent) => {
      set({ currentAgent: agent });
      get().addToHistory(agent);
    },
    
    addToHistory: (agent) => {
      const history = get().agentHistory;
      const exists = history.find(h => h.id === agent.id);
      if (!exists) {
        set({ agentHistory: [...history, agent] });
      }
    },
    
    clearHistory: () => set({ agentHistory: [] }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
  }));
  ```

#### Week 2: 智能体容器组件开发
- [ ] **通用智能体容器基类**
  ```typescript
  // components/agui/BaseAgentContainer.tsx
  export interface BaseAgentContainerProps {
    agent: Agent;
    className?: string;
    onMessage?: (message: string) => void;
    onError?: (error: string) => void;
  }
  
  export abstract class BaseAgentContainer<T = any> extends React.Component<BaseAgentContainerProps, T> {
    abstract render(): React.ReactNode;
    
    protected handleMessage = (message: string) => {
      this.props.onMessage?.(message);
    };
    
    protected handleError = (error: string) => {
      this.props.onError?.(error);
    };
  }
  ```

- [ ] **对话智能体容器**
  ```typescript
  // components/agui/AgentChatContainer.tsx
  export const AgentChatContainer: React.FC<AgentContainerProps> = ({ agent }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    
    const sendMessage = async (content: string) => {
      setIsTyping(true);
      try {
        const response = await api.chat.sendMessage({
          agentId: agent.id,
          content,
          sessionId: generateSessionId(),
        });
        
        setMessages(prev => [...prev, response.message]);
      } catch (error) {
        console.error('Failed to send message:', error);
      } finally {
        setIsTyping(false);
      }
    };
    
    return (
      <div className="flex flex-col h-full">
        <MessageList messages={messages} isTyping={isTyping} />
        <MessageInput onSend={sendMessage} />
      </div>
    );
  };
  ```

### 第二阶段：CAD智能体核心功能整合 (3周)

#### Week 3: CAD文件处理系统
- [ ] **CAD文件上传和验证**
  ```typescript
  // lib/services/cad-upload.service.ts
  export class CADUploadService {
    private supportedFormats = ['.dwg', '.dxf', '.step', '.stp', '.iges', '.igs'];
    
    async uploadFile(file: File): Promise<UploadResult> {
      // 文件格式验证
      if (!this.validateFileFormat(file)) {
        throw new Error('Unsupported CAD file format');
      }
      
      // 文件大小验证
      if (!this.validateFileSize(file)) {
        throw new Error('File size exceeds limit');
      }
      
      // 上传到服务器
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', this.detectFileType(file));
      
      const response = await fetch('/api/cad/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    }
    
    private validateFileFormat(file: File): boolean {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      return this.supportedFormats.includes(extension);
    }
    
    private validateFileSize(file: File): boolean {
      const maxSize = 100 * 1024 * 1024; // 100MB
      return file.size <= maxSize;
    }
    
    private detectFileType(file: File): CADFileType {
      const extension = file.name.split('.').pop()?.toLowerCase();
      switch (extension) {
        case 'dwg':
        case 'dxf':
          return 'autocad';
        case 'step':
        case 'stp':
          return 'step';
        case 'iges':
        case 'igs':
          return 'iges';
        default:
          return 'unknown';
      }
    }
  }
  ```

- [ ] **CAD文件解析API**
  ```typescript
  // app/api/cad/parse/route.ts
  export async function POST(request: Request) {
    try {
      const { fileId, fileType } = await request.json();
      
      // 根据文件类型选择解析器
      const parser = CADParserFactory.createParser(fileType);
      const parseResult = await parser.parse(fileId);
      
      // 保存解析结果
      await db.cadFiles.update(fileId, {
        status: 'parsed',
        parseResult,
        parsedAt: new Date(),
      });
      
      return Response.json({ 
        success: true, 
        result: parseResult 
      });
    } catch (error) {
      console.error('CAD parsing error:', error);
      return Response.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  }
  ```

#### Week 4: CAD分析智能体容器
- [ ] **CAD分析师容器组件**
  ```typescript
  // components/agui/CADAnalyzerContainer.tsx
  export const CADAnalyzerContainer: React.FC<AgentContainerProps> = ({ agent }) => {
    const [uploadedFile, setUploadedFile] = useState<CADFile | null>(null);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);
    
    const handleFileUpload = async (files: FileList) => {
      const file = files[0];
      if (!file) return;
      
      try {
        setIsAnalyzing(true);
        
        // 上传文件
        const uploadResult = await cadUploadService.uploadFile(file);
        setUploadedFile(uploadResult.file);
        
        // 开始解析
        await cadParseService.parseFile(uploadResult.file.id);
        
        // 开始AI分析
        const analysis = await cadAnalysisService.analyzeFile(uploadResult.file.id);
        setAnalysisResult(analysis);
        setAnalysisHistory(prev => [analysis, ...prev]);
        
      } catch (error) {
        console.error('Analysis failed:', error);
        toast.error('分析失败: ' + error.message);
      } finally {
        setIsAnalyzing(false);
      }
    };
    
    const handleRegenerateAnalysis = async () => {
      if (!uploadedFile) return;
      
      setIsAnalyzing(true);
      try {
        const newAnalysis = await cadAnalysisService.analyzeFile(
          uploadedFile.id, 
          { regenerate: true }
        );
        setAnalysisResult(newAnalysis);
        setAnalysisHistory(prev => [newAnalysis, ...prev]);
      } catch (error) {
        console.error('Regeneration failed:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };
    
    return (
      <div className="flex flex-col h-full space-y-4">
        {/* 文件上传区域 */}
        <CADFileUploader 
          onFileUpload={handleFileUpload} 
          isUploading={isAnalyzing}
          supportedFormats={['.dwg', '.dxf', '.step', '.iges']}
        />
        
        {/* 文件信息展示 */}
        {uploadedFile && (
          <CADFileInfo 
            file={uploadedFile} 
            onRegenerate={handleRegenerateAnalysis}
          />
        )}
        
        {/* 分析结果展示 */}
        {isAnalyzing ? (
          <AnalysisLoadingIndicator />
        ) : analysisResult ? (
          <CADAnalysisResult 
            result={analysisResult}
            onExport={() => exportAnalysisReport(analysisResult)}
          />
        ) : (
          <CADAnalysisPlaceholder />
        )}
        
        {/* 历史记录 */}
        {analysisHistory.length > 0 && (
          <AnalysisHistory 
            history={analysisHistory}
            onSelectHistory={setAnalysisResult}
          />
        )}
      </div>
    );
  };
  ```

#### Week 5: CAD分析AI集成
- [ ] **CAD分析服务**
  ```typescript
  // lib/services/cad-analysis.service.ts
  export class CADAnalysisService {
    private aiService: AIService;
    
    constructor() {
      this.aiService = new AIService();
    }
    
    async analyzeFile(fileId: string, options?: AnalysisOptions): Promise<AnalysisResult> {
      // 获取解析结果
      const parseResult = await this.getParseResult(fileId);
      
      // 构建分析提示词
      const prompt = this.buildAnalysisPrompt(parseResult, options);
      
      // AI分析
      const aiResponse = await this.aiService.chat({
        messages: [{ role: 'user', content: prompt }],
        model: 'qwen-max',
        temperature: 0.3,
      });
      
      // 解析AI响应
      const analysis = this.parseAIResponse(aiResponse.content);
      
      // 保存分析结果
      const result: AnalysisResult = {
        id: generateId(),
        fileId,
        analysis,
        createdAt: new Date(),
        model: 'qwen-max',
        options,
      };
      
      await db.cadAnalysis.create(result);
      
      return result;
    }
    
    private buildAnalysisPrompt(parseResult: ParseResult, options?: AnalysisOptions): string {
      return `
        请分析以下CAD文件数据，提供详细的工程分析报告：
        
        文件信息：
        - 文件类型: ${parseResult.fileType}
        - 实体数量: ${parseResult.entities.length}
        - 图层数量: ${parseResult.layers.length}
        - 尺寸范围: ${parseResult.boundingBox}
        
        实体信息：
        ${parseResult.entities.map(entity => `- ${entity.type}: ${entity.properties}`).join('\n')}
        
        请从以下角度进行分析：
        1. 设计意图和功能分析
        2. 结构特征识别
        3. 制造工艺评估
        4. 设计建议和优化点
        5. 潜在问题识别
        
        ${options?.focus ? `特别关注: ${options.focus}` : ''}
        
        请用中文回答，格式要清晰易读。
      `;
    }
    
    private parseAIResponse(content: string): CADAnalysis {
      // 解析AI返回的分析结果
      // 可以使用正则表达式或者让AI返回结构化数据
      return {
        designIntent: this.extractSection(content, '设计意图'),
        structuralFeatures: this.extractSection(content, '结构特征'),
        manufacturingAssessment: this.extractSection(content, '制造工艺'),
        suggestions: this.extractSection(content, '设计建议'),
        issues: this.extractSection(content, '潜在问题'),
        summary: content,
      };
    }
  }
  ```

### 第三阶段：其他智能体功能完善 (2周)

#### Week 6: 海报设计智能体
- [ ] **海报生成服务**
  ```typescript
  // lib/services/poster-generation.service.ts
  export class PosterGenerationService {
    async generatePoster(prompt: PosterPrompt): Promise<GenerationResult> {
      // 构建图像生成请求
      const imagePrompt = this.buildImagePrompt(prompt);
      
      // 调用图像生成API
      const imageResult = await this.generateImage(imagePrompt);
      
      // 如果需要添加文字，进行后处理
      if (prompt.texts && prompt.texts.length > 0) {
        const processedImage = await this.addTextsToImage(
          imageResult.imageUrl, 
          prompt.texts
        );
        imageResult.imageUrl = processedImage.url;
      }
      
      // 保存生成结果
      const result: GenerationResult = {
        id: generateId(),
        prompt,
        imageUrl: imageResult.imageUrl,
        createdAt: new Date(),
        model: imageResult.model,
      };
      
      await db.posterGeneration.create(result);
      
      return result;
    }
    
    private buildImagePrompt(prompt: PosterPrompt): string {
      const styleMap = {
        modern: '现代简约风格',
        vintage: '复古风格',
        minimalist: '极简风格',
        colorful: '色彩丰富',
        professional: '专业商务风格',
      };
      
      return `
        ${prompt.description}
        风格: ${styleMap[prompt.style] || prompt.style}
        颜色: ${prompt.colors?.join(', ') || '和谐配色'}
        布局: ${prompt.layout || '平衡布局'}
        高质量海报设计，专业级别，8K分辨率
      `;
    }
  }
  ```

- [ ] **海报生成器容器**
  ```typescript
  // components/agui/PosterGeneratorContainer.tsx
  export const PosterGeneratorContainer: React.FC<AgentContainerProps> = ({ agent }) => {
    const [prompt, setPrompt] = useState<PosterPrompt>({
      description: '',
      style: 'modern',
      colors: [],
      layout: 'vertical',
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedPosters, setGeneratedPosters] = useState<GenerationResult[]>([]);
    
    const handleGenerate = async () => {
      if (!prompt.description.trim()) {
        toast.error('请输入海报描述');
        return;
      }
      
      setIsGenerating(true);
      try {
        const result = await posterService.generatePoster(prompt);
        setGeneratedPosters(prev => [result, ...prev]);
        toast.success('海报生成成功！');
      } catch (error) {
        console.error('Generation failed:', error);
        toast.error('生成失败: ' + error.message);
      } finally {
        setIsGenerating(false);
      }
    };
    
    return (
      <div className="flex flex-col h-full space-y-4">
        {/* 提示词输入 */}
        <PosterPromptEditor 
          prompt={prompt}
          onChange={setPrompt}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
        
        {/* 生成中指示器 */}
        {isGenerating && <GenerationProgressIndicator />}
        
        {/* 生成结果 */}
        {generatedPosters.length > 0 && (
          <PosterGallery 
            posters={generatedPosters}
            onDownload={(poster) => downloadImage(poster.imageUrl)}
            onRegenerate={(poster) => handleRegenerateWithSimilarPrompt(poster)}
          />
        )}
      </div>
    );
  };
  ```

#### Week 7: 智能体切换和状态管理
- [ ] **智能体切换器**
  ```typescript
  // components/agui/AgentSwitcher.tsx
  export const AgentSwitcher: React.FC = () => {
    const { currentAgent, setCurrentAgent } = useAgentStore();
    const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
    
    useEffect(() => {
      // 加载可用智能体列表
      loadAvailableAgents().then(setAvailableAgents);
    }, []);
    
    const handleAgentSwitch = (agent: Agent) => {
      setCurrentAgent(agent);
      
      // 记录切换事件
      analytics.track('agent_switch', {
        from: currentAgent?.id,
        to: agent.id,
        timestamp: new Date(),
      });
      
      // 路由跳转
      router.push(agent.route);
    };
    
    return (
      <div className="flex flex-col space-y-2">
        <h3 className="font-semibold text-lg">选择智能体</h3>
        <div className="grid grid-cols-1 gap-2">
          {availableAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isActive={currentAgent?.id === agent.id}
              onClick={() => handleAgentSwitch(agent)}
            />
          ))}
        </div>
      </div>
    );
  };
  ```

### 第四阶段：生产级优化和部署 (1周)

#### Week 8: 生产级优化
- [ ] **错误处理和恢复**
  ```typescript
  // lib/utils/error-boundary.ts
  export class AgentErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
      super(props);
      this.state = { hasError: false, error: null };
    }
    
    static getDerivedStateFromError(error: Error): State {
      return { hasError: true, error };
    }
    
    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
      // 记录错误到监控系统
      errorMonitoring.captureException(error, {
        context: 'AgentContainer',
        errorInfo,
        agentId: this.props.agentId,
      });
    }
    
    render() {
      if (this.state.hasError) {
        return (
          <AgentErrorFallback 
            error={this.state.error}
            onRetry={() => this.setState({ hasError: false, error: null })}
          />
        );
      }
      
      return this.props.children;
    }
  }
  ```

- [ ] **性能监控和优化**
- [ ] **缓存策略实现**
- [ ] **生产环境配置**

## 🔧 开发规范和约束

### 智能体接口规范
```typescript
// types/agents/base.ts
export interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  category: AgentCategory;
  status: AgentStatus;
  version: string;
  capabilities: string[];
  config: AgentConfig;
  metadata?: AgentMetadata;
}

export interface AgentConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  customSettings?: Record<string, any>;
}

export interface AgentMetadata {
  author: string;
  tags: string[];
  popularity: number;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### API接口规范
```typescript
// types/api/common.ts
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  requestId: string;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 文件命名和组织规范
```
components/agui/
├── containers/              # 智能体容器组件
│   ├── AgentChatContainer.tsx
│   ├── CADAnalyzerContainer.tsx
│   └── PosterGeneratorContainer.tsx
├── common/                 # 通用组件
│   ├── AgentCard.tsx
│   ├── AgentSwitcher.tsx
│   └── AgentErrorBoundary.tsx
└── ui/                     # 专用UI组件
    ├── FileUploader.tsx
    ├── AnalysisResult.tsx
    └── GenerationProgress.tsx
```

## 🚫 禁止修改的文件

### 严格禁止修改
```
components/ui/              # UI组件库（开发者A负责）
├── button.tsx             # ❌ 禁止修改
├── card.tsx               # ❌ 禁止修改
└── dialog.tsx             # ❌ 禁止修改

styles/                    # 样式系统（开发者A负责）
├── globals.css            # ❌ 禁止修改
├── responsive.css         # ❌ 禁止修改
└── design-tokens.css      # ❌ 禁止修改

hooks/                     # UI相关Hook（开发者A负责）
├── use-responsive.ts      # ❌ 禁止修改
├── use-device.ts          # ❌ 禁止修改
└── use-theme.ts           # ❌ 禁止修改
```

### 需要协调的文件
```
app/page.tsx               # 需要协调欢迎界面集成
app/layout.tsx             # 需要协调布局组件集成
types/shared/              # 需要协调共享类型定义
```

## 🔗 与开发者A的接口约定

### 提供给开发者A的接口
```typescript
// 智能体数据提供接口
export const agentDataProvider = {
  getAllAgents: (): Promise<Agent[]> => { /* 实现 */ },
  getAgentById: (id: string): Promise<Agent | null> => { /* 实现 */ },
  getAgentsByCategory: (category: AgentCategory): Promise<Agent[]> => { /* 实现 */ },
};

// 智能体状态接口
export const agentStatusProvider = {
  getCurrentAgent: (): Agent | null => { /* 实现 */ },
  isAgentOnline: (id: string): Promise<boolean> => { /* 实现 */ },
  getAgentCapabilities: (id: string): Promise<string[]> => { /* 实现 */ },
};
```

### 使用开发者A提供的接口
```typescript
// 使用UI组件
import { Button, Card, Dialog } from '@/components/ui';
import { useDeviceDetection, useResponsive } from '@/hooks';

// 使用响应式工具
const deviceInfo = useDeviceDetection();
const responsiveValue = useResponsive({
  mobile: 'compact',
  tablet: 'normal', 
  desktop: 'expanded'
});
```

## 📋 验收标准

### 功能测试
- [ ] CAD文件上传、解析、分析流程完整
- [ ] 海报生成功能正常
- [ ] 智能体切换无缝衔接
- [ ] 所有API接口响应正常
- [ ] 错误处理机制完善

### 性能测试
- [ ] CAD文件处理性能优化（< 30s 大文件）
- [ ] 图像生成响应时间合理（< 60s）
- [ ] API响应时间 < 2s（95%请求）
- [ ] 内存使用优化，无明显泄漏

### 生产就绪
- [ ] 完整的错误监控和日志
- [ ] 生产环境配置完备
- [ ] 安全性审查通过
- [ ] 性能监控部署

## 🔄 协作流程

### 日常协作
1. **每日同步**：每天下午4点同步功能集成进度
2. **API接口变更**：提前48小时通知开发者A
3. **数据结构变更**：通过共享类型文件协调
4. **功能测试**：每完成一个智能体进行联合测试

### 冲突解决
1. **接口冲突**：优先保证功能完整性
2. **性能冲突**：业务功能优先，UI适配其次
3. **数据冲突**：以最新的业务需求为准

---

**开发者B专注于构建强大的智能体生态系统，整合最优秀的CAD分析功能，确保每个智能体都能发挥最大价值！** 🤖🔧 