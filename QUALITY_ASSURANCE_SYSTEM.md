# 🏗️ ZK-Agent 智能化质量保障体系

## 概述

ZK-Agent 智能化质量保障体系是一个全面的代码质量和架构符合度评估平台，基于三维评估模型实现实时监控、自动化分析和可视化报告生成。

## 🎯 核心功能

### 1. 架构模式符合度评估

#### 支持的架构模式
- **Clean Architecture**: 实体独立性、用例纯度、框架隔离度
- **Domain-Driven Design (DDD)**: 聚合根完整性、值对象纯度、仓储模式合规
- **微服务架构**: 服务自治性、通信轻量性、数据隔离度
- **CQRS**: 命令/查询分离度、读写模型一致性

#### 三维评估模型

##### 1. 结构维度检测
```
├── 分层检测
│   ├── 表示层：检查UI组件纯度
│   ├── 业务层：验证领域逻辑隔离
│   ├── 持久层：确认数据访问抽象
│   └── 交叉污染扫描：识别层间违规调用
├── 依赖方向验证
│   ├── 单向依赖检查（如Clean Architecture）
│   ├── 循环依赖检测
│   └── 抽象稳定性度量
└── 组件耦合度
    ├── 紧耦合热点识别
    ├── 服务边界清晰度
    └── 接口污染分析
```

##### 2. 模式特征校验
| 架构模式 | 关键指标 | 检测算法 |
|----------|----------|----------|
| **Clean Architecture** | 实体独立性、用例纯度、框架隔离度 | AST边界扫描 + 依赖倒置验证 |
| **DDD** | 聚合根完整性、值对象纯度、仓储模式合规 | 领域对象血缘分析 |
| **微服务** | 服务自治性、通信轻量性、数据隔离度 | 网络调用图谱 + 数据所有权矩阵 |
| **CQRS** | 命令/查询分离度、读写模型一致性 | 方法调用链路追踪 |

##### 3. 演化适应性评分
- **扩展点识别**：扫描预留的扩展接口
- **技术债务量化**：计算违背架构决策的代码占比
- **迁移路径生成**：自动生成从当前到目标架构的迁移步骤

### 2. 实时监控机制

#### 触发条件
- 代码文件保存时自动触发
- Git提交前自动执行
- 定时扫描（可配置间隔）
- 手动触发评估

#### 检测流程
1. **静态结构扫描**（<2秒）
   - 生成项目调用图谱
   - 标记架构边界违规
   - 计算模块稳定性指标

2. **动态行为验证**（<5秒）
   - 运行时依赖注入检查
   - 配置与代码一致性验证
   - 性能模式反模式检测

3. **质量报告生成**
   - 架构健康雷达图
   - 违规代码精确定位
   - 重构优先级排序

### 3. 可视化报告系统

#### 支持的输出格式
- **控制台输出**: 实时反馈和快速查看
- **HTML报告**: 交互式图表和详细分析
- **JSON数据**: 程序化处理和集成
- **Markdown文档**: 文档化和版本控制

#### 报告内容
- 架构符合度评分
- 违规代码定位
- 优秀实践识别
- 技术债务分析
- 重构建议
- 趋势分析

## 🚀 快速开始

### 1. 系统集成

```powershell
# 运行集成脚本
.\scripts\integrate-quality-system.ps1

# 或者作为规范化流程的一部分
.\scripts\master-standardization.ps1
```

### 2. 基本使用

```bash
# 执行架构符合度评估
npm run quality:evaluate

# 启动实时监控
npm run quality:monitor

# 生成HTML报告
npm run quality:report

# 执行代码质量扫描
npm run quality:scan

# 初始化配置
npm run quality:init
```

### 3. PowerShell快速启动

```powershell
# 快速评估
.\scripts\quality-quick-start.ps1 -Action evaluate

# 启动监控
.\scripts\quality-quick-start.ps1 -Action monitor

# 生成HTML报告
.\scripts\quality-quick-start.ps1 -Action report -Format html
```

## ⚙️ 配置说明

### 主配置文件: `config/architecture-compliance.config.json`

```json
{
  "version": "1.0.0",
  "projectInfo": {
    "name": "zk-agent",
    "type": "mixed",
    "phase": "development"
  },
  "architecturePatterns": {
    "cleanArchitecture": {
      "enabled": true,
      "strictness": "medium",
      "layerValidation": {
        "presentation": { "allowedDependencies": ["application"] },
        "application": { "allowedDependencies": ["domain", "infrastructure"] },
        "domain": { "allowedDependencies": [] },
        "infrastructure": { "allowedDependencies": ["domain"] }
      }
    },
    "domainDrivenDesign": {
      "enabled": true,
      "aggregateValidation": true,
      "valueObjectValidation": true,
      "repositoryPatternValidation": true
    }
  },
  "qualityThresholds": {
    "overallScore": 85,
    "layeredArchitectureCompliance": 85,
    "domainModelPurity": 80,
    "serviceBoundaryClarity": 75,
    "dependencyInversionCompliance": 80
  },
  "realTimeMonitoring": {
    "enabled": true,
    "evaluationDelay": 2000,
    "watchPatterns": ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    "ignorePatterns": ["**/node_modules/**", "**/dist/**", "**/build/**"]
  }
}
```

### 自适应阈值配置

系统会根据以下因素自动调整质量阈值：

- **项目阶段**: MVP阶段容忍度较高，成熟期严格要求
- **技术栈**: 不同框架的特定模式标准
- **团队规模**: 小团队适当放宽某些规范
- **历史表现**: 基于项目历史数据动态调整

## 📊 质量指标

### 目标指标
- 代码质量评分 >95分
- 测试覆盖率 >90%
- 架构健康指数 >85%
- 性能回归 <5%
- 安全漏洞 = 0 高危

### 评估维度

#### 1. 代码质量 (30%权重)
- 代码复杂度
- 代码重复率
- 命名规范
- 注释覆盖率

#### 2. 测试覆盖率 (25%权重)
- 单元测试覆盖率
- 集成测试覆盖率
- 端到端测试覆盖率

#### 3. 性能指标 (20%权重)
- 构建时间
- 运行时性能
- 内存使用
- 包大小

#### 4. 安全指标 (25%权重)
- 依赖漏洞扫描
- 代码安全检查
- 配置安全验证

## 🔧 VS Code 集成

### 任务配置

系统自动配置VS Code任务，可通过以下方式使用：

1. 打开命令面板 (`Ctrl+Shift+P`)
2. 选择 "Tasks: Run Task"
3. 选择相应的质量保障任务：
   - `Quality: Evaluate Architecture`
   - `Quality: Start Monitoring`
   - `Quality: Generate Report`

### 调试配置

提供了专门的调试配置用于开发和调试质量保障系统本身。

## 📈 报告示例

### 控制台输出示例

```
架构符合度报告 - ZK-Agent系统
┌─────────────────────────────────────────┐
│ 分层架构合规度: ████████░░ 85%          │
│ 领域模型纯度: ██████████ 92%           │
│ 服务边界清晰度: ██████░░░░ 78%        │
│ 依赖倒置原则: █████████░░ 88%         │
└─────────────────────────────────────────┘

🔴 高风险违规:
├── UserController直接调用ProductRepository (跨层调用)
├── OrderService包含SQL查询语句 (基础设施泄漏)
└── Payment领域对象依赖JWT库 (框架污染)

🟢 优秀实践:
├── 所有领域事件通过中介者发布
├── 仓储接口100%无框架依赖
└── 应用服务完全独立于UI层
```

### HTML报告特性

- 交互式架构图谱
- 可钻取的违规详情
- 历史趋势图表
- 重构建议优先级
- 导出和分享功能

## 🛠️ 高级功能

### 1. 自定义规则

可以通过配置文件添加项目特定的架构规则：

```json
{
  "customRules": {
    "noDirectDatabaseAccess": {
      "pattern": ".*Controller.*",
      "forbiddenImports": ["mysql", "mongodb", "redis"],
      "severity": "error",
      "message": "控制器不应直接访问数据库"
    }
  }
}
```

### 2. 插件系统

支持自定义插件扩展功能：

```typescript
interface QualityPlugin {
  name: string;
  version: string;
  evaluate(project: ProjectInfo): Promise<EvaluationResult>;
}
```

### 3. CI/CD 集成

```yaml
# GitHub Actions 示例
- name: Architecture Compliance Check
  run: |
    npm run quality:evaluate
    npm run quality:report --format json
  
- name: Upload Quality Report
  uses: actions/upload-artifact@v3
  with:
    name: quality-report
    path: reports/
```

## 📁 文件结构

```
zk-agent/
├── lib/
│   ├── architecture-compliance-engine.ts    # 核心评估引擎
│   ├── compliance-dashboard.ts              # 可视化仪表盘
│   ├── real-time-monitor.ts                 # 实时监控系统
│   └── index.ts                             # 主入口
├── scripts/
│   ├── quality-cli.ts                       # 命令行工具
│   ├── integrate-quality-system.ps1         # 集成脚本
│   └── quality-quick-start.ps1              # 快速启动脚本
├── config/
│   └── architecture-compliance.config.json  # 主配置文件
├── reports/                                  # 报告输出目录
│   ├── real-time/                          # 实时报告
│   ├── compliance/                         # 符合度报告
│   ├── quality/                            # 质量报告
│   └── debt/                               # 技术债务报告
└── .vscode/
    ├── tasks.json                           # VS Code任务配置
    └── launch.json                          # VS Code启动配置
```

## 🔍 故障排除

### 常见问题

#### 1. Node.js环境问题
```bash
# 检查Node.js版本
node --version  # 需要 >= 16.0.0
npm --version   # 需要 >= 8.0.0
```

#### 2. TypeScript编译错误
```bash
# 清理并重新编译
npm run clean
npm run build
```

#### 3. 监控无法启动
```bash
# 检查文件权限
ls -la scripts/

# 重新安装依赖
npm install
```

### 日志和调试

```bash
# 启用详细日志
npm run quality:evaluate -- --verbose

# 调试模式
npm run quality:evaluate -- --debug
```

## 🤝 贡献指南

### 开发环境设置

```bash
# 克隆项目
git clone <repository-url>
cd zk-agent

# 安装依赖
npm install

# 运行测试
npm test

# 启动开发模式
npm run dev
```

### 添加新的架构模式

1. 在 `architecture-compliance-engine.ts` 中添加模式检测逻辑
2. 更新配置文件模式定义
3. 添加相应的测试用例
4. 更新文档

### 提交规范

```bash
# 功能添加
git commit -m "feat: 添加新的架构模式检测"

# 问题修复
git commit -m "fix: 修复循环依赖检测问题"

# 文档更新
git commit -m "docs: 更新配置说明文档"
```

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

感谢所有为ZK-Agent智能化质量保障体系做出贡献的开发者和用户。

---

**版本**: 1.0.0  
**最后更新**: 2024-01-24  
**维护者**: ZK-Agent Team