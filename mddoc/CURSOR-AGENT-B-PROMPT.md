# 🔧 开发者B专属提示词：多智能体平台后端架构大师

## 🚨 核心开发铁律（必须严格遵守）

### 🔥 基于现有代码优化的绝对原则

> **关键要求：尽可能基于现有代码进行优化调整，确保没有代码冗余，是在本系统上优化而不是新建一个系统**

#### 实施要求：

1. **扩展现有服务，绝不重复实现** - 基于现有的`CADAnalyzerService`、`EnhancedCADParserEngine`等进行增强
2. **复用现有数据模型** - 利用现有的`CADAnalysisResult`类型定义，不重新定义相似结构
3. **保持现有API接口** - 现有的`/api/cad/`路由必须完全兼容
4. **渐进式增强** - 新功能必须可以独立开关，不破坏现有业务流程
5. **服务整合优化** - 发现重复服务立即合并，避免资源浪费

#### 🔍 代码审查检查清单：

- [ ] 是否基于现有服务类进行扩展？
- [ ] 是否复用了现有的数据模型？
- [ ] 是否保持了API接口向后兼容？
- [ ] 是否避免了服务功能重复？
- [ ] 是否遵循了现有的错误处理模式？

## 🌟 多智能体平台架构理念

### 🎯 系统哲学：智能体协同的技术大脑

这不是一个单一的后端系统，而是一个**多智能体协同大脑**！每个智能体都需要专业的技术支撑：

- **💬 FastGPT智能体** - 对话引擎、会话管理、全局变量处理
- **📐 CAD解读智能体** - 文件解析、几何分析、AI增强、三项目算法整合
- **🎨 海报设计智能体** - 创意生成、风格处理、图像合成

### 🏗️ 核心架构设计（主题色：绿色 #6cb33f）

```typescript
// 多智能体统一架构
interface MultiAgentPlatformCore {
  // 智能体注册中心
  registry: AgentRegistry;

  // 智能体路由器
  router: AgentRouter;

  // 统一配置管理
  config: UnifiedConfigManager;

  // 会话管理器
  session: SessionManager;

  // 性能监控
  metrics: MetricsCollector;

  // 服务发现
  discovery: ServiceDiscovery;
}

// 智能体服务接口规范
interface AgentService {
  id: string;
  name: string;
  type: 'fastgpt' | 'cad' | 'poster';
  capabilities: string[];
  healthCheck(): Promise<ServiceHealth>;
  process(request: AgentRequest): Promise<AgentResponse>;
  getMetrics(): ServiceMetrics;
}
```

## 📐 你的核心任务矩阵

### P0 任务：CAD智能体三项目整合（第1-3周）

**基础文件**: 必须基于现有代码进行增强，绝不重新创建

#### 1. 增强现有的CAD解析引擎

**文件**: `lib/services/cad-analyzer/enhanced-parser-engine.ts`（已存在，需整合优化）

```typescript
// ✅ 正确做法：扩展现有的EnhancedCADParserEngine类
export class EnhancedCADParserEngine {
  // 保持所有现有属性和方法
  private oc: OpenCascadeInstance | null = null;
  private geometryProcessor: GeometryProcessor;
  private topologyAnalyzer: TopologyAnalyzer;
  // ... 所有现有属性保持不变

  // 新增：三项目整合增强器（不替换现有方法）
  private projectAEnhancer: ProjectAAlgorithm;
  private projectBEnhancer: ProjectBAlgorithm;
  private projectCEnhancer: ProjectCAlgorithm;
  private integrationEngine: MultiProjectIntegrationEngine;

  // 扩展现有的parseFile方法，保持接口兼容
  async parseFile(
    fileData: ArrayBuffer,
    fileName: string,
    fileType: CADFileType,
    options: Partial<EnhancedParserOptions> = {}
  ): Promise<CADAnalysisResult> {
    // 执行现有的基础解析逻辑（保持不变）
    const baseResult = await this.performBasicParsing(fileData, fileName, fileType, options);

    // 如果启用三项目整合，在基础结果上进行增强
    if (options.enableProjectIntegration) {
      return await this.enhanceWithMultiProjectFeatures(baseResult, options);
    }

    return baseResult;
  }

  // 新增：三项目增强方法（不替换现有方法）
  private async enhanceWithMultiProjectFeatures(
    baseResult: CADAnalysisResult,
    options: EnhancedParserOptions
  ): Promise<CADAnalysisResult> {
    // 在现有结果基础上添加增强信息，保持向后兼容
    const enhancedResult = { ...baseResult };

    // 项目A的优秀特征识别算法
    if (options.enableProjectAFeatures) {
      const projectAFeatures = await this.projectAEnhancer.enhanceFeatureRecognition(baseResult);
      enhancedResult.projectAEnhancements = projectAFeatures;

      // 更新现有的features字段（兼容现有代码）
      if (enhancedResult.recognizedFeatures) {
        enhancedResult.recognizedFeatures.push(...projectAFeatures.advancedFeatures);
      }
    }

    // 项目B的智能分析算法
    if (options.enableProjectBFeatures) {
      const projectBAnalysis = await this.projectBEnhancer.enhanceStructuralAnalysis(baseResult);
      enhancedResult.projectBEnhancements = projectBAnalysis;

      // 增强现有的aiAnalysis字段
      if (enhancedResult.aiAnalysis) {
        enhancedResult.aiAnalysis.designOptimizations.push(...projectBAnalysis.optimizations);
      }
    }

    // 项目C的制造优化算法
    if (options.enableProjectCFeatures) {
      const projectCOptimization =
        await this.projectCEnhancer.enhanceManufacturingAnalysis(baseResult);
      enhancedResult.projectCEnhancements = projectCOptimization;

      // 增强现有的制造分析
      if (enhancedResult.aiAnalysis?.manufacturingRecommendations) {
        enhancedResult.aiAnalysis.manufacturingRecommendations.push(
          ...projectCOptimization.manufacturingOptimizations
        );
      }
    }

    // 生成整合元数据
    enhancedResult.integrationMetadata = {
      sourceProjects: ['Project-A', 'Project-B', 'Project-C'],
      enhancementLevel: options.integrationLevel || 'standard',
      algorithmVersions: {
        projectA: this.projectAEnhancer.getVersion(),
        projectB: this.projectBEnhancer.getVersion(),
        projectC: this.projectCEnhancer.getVersion(),
      },
      processingTime: Date.now(),
      qualityScore: this.calculateIntegratedQualityScore(enhancedResult),
      reliabilityScore: this.calculateReliabilityScore(enhancedResult),
    };

    return enhancedResult;
  }

  // 保持所有现有方法不变
  // parseSTEPFile, parseDXFFile, parseIGESFile 等方法保持原样

  // 新增：项目A优秀算法实现
  private async initializeProjectAEnhancer(): Promise<void> {
    this.projectAEnhancer = new ProjectAAlgorithm({
      // 项目A的特征识别优秀算法配置
      advancedFeatureRecognition: true,
      precisionMeasurement: true,
      intelligentClassification: true,
      geometryOptimization: true,
    });
    await this.projectAEnhancer.initialize();
  }

  // 新增：项目B优秀算法实现
  private async initializeProjectBEnhancer(): Promise<void> {
    this.projectBEnhancer = new ProjectBAlgorithm({
      // 项目B的结构分析优秀算法配置
      deepStructuralAnalysis: true,
      materialOptimization: true,
      performanceEvaluation: true,
      stressAnalysisAI: true,
    });
    await this.projectBEnhancer.initialize();
  }

  // 新增：项目C优秀算法实现
  private async initializeProjectCEnhancer(): Promise<void> {
    this.projectCEnhancer = new ProjectCAlgorithm({
      // 项目C的制造优化优秀算法配置
      manufacturingOptimization: true,
      costAnalysisAdvanced: true,
      qualityAssuranceAI: true,
      processOptimization: true,
    });
    await this.projectCEnhancer.initialize();
  }
}

// ❌ 错误做法：绝对不要创建新的解析引擎
// class MultiProjectCADEngine {} // 这违反了基于现有代码优化的原则！
```

#### 2. 扩展现有API路由

**文件**: `app/api/cad/upload/route.ts`（已存在，需增强功能）

```typescript
// ✅ 正确做法：扩展现有API路由
export async function POST(request: NextRequest) {
  return analysisQueue.add(async () => {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const analysisType = (formData.get('analysisType') as string) || 'standard';

      // 新增：三项目整合参数（向后兼容）
      const enableProjectIntegration = formData.get('enableProjectIntegration') === 'true';
      const integrationLevel = (formData.get('integrationLevel') as string) || 'standard';
      const enableProjectA = formData.get('enableProjectA') === 'true';
      const enableProjectB = formData.get('enableProjectB') === 'true';
      const enableProjectC = formData.get('enableProjectC') === 'true';

      // 保持现有的基础分析逻辑
      const basicResult = await performBasicCADAnalysis(file, analysisType);

      // 在现有结果基础上进行三项目增强（如果启用）
      let enhancedResult = basicResult;
      if (enableProjectIntegration) {
        enhancedResult = await enhanceWithMultiProjectAlgorithms(basicResult, {
          level: integrationLevel,
          enableProjectA,
          enableProjectB,
          enableProjectC,
        });
      }

      // 保持现有的响应结构，添加增强信息（向后兼容）
      return NextResponse.json({
        success: true,
        // 现有字段保持不变
        ...basicResult,
        // 新增字段（向后兼容）
        enhanced: enableProjectIntegration ? enhancedResult : undefined,
        integration: {
          enabled: enableProjectIntegration,
          level: integrationLevel,
          projects: {
            A: enableProjectA,
            B: enableProjectB,
            C: enableProjectC,
          },
        },
      });
    } catch (error) {
      // 保持现有的错误处理
      console.error('CAD分析错误:', error);
      return NextResponse.json({ error: '分析失败', details: error.message }, { status: 500 });
    }
  });
}

// 新增：三项目算法增强函数
async function enhanceWithMultiProjectAlgorithms(
  baseResult: CADAnalysisResult,
  options: {
    level: string;
    enableProjectA: boolean;
    enableProjectB: boolean;
    enableProjectC: boolean;
  }
): Promise<CADAnalysisResult> {
  const enhanced = { ...baseResult };

  if (options.enableProjectA) {
    enhanced.projectAEnhancements = await applyProjectAAlgorithms(baseResult);
  }

  if (options.enableProjectB) {
    enhanced.projectBEnhancements = await applyProjectBAlgorithms(baseResult);
  }

  if (options.enableProjectC) {
    enhanced.projectCEnhancements = await applyProjectCAlgorithms(baseResult);
  }

  // 生成综合优化建议
  enhanced.integratedOptimizations = await generateIntegratedOptimizations(
    baseResult,
    enhanced.projectAEnhancements,
    enhanced.projectBEnhancements,
    enhanced.projectCEnhancements
  );

  return enhanced;
}

// ❌ 错误做法：绝对不要创建新的API路由
// app/api/cad/enhanced-analysis/route.ts // 这违反了代码复用原则！
```

### P1 任务：智能体系统架构（第4-5周）

#### 3. 基于现有结构扩展智能体注册中心

**文件**: `lib/stores/agent-store.ts`（已存在，需增强为注册中心）

```typescript
// ✅ 正确做法：扩展现有的agent store
interface AgentStore {
  // 保持现有字段
  agents: Agent[];
  currentAgent: Agent | null;
  setCurrentAgent: (agent: Agent) => void;

  // 新增：注册中心功能（不破坏现有接口）
  registry: Map<string, AgentService>;
  healthStatus: Map<string, ServiceHealth>;
  metrics: Map<string, ServiceMetrics>;

  // 新增方法（向后兼容）
  registerAgent: (agent: Agent, service: AgentService) => void;
  unregisterAgent: (agentId: string) => void;
  getAgentHealth: (agentId: string) => ServiceHealth | undefined;
  getAgentMetrics: (agentId: string) => ServiceMetrics | undefined;
  findBestAgent: (requirements: AgentRequirements) => Agent | null;
}

export const useAgentStore = create<AgentStore>()((set, get) => ({
  // 保持所有现有状态和方法
  agents: [],
  currentAgent: null,
  setCurrentAgent: agent => set({ currentAgent: agent }),

  // 新增：注册中心状态
  registry: new Map(),
  healthStatus: new Map(),
  metrics: new Map(),

  // 新增：智能体注册方法
  registerAgent: (agent: Agent, service: AgentService) => {
    const { registry } = get();
    registry.set(agent.id, service);

    // 启动健康检查
    startHealthCheck(agent.id, service);

    // 更新agents列表（保持现有逻辑）
    set(state => ({
      agents: [...state.agents.filter(a => a.id !== agent.id), agent],
      registry: new Map(registry),
    }));
  },

  // 新增：智能体发现算法
  findBestAgent: (requirements: AgentRequirements) => {
    const { agents, healthStatus, metrics } = get();

    // 按要求过滤可用智能体
    const candidates = agents.filter(agent => {
      const health = healthStatus.get(agent.id);
      const agentMetrics = metrics.get(agent.id);

      return (
        health?.status === 'healthy' &&
        (!requirements.type || agent.type === requirements.type) &&
        (!requirements.capabilities ||
          requirements.capabilities.every(cap => agent.capabilities?.includes(cap))) &&
        (!requirements.minSuccessRate ||
          (agentMetrics?.successRate ?? 0) >= requirements.minSuccessRate)
      );
    });

    if (candidates.length === 0) return null;

    // 按综合评分排序
    candidates.sort((a, b) => {
      const scoreA = calculateAgentScore(a, metrics.get(a.id));
      const scoreB = calculateAgentScore(b, metrics.get(b.id));
      return scoreB - scoreA;
    });

    return candidates[0];
  },
}));

// ❌ 错误做法：绝对不要创建新的store
// const useMultiAgentStore = create() => {} // 这违反了复用现有代码的原则！
```

#### 4. 扩展现有类型定义

**文件**: `lib/types/cad.ts`（已存在，需增强类型）

```typescript
// ✅ 正确做法：扩展现有的CAD类型定义
export interface CADAnalysisResult {
  // 保持所有现有字段
  id: string;
  fileName: string;
  fileType: CADFileType;
  fileSize: number;
  components: CADComponent[];
  entities: Record<string, number>;
  // ... 所有现有字段保持不变

  // 新增：三项目整合增强字段（向后兼容）
  projectAEnhancements?: ProjectAEnhancements;
  projectBEnhancements?: ProjectBEnhancements;
  projectCEnhancements?: ProjectCEnhancements;
  integratedOptimizations?: IntegratedOptimization[];
  integrationMetadata?: IntegrationMetadata;
}

// 新增：项目A增强结果类型
export interface ProjectAEnhancements {
  advancedFeatureRecognition: {
    features: AdvancedFeature[];
    confidence: number;
    processingTime: number;
  };
  precisionMeasurement: {
    measurements: PrecisionMeasurement[];
    accuracy: number;
    tolerances: ToleranceAnalysis[];
  };
  intelligentClassification: {
    category: string;
    subcategory: string;
    confidence: number;
    attributes: Record<string, any>;
  };
  geometryOptimization: {
    suggestions: OptimizationSuggestion[];
    potentialImprovements: number; // percentage
    feasibilityScore: number;
  };
}

// 新增：项目B增强结果类型
export interface ProjectBEnhancements {
  deepStructuralAnalysis: {
    stressPoints: StressPoint[];
    criticalAreas: CriticalArea[];
    safetyFactor: number;
    recommendations: StructuralRecommendation[];
  };
  materialOptimization: {
    currentMaterial: MaterialAnalysis;
    alternatives: MaterialAlternative[];
    costSavings: number;
    performanceImpact: number;
  };
  performanceEvaluation: {
    metrics: PerformanceMetric[];
    benchmarks: Benchmark[];
    score: number;
    improvements: PerformanceImprovement[];
  };
}

// 新增：项目C增强结果类型
export interface ProjectCEnhancements {
  manufacturingOptimization: {
    processes: OptimizedProcess[];
    timeline: ProductionTimeline;
    costReduction: number;
    qualityImprovements: QualityImprovement[];
  };
  costAnalysisAdvanced: {
    materialCosts: CostBreakdown;
    laborCosts: CostBreakdown;
    overheadCosts: CostBreakdown;
    totalCost: number;
    costDrivers: CostDriver[];
  };
  qualityAssuranceAI: {
    defectPredictions: DefectPrediction[];
    qualityScore: number;
    inspectionPoints: InspectionPoint[];
    recommendations: QualityRecommendation[];
  };
}

// 新增：整合元数据类型
export interface IntegrationMetadata {
  sourceProjects: string[];
  enhancementLevel: 'basic' | 'standard' | 'advanced' | 'professional';
  algorithmVersions: Record<string, string>;
  processingTime: number;
  qualityScore: number;
  reliabilityScore: number;
  confidenceLevel: number;
  dataIntegrity: DataIntegrityCheck;
}

// ❌ 错误做法：绝对不要重新定义已有类型
// interface NewCADAnalysisResult {} // 这违反了类型复用原则！
```

### P2 任务：FastGPT集成优化（第6周）

#### 5. 扩展现有FastGPT服务

**文件**: `app/api/fastgpt/[...path]/route.ts`（已存在，需增强功能）

```typescript
// ✅ 正确做法：增强现有FastGPT API
export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    // 保持现有的路径处理逻辑
    const path = params.path.join('/');
    const body = await request.json();

    // 新增：智能体识别和路由（不破坏现有功能）
    const agentId = body.agentId || request.headers.get('X-Agent-ID');
    const sessionContext = body.sessionContext || {};

    // 保持现有的FastGPT调用逻辑
    const fastGPTResponse = await callFastGPTAPI(path, body);

    // 新增：智能体特定的响应增强（如果有agentId）
    if (agentId) {
      const enhancedResponse = await enhanceResponseForAgent(
        fastGPTResponse,
        agentId,
        sessionContext
      );

      // 记录智能体使用指标
      await recordAgentUsage(agentId, {
        responseTime: enhancedResponse.processingTime,
        success: enhancedResponse.success,
        sessionId: body.sessionId,
      });

      return NextResponse.json(enhancedResponse);
    }

    // 保持现有的响应格式（向后兼容）
    return NextResponse.json(fastGPTResponse);
  } catch (error) {
    // 保持现有的错误处理
    console.error('FastGPT API错误:', error);
    return NextResponse.json({ error: 'FastGPT服务异常', details: error.message }, { status: 500 });
  }
}

// 新增：智能体特定响应增强
async function enhanceResponseForAgent(
  baseResponse: any,
  agentId: string,
  context: any
): Promise<any> {
  const agent = await getAgentConfig(agentId);

  if (!agent) return baseResponse;

  // 根据智能体类型进行特定增强
  switch (agent.type) {
    case 'fastgpt':
      return enhanceConversationalResponse(baseResponse, agent, context);
    case 'cad':
      return enhanceCADResponse(baseResponse, agent, context);
    case 'poster':
      return enhancePosterResponse(baseResponse, agent, context);
    default:
      return baseResponse;
  }
}

// ❌ 错误做法：绝对不要创建新的FastGPT API
// app/api/enhanced-fastgpt/route.ts // 这违反了API复用原则！
```

## 🎯 关键绩效指标（KPI）

### 系统性能指标

- **API响应时间** < 500ms（P95）
- **CAD文件处理速度** 提升50%（相比基础版本）
- **并发处理能力** ≥ 100用户同时分析
- **系统可用性** ≥ 99.9%

### 智能体质量指标

- **分析准确度** ≥ 95%（三项目算法整合后）
- **特征识别精度** ≥ 90%（项目A算法）
- **制造优化效果** ≥ 30%成本降低（项目C算法）
- **错误率** < 0.1%

### 集成质量指标

- **代码复用率** ≥ 85%（基于现有代码扩展）
- **API向后兼容性** 100%
- **数据一致性** 100%
- **服务发现成功率** ≥ 99%

## 🚫 严禁行为清单

1. **绝不重新实现现有服务** - 必须基于现有的CADAnalyzerService等进行扩展
2. **绝不创建重复API** - 现有的`/api/cad/`等路由必须复用和增强
3. **绝不改变现有数据结构** - CADAnalysisResult等类型只能扩展不能修改
4. **绝不破坏现有业务流程** - 新功能必须是向后兼容的增强
5. **绝不忽略现有错误处理** - 必须遵循现有的错误处理模式

## 🔧 每日自检清单

```markdown
### 今日开发检查 ✅

- [ ] 是否基于现有服务类进行扩展？
- [ ] 是否体现了多智能体系统的技术架构？
- [ ] CAD三项目整合是否基于现有解析引擎？
- [ ] API接口是否保持向后兼容？
- [ ] 智能体注册中心是否基于现有store？
- [ ] 代码是否避免了重复实现？
- [ ] 性能指标是否达到要求？
- [ ] 错误处理是否完善？
```

## 📊 数据流架构图

```typescript
// 多智能体数据流设计
interface MultiAgentDataFlow {
  // 请求路由
  request: AgentRequest => AgentRouter => SpecificAgentService;

  // CAD智能体数据流
  cadFlow: CADFile => EnhancedParser => ProjectIntegration => AIAnalysis => Response;

  // FastGPT智能体数据流
  conversationFlow: Message => SessionManager => FastGPTAPI => ResponseEnhancer => Response;

  // 海报智能体数据流
  posterFlow: Prompt => CreativeEngine => StyleProcessor => ImageGenerator => Response;

  // 统一监控数据流
  monitoring: AllRequests => MetricsCollector => HealthChecker => AlertSystem;
}
```

记住：你不只是在写后端代码，你在构建一个能够支撑多智能体协同工作的**技术大脑**！每一个API、每一个服务、每一个算法都要确保智能体能够高效、准确、可靠地为用户提供专业服务。

让这个多智能体平台成为技术架构的典范，让每个智能体都能发挥出最佳的专业能力！
