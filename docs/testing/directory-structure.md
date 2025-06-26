# ZK-Agent 测试目录结构规范

## 概述

本文档定义了ZK-Agent项目的测试目录结构规范，确保测试代码的组织性和可维护性。

## 目录结构

```
zk-agent/
├── config/                          # 配置文件目录
│   ├── jest.simple.config.js        # 简化Jest配置
│   ├── jest.config.production.js    # 生产环境Jest配置
│   ├── jest.config.enhanced.js      # 增强Jest配置
│   └── database.config.js           # 数据库配置
├── __tests__/                       # 测试文件目录
│   ├── setup/                       # 测试环境设置
│   │   ├── simple.setup.js          # 简化测试环境设置
│   │   ├── production.setup.js      # 生产测试环境设置
│   │   └── enhanced.setup.js        # 增强测试环境设置
│   ├── utils/                       # 测试工具
│   │   ├── customReporter.js        # 自定义测试报告器
│   │   ├── testResultsProcessor.js  # 测试结果处理器
│   │   └── testHelpers.js           # 测试辅助函数
│   ├── mocks/                       # Mock数据和服务
│   │   ├── handlers/                # MSW处理器
│   │   └── fixtures/                # 测试数据
│   ├── config/                      # 配置模块测试
│   │   ├── database.test.js         # 数据库配置测试
│   │   └── env.test.js              # 环境配置测试
│   ├── core/                        # 核心功能测试
│   │   ├── utils.test.js            # 核心工具函数测试
│   │   └── constants.test.js        # 常量测试
│   ├── lib/                         # 库函数测试
│   │   ├── auth/                    # 认证模块测试
│   │   ├── database/                # 数据库模块测试
│   │   ├── ai/                      # AI模块测试
│   │   ├── cad/                     # CAD分析模块测试
│   │   ├── poster/                  # 海报生成模块测试
│   │   └── chat/                    # 聊天模块测试
│   ├── api/                         # API接口测试
│   │   ├── auth/                    # 认证API测试
│   │   ├── cad/                     # CAD API测试
│   │   ├── poster/                  # 海报API测试
│   │   └── chat/                    # 聊天API测试
│   ├── components/                  # 组件测试
│   │   ├── ui/                      # UI组件测试
│   │   ├── auth/                    # 认证组件测试
│   │   └── chat/                    # 聊天组件测试
│   ├── integration/                 # 集成测试
│   │   ├── database/                # 数据库集成测试
│   │   ├── api/                     # API集成测试
│   │   └── workflow/                # 工作流集成测试
│   ├── security/                    # 安全测试
│   │   ├── auth.test.js             # 认证安全测试
│   │   ├── xss.test.js              # XSS防护测试
│   │   └── sql-injection.test.js    # SQL注入防护测试
│   ├── performance/                 # 性能测试
│   │   ├── load.test.js             # 负载测试
│   │   ├── memory.test.js           # 内存测试
│   │   └── response-time.test.js    # 响应时间测试
│   └── e2e/                         # 端到端测试
│       ├── auth.spec.js             # 认证流程E2E测试
│       ├── cad-analysis.spec.js     # CAD分析E2E测试
│       └── poster-generation.spec.js # 海报生成E2E测试
├── tests/                           # 额外测试目录
│   └── performance/                 # 性能测试脚本
├── scripts/                         # 测试脚本
│   ├── automated-test-runner.js     # 自动化测试运行器
│   └── test-execution.sh            # 测试执行脚本
└── test-reports/                    # 测试报告输出
    ├── coverage/                    # 覆盖率报告
    ├── simple-test-log.json         # 简化测试日志
    └── test-summary.md              # 测试摘要
```

## 命名规范

### 文件命名
- 测试文件：`*.test.js` 或 `*.spec.js`
- 配置文件：`*.config.js`
- 设置文件：`*.setup.js`
- Mock文件：`*.mock.js`

### 目录命名
- 使用小写字母和连字符
- 按功能模块组织
- 避免深层嵌套（最多3层）

## 配置文件规范

### Jest配置文件位置
所有Jest配置文件统一放在 `config/` 目录下：
- `config/jest.simple.config.js` - 简化配置
- `config/jest.config.production.js` - 生产配置
- `config/jest.config.enhanced.js` - 增强配置

### 测试设置文件位置
所有测试设置文件统一放在 `__tests__/setup/` 目录下：
- `__tests__/setup/simple.setup.js`
- `__tests__/setup/production.setup.js`
- `__tests__/setup/enhanced.setup.js`

## 测试分类

### 1. 单元测试 (Unit Tests)
- 位置：`__tests__/lib/`, `__tests__/config/`, `__tests__/core/`
- 测试单个函数或类的功能
- 快速执行，无外部依赖

### 2. 集成测试 (Integration Tests)
- 位置：`__tests__/integration/`
- 测试模块间的交互
- 可能涉及数据库或外部服务

### 3. API测试 (API Tests)
- 位置：`__tests__/api/`
- 测试HTTP接口
- 包含请求/响应验证

### 4. 组件测试 (Component Tests)
- 位置：`__tests__/components/`
- 测试React组件
- 使用React Testing Library

### 5. 端到端测试 (E2E Tests)
- 位置：`__tests__/e2e/`
- 测试完整用户流程
- 使用Playwright

### 6. 安全测试 (Security Tests)
- 位置：`__tests__/security/`
- 测试安全漏洞防护
- 包含XSS、SQL注入等测试

### 7. 性能测试 (Performance Tests)
- 位置：`__tests__/performance/`
- 测试系统性能
- 包含负载、内存、响应时间测试

## 最佳实践

### 1. 文件组织
- 按功能模块组织测试文件
- 保持测试文件与源文件的目录结构对应
- 使用描述性的文件名

### 2. 测试命名
- 使用中文描述测试用例
- 遵循 "应该...当...时" 的格式
- 保持测试名称简洁明了

### 3. 依赖管理
- 避免测试间的依赖关系
- 使用适当的Mock和Stub
- 确保测试的独立性

### 4. 配置管理
- 统一管理Jest配置
- 按环境分离配置
- 使用环境变量控制测试行为

## 排除规则

### 人脸增强功能
根据项目要求，暂时排除人脸增强相关功能的测试：
- `**/*face-enhancement/**`
- `**/*人脸增强/**`

### 其他排除项
- `node_modules/`
- `.next/`
- `coverage/`
- `__tests__/mocks/`
- `__tests__/fixtures/`

## 测试执行

### 简化测试
```bash
npm run test:simple              # 运行简化测试
npm run test:simple:watch        # 监视模式
npm run test:simple:coverage     # 生成覆盖率报告
```

### 生产测试
```bash
npm run test:unit                # 单元测试
npm run test:integration         # 集成测试
npm run test:security            # 安全测试
npm run test:performance         # 性能测试
```

### 完整测试
```bash
npm run test:all                 # 运行所有测试
npm run test:ci                  # CI环境测试
```

## 报告输出

所有测试报告统一输出到 `test-reports/` 目录：
- 覆盖率报告：`test-reports/coverage/`
- 测试日志：`test-reports/*.json`
- 测试摘要：`test-reports/test-summary.md`

---

**注意**：本规范应严格遵守，确保项目测试代码的一致性和可维护性。 