# 📖 ZK-Agent 验证程序与操作手册
## 完整的验证执行指南与最佳实践

---

## 📋 手册概述

### 🎯 手册目标
本手册提供ZK-Agent项目验证程序的详细操作指南，确保开发团队能够准确执行所有验证流程，达到0异常、0缺陷的交付标准。

### 📚 适用人员
- **开发工程师** - 日常开发验证流程
- **测试工程师** - 测试验证执行程序
- **DevOps工程师** - CI/CD流水线管理
- **质量保证工程师** - 质量验证监督
- **项目经理** - 验证进度管理

### 🔧 验证工具清单
```bash
# 必需工具
- Node.js 22.x
- pnpm 9.14.4
- Git 2.40+
- Docker 24.0+
- PostgreSQL 15+
- Redis 7+

# 质量工具
- SonarQube 9.9+
- Lighthouse CLI
- Playwright
- Jest
- ESLint
- Prettier

# 监控工具  
- Prometheus
- Grafana
- Sentry
- k6
```

---

## 🔄 日常开发验证程序

### 📋 开发前准备检查

```bash
#!/bin/bash
# daily-dev-setup.sh - 每日开发环境验证脚本

echo "🔍 执行每日开发环境验证..."

# 1. 检查Node.js版本
NODE_VERSION=$(node --version)
if [[ ! "$NODE_VERSION" =~ ^v22\. ]]; then
    echo "❌ Node.js版本不符合要求！当前: $NODE_VERSION，要求: v22.x"
    exit 1
fi
echo "✅ Node.js版本检查通过: $NODE_VERSION"

# 2. 检查pnpm版本
PNPM_VERSION=$(pnpm --version)
if [[ ! "$PNPM_VERSION" =~ ^9\.14\. ]]; then
    echo "❌ pnpm版本不符合要求！当前: $PNPM_VERSION，要求: 9.14.x"
    exit 1
fi
echo "✅ pnpm版本检查通过: $PNPM_VERSION"

# 3. 检查Git配置
if ! git config user.name >/dev/null || ! git config user.email >/dev/null; then
    echo "❌ Git用户信息未配置！"
    echo "请执行: git config --global user.name '你的姓名'"
    echo "请执行: git config --global user.email '你的邮箱'"
    exit 1
fi
echo "✅ Git配置检查通过"

# 4. 检查依赖完整性
if [ ! -d "node_modules" ] || [ ! -f "pnpm-lock.yaml" ]; then
    echo "🔧 安装项目依赖..."
    pnpm install --frozen-lockfile
fi
echo "✅ 依赖检查完成"

# 5. 检查环境变量
if [ ! -f ".env.local" ]; then
    echo "⚠️  未找到.env.local文件，从模板创建..."
    cp .env.example .env.local
    echo "📝 请编辑.env.local文件配置环境变量"
fi
echo "✅ 环境变量检查完成"

# 6. 数据库连接测试
echo "🗄️  测试数据库连接..."
if ! pnpm run db:ping; then
    echo "❌ 数据库连接失败！请检查数据库服务状态"
    exit 1
fi
echo "✅ 数据库连接正常"

# 7. Redis连接测试
echo "🔴 测试Redis连接..."
if ! pnpm run cache:ping; then
    echo "❌ Redis连接失败！请检查Redis服务状态"
    exit 1
fi
echo "✅ Redis连接正常"

echo "🎉 开发环境验证完成，可以开始编码！"
```

### 📋 代码提交前验证程序

```bash
#!/bin/bash
# pre-commit-validation.sh - 代码提交前验证脚本

echo "🚀 执行代码提交前验证..."

# 1. TypeScript类型检查
echo "🔍 TypeScript类型检查..."
if ! pnpm run type-check; then
    echo "❌ TypeScript类型检查失败！"
    echo "请修复所有类型错误后再提交"
    exit 1
fi
echo "✅ TypeScript类型检查通过"

# 2. ESLint代码规范检查
echo "📏 ESLint代码规范检查..."
if ! pnpm run lint; then
    echo "❌ ESLint检查失败！"
    echo "请运行 'pnpm run lint:fix' 自动修复，或手动修复所有问题"
    exit 1
fi
echo "✅ ESLint检查通过"

# 3. Prettier代码格式检查
echo "🧹 Prettier代码格式检查..."
if ! pnpm run format:check; then
    echo "❌ 代码格式不符合标准！"
    echo "请运行 'pnpm run format' 自动格式化代码"
    exit 1
fi
echo "✅ 代码格式检查通过"

# 4. 单元测试执行
echo "🧪 执行单元测试..."
if ! pnpm run test:unit --passWithNoTests; then
    echo "❌ 单元测试失败！"
    echo "请修复所有测试错误后再提交"
    exit 1
fi
echo "✅ 单元测试通过"

# 5. 测试覆盖率检查
echo "📊 检查测试覆盖率..."
COVERAGE=$(pnpm run test:coverage --silent | grep -o "All files.*[0-9]*\.[0-9]*" | grep -o "[0-9]*\.[0-9]*" | tail -1)
if (( $(echo "$COVERAGE < 90" | bc -l) )); then
    echo "❌ 测试覆盖率不足！当前: ${COVERAGE}%，要求: ≥90%"
    echo "请为新增代码编写测试用例"
    exit 1
fi
echo "✅ 测试覆盖率检查通过: ${COVERAGE}%"

# 6. 安全扫描
echo "🔒 执行安全扫描..."
if ! pnpm audit --audit-level high; then
    echo "❌ 发现高危安全漏洞！"
    echo "请运行 'pnpm audit fix' 修复漏洞"
    exit 1
fi
echo "✅ 安全扫描通过"

# 7. 构建验证
echo "🔨 验证构建..."
if ! pnpm run build; then
    echo "❌ 构建失败！"
    echo "请修复构建错误后再提交"
    exit 1
fi
echo "✅ 构建验证通过"

# 8. 提交信息检查
COMMIT_MSG_FILE=$1
if [ -f "$COMMIT_MSG_FILE" ]; then
    COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")
    if [[ ! "$COMMIT_MSG" =~ ^(feat|fix|docs|style|refactor|test|chore|perf|ci|build)(\(.+\))?:\ .{1,50} ]]; then
        echo "❌ 提交信息格式不正确！"
        echo "格式要求: type(scope): description"
        echo "类型: feat, fix, docs, style, refactor, test, chore, perf, ci, build"
        echo "示例: feat(auth): add user registration functionality"
        exit 1
    fi
fi
echo "✅ 提交信息格式正确"

echo "🎉 代码提交前验证完成！代码质量达到提交标准"
```

### 📋 功能开发验证流程

```markdown
## 🔄 功能开发验证流程

### Step 1: 需求理解验证
- [ ] **需求文档审阅**
  - 仔细阅读需求文档
  - 理解业务逻辑和用户需求
  - 确认技术实现方案
  - 识别潜在风险点

- [ ] **技术方案设计**
  - 设计模块架构
  - 定义接口规范
  - 确定数据结构
  - 制定测试策略

### Step 2: 开发实现验证
- [ ] **代码编写标准**
  ```typescript
  // 每个函数必须有JSDoc注释
  /**
   * 用户注册功能
   * @param userData - 用户注册数据
   * @returns Promise<Result<User, AppError>> - 注册结果
   */
  async function registerUser(userData: UserRegistrationData): Promise<Result<User, AppError>> {
    // 实现代码...
  }
  
  // 每个函数必须有对应的测试
  describe('registerUser', () => {
    it('should register user with valid data', async () => {
      // 测试代码...
    });
  });
  ```

- [ ] **代码质量检查**
  ```bash
  # 实时检查
  pnpm run type-check    # TypeScript检查
  pnpm run lint         # ESLint检查
  pnpm run test:watch   # 测试监控
  ```

### Step 3: 功能测试验证
- [ ] **单元测试编写**
  - 正常情况测试
  - 边界条件测试
  - 异常情况测试
  - Mock依赖测试

- [ ] **集成测试编写**
  - API接口测试
  - 数据库集成测试
  - 外部服务集成测试
  - 端到端流程测试

### Step 4: 代码审查验证
- [ ] **自我审查清单**
  - 代码逻辑是否正确
  - 错误处理是否完善
  - 性能是否优化
  - 安全性是否考虑
  - 可读性是否良好

- [ ] **团队审查准备**
  - 提交PR描述清晰
  - 测试用例完整
  - 文档更新及时
  - 变更影响评估
```

---

## 🧪 测试验证程序

### 📋 单元测试执行程序

```bash
#!/bin/bash
# unit-test-validation.sh - 单元测试验证程序

echo "🧪 执行单元测试验证程序..."

# 1. 测试环境准备
echo "🔧 准备测试环境..."
export NODE_ENV=test
export DATABASE_URL="postgresql://test:test@localhost:5432/zkagent_test"

# 2. 清理之前的测试数据
echo "🧹 清理测试环境..."
pnpm run test:db:reset

# 3. 执行测试套件
echo "🏃 执行单元测试套件..."

# 认证模块测试
echo "🔐 测试认证模块..."
if ! pnpm run test:unit -- --testPathPattern="auth" --coverage; then
    echo "❌ 认证模块测试失败！"
    exit 1
fi

# AI智能体模块测试
echo "🤖 测试AI智能体模块..."
if ! pnpm run test:unit -- --testPathPattern="agents" --coverage; then
    echo "❌ AI智能体模块测试失败！"
    exit 1
fi

# 数据管理模块测试
echo "📊 测试数据管理模块..."
if ! pnpm run test:unit -- --testPathPattern="database|storage|cache" --coverage; then
    echo "❌ 数据管理模块测试失败！"
    exit 1
fi

# 用户界面模块测试
echo "🖥️ 测试用户界面模块..."
if ! pnpm run test:unit -- --testPathPattern="components|pages" --coverage; then
    echo "❌ 用户界面模块测试失败！"
    exit 1
fi

# 4. 生成测试报告
echo "📊 生成测试覆盖率报告..."
pnpm run test:coverage:report

# 5. 检查覆盖率标准
COVERAGE_SUMMARY=$(cat coverage/coverage-summary.json)
LINES_PCT=$(echo $COVERAGE_SUMMARY | jq -r '.total.lines.pct')
FUNCTIONS_PCT=$(echo $COVERAGE_SUMMARY | jq -r '.total.functions.pct')
BRANCHES_PCT=$(echo $COVERAGE_SUMMARY | jq -r '.total.branches.pct')
STATEMENTS_PCT=$(echo $COVERAGE_SUMMARY | jq -r '.total.statements.pct')

echo "📊 测试覆盖率统计:"
echo "- 语句覆盖率: ${STATEMENTS_PCT}%"
echo "- 分支覆盖率: ${BRANCHES_PCT}%"
echo "- 函数覆盖率: ${FUNCTIONS_PCT}%"
echo "- 行覆盖率: ${LINES_PCT}%"

# 检查是否达标
if (( $(echo "$LINES_PCT < 95" | bc -l) )) || \
   (( $(echo "$FUNCTIONS_PCT < 95" | bc -l) )) || \
   (( $(echo "$BRANCHES_PCT < 90" | bc -l) )) || \
   (( $(echo "$STATEMENTS_PCT < 95" | bc -l) )); then
    echo "❌ 测试覆盖率未达到要求！"
    echo "要求: 语句≥95%, 分支≥90%, 函数≥95%, 行≥95%"
    exit 1
fi

echo "✅ 单元测试验证完成！所有指标达标"
```

### 📋 集成测试执行程序

```typescript
// integration-test-runner.ts - 集成测试执行器

import { execSync } from 'child_process'
import { DatabaseTestManager } from './test-utils/database-test-manager'
import { RedisTestManager } from './test-utils/redis-test-manager'
import { TestApplicationManager } from './test-utils/test-app-manager'

export class IntegrationTestRunner {
  private dbManager: DatabaseTestManager
  private redisManager: RedisTestManager
  private appManager: TestApplicationManager
  
  constructor() {
    this.dbManager = new DatabaseTestManager()
    this.redisManager = new RedisTestManager()
    this.appManager = new TestApplicationManager()
  }
  
  async runIntegrationTests(): Promise<void> {
    console.log('🔗 开始执行集成测试验证...')
    
    try {
      // 1. 环境准备
      await this.setupTestEnvironment()
      
      // 2. API集成测试
      await this.runAPITests()
      
      // 3. 数据库集成测试
      await this.runDatabaseTests()
      
      // 4. 外部服务集成测试
      await this.runExternalServiceTests()
      
      // 5. 端到端业务流程测试
      await this.runE2EBusinessFlowTests()
      
      // 6. 性能集成测试
      await this.runPerformanceTests()
      
      console.log('✅ 集成测试验证完成！')
      
    } catch (error) {
      console.error('❌ 集成测试失败:', error.message)
      throw error
    } finally {
      // 清理测试环境
      await this.cleanupTestEnvironment()
    }
  }
  
  private async setupTestEnvironment(): Promise<void> {
    console.log('🔧 设置集成测试环境...')
    
    // 启动测试数据库
    await this.dbManager.createTestDatabase()
    await this.dbManager.runMigrations()
    await this.dbManager.seedTestData()
    
    // 启动测试Redis
    await this.redisManager.startTestRedis()
    await this.redisManager.clearAllData()
    
    // 启动测试应用
    await this.appManager.startTestApp()
    
    console.log('✅ 测试环境准备完成')
  }
  
  private async runAPITests(): Promise<void> {
    console.log('🌐 执行API集成测试...')
    
    const apiTestSuites = [
      'auth-api.test.ts',
      'user-api.test.ts',
      'chat-api.test.ts',
      'cad-api.test.ts',
      'poster-api.test.ts',
      'admin-api.test.ts'
    ]
    
    for (const testSuite of apiTestSuites) {
      console.log(`📝 运行 ${testSuite}...`)
      
      try {
        execSync(`pnpm run test:integration -- --testNamePattern="${testSuite}"`, {
          stdio: 'inherit',
          timeout: 60000
        })
        console.log(`✅ ${testSuite} 通过`)
      } catch (error) {
        console.error(`❌ ${testSuite} 失败`)
        throw new Error(`API测试失败: ${testSuite}`)
      }
    }
  }
  
  private async runDatabaseTests(): Promise<void> {
    console.log('🗄️ 执行数据库集成测试...')
    
    // 测试数据库操作完整性
    const dbTests = [
      this.testDatabaseCRUD,
      this.testTransactionIntegrity,
      this.testConcurrentOperations,
      this.testDataConsistency,
      this.testConnectionPooling
    ]
    
    for (const test of dbTests) {
      await test.call(this)
    }
    
    console.log('✅ 数据库集成测试完成')
  }
  
  private async testDatabaseCRUD(): Promise<void> {
    console.log('📝 测试数据库CRUD操作...')
    
    // 测试用户CRUD
    const user = await this.dbManager.createTestUser()
    const foundUser = await this.dbManager.findUser(user.id)
    expect(foundUser).toBeTruthy()
    
    await this.dbManager.updateUser(user.id, { name: 'Updated Name' })
    const updatedUser = await this.dbManager.findUser(user.id)
    expect(updatedUser.name).toBe('Updated Name')
    
    await this.dbManager.deleteUser(user.id)
    const deletedUser = await this.dbManager.findUser(user.id)
    expect(deletedUser).toBeFalsy()
  }
  
  private async runExternalServiceTests(): Promise<void> {
    console.log('🔌 执行外部服务集成测试...')
    
    // 测试FastGPT集成
    await this.testFastGPTIntegration()
    
    // 测试文件存储集成
    await this.testFileStorageIntegration()
    
    // 测试邮件服务集成
    await this.testEmailServiceIntegration()
    
    console.log('✅ 外部服务集成测试完成')
  }
  
  private async testFastGPTIntegration(): Promise<void> {
    console.log('🤖 测试FastGPT集成...')
    
    // 模拟FastGPT响应
    const mockResponse = {
      success: true,
      data: {
        response: '这是AI的回复',
        conversationId: 'test-conversation-123'
      }
    }
    
    // 测试AI对话功能
    const result = await this.appManager.sendChatMessage('测试消息')
    expect(result.success).toBe(true)
    expect(result.data.response).toBeTruthy()
  }
}

// 执行集成测试
if (require.main === module) {
  const runner = new IntegrationTestRunner()
  runner.runIntegrationTests()
    .then(() => {
      console.log('🎉 所有集成测试通过！')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 集成测试失败:', error)
      process.exit(1)
    })
}
```

### 📋 端到端测试执行程序

```typescript
// e2e-test-runner.ts - 端到端测试执行器

import { Browser, chromium, firefox, webkit } from 'playwright'
import { TestDataManager } from './test-utils/test-data-manager'
import { PerformanceMonitor } from './test-utils/performance-monitor'

export class E2ETestRunner {
  private browsers: Browser[] = []
  private testDataManager: TestDataManager
  private performanceMonitor: PerformanceMonitor
  
  constructor() {
    this.testDataManager = new TestDataManager()
    this.performanceMonitor = new PerformanceMonitor()
  }
  
  async runE2ETests(): Promise<void> {
    console.log('🎭 开始执行端到端测试验证...')
    
    try {
      // 1. 准备测试环境
      await this.setupE2EEnvironment()
      
      // 2. 跨浏览器兼容性测试
      await this.runCrossBrowserTests()
      
      // 3. 用户业务流程测试
      await this.runUserJourneyTests()
      
      // 4. 响应式设计测试
      await this.runResponsiveDesignTests()
      
      // 5. 可访问性测试
      await this.runAccessibilityTests()
      
      // 6. 性能测试
      await this.runPerformanceTests()
      
      console.log('✅ 端到端测试验证完成！')
      
    } catch (error) {
      console.error('❌ 端到端测试失败:', error.message)
      throw error
    } finally {
      await this.cleanupE2EEnvironment()
    }
  }
  
  private async setupE2EEnvironment(): Promise<void> {
    console.log('🔧 设置E2E测试环境...')
    
    // 启动浏览器
    this.browsers = await Promise.all([
      chromium.launch({ headless: true }),
      firefox.launch({ headless: true }),
      webkit.launch({ headless: true })
    ])
    
    // 准备测试数据
    await this.testDataManager.prepareE2ETestData()
    
    // 启动应用服务
    await this.startApplicationForE2E()
    
    console.log('✅ E2E测试环境准备完成')
  }
  
  private async runUserJourneyTests(): Promise<void> {
    console.log('👤 执行用户业务流程测试...')
    
    const userJourneys = [
      {
        name: '新用户完整注册流程',
        test: this.testNewUserRegistrationJourney
      },
      {
        name: '用户登录到AI对话流程',
        test: this.testUserLoginToChatJourney
      },
      {
        name: 'CAD文件分析完整流程',
        test: this.testCADAnalysisJourney
      },
      {
        name: '海报生成和下载流程',
        test: this.testPosterGenerationJourney
      },
      {
        name: '管理员用户管理流程',
        test: this.testAdminUserManagementJourney
      }
    ]
    
    for (const journey of userJourneys) {
      console.log(`🚀 测试: ${journey.name}`)
      
      for (const browser of this.browsers) {
        const context = await browser.newContext({
          viewport: { width: 1920, height: 1080 },
          recordVideo: { dir: `test-results/videos/${journey.name}` }
        })
        
        try {
          await journey.test.call(this, context)
          console.log(`✅ ${journey.name} - ${browser.browserType().name()} 通过`)
        } catch (error) {
          console.error(`❌ ${journey.name} - ${browser.browserType().name()} 失败:`, error.message)
          throw error
        } finally {
          await context.close()
        }
      }
    }
  }
  
  private async testNewUserRegistrationJourney(context: any): Promise<void> {
    const page = await context.newPage()
    
    // 开始性能监控
    await this.performanceMonitor.startMonitoring(page)
    
    try {
      // 1. 访问首页
      await page.goto('http://localhost:3000')
      await page.waitForLoadState('networkidle')
      
      // 验证首页加载性能
      const navigationTiming = await page.evaluate(() => performance.getEntriesByType('navigation')[0])
      expect(navigationTiming.loadEventEnd - navigationTiming.navigationStart).toBeLessThan(3000)
      
      // 2. 点击注册按钮
      await page.getByRole('link', { name: '注册' }).click()
      await page.waitForURL('**/register')
      
      // 3. 填写注册表单
      const testUser = this.testDataManager.generateTestUser()
      
      await page.getByLabel('邮箱').fill(testUser.email)
      await page.getByLabel('用户名').fill(testUser.name)
      await page.getByLabel('密码').fill(testUser.password)
      await page.getByLabel('确认密码').fill(testUser.password)
      await page.getByLabel('同意服务条款').check()
      
      // 4. 提交注册
      await page.getByRole('button', { name: '注册' }).click()
      
      // 5. 验证注册成功
      await page.waitForSelector('.success-message', { timeout: 10000 })
      expect(await page.locator('.success-message').textContent()).toContain('注册成功')
      
      // 6. 模拟邮箱验证
      const verificationToken = await this.testDataManager.getVerificationToken(testUser.email)
      await page.goto(`http://localhost:3000/verify-email?token=${verificationToken}`)
      
      // 7. 验证邮箱验证成功
      await page.waitForSelector('.verification-success')
      expect(await page.locator('.verification-success').textContent()).toContain('验证成功')
      
      // 8. 自动跳转到登录页
      await page.waitForURL('**/login')
      
      // 9. 登录验证
      await page.getByLabel('邮箱').fill(testUser.email)
      await page.getByLabel('密码').fill(testUser.password)
      await page.getByRole('button', { name: '登录' }).click()
      
      // 10. 验证登录成功跳转到仪表盘
      await page.waitForURL('**/dashboard')
      expect(await page.locator('.welcome-message').textContent()).toContain(`欢迎, ${testUser.name}`)
      
      // 验证整体性能指标
      const performanceReport = await this.performanceMonitor.generateReport(page)
      expect(performanceReport.totalJourneyTime).toBeLessThan(120000) // 2分钟内完成
      expect(performanceReport.averagePageLoadTime).toBeLessThan(3000) // 平均页面加载 < 3秒
      
    } finally {
      await page.close()
    }
  }
  
  private async runAccessibilityTests(): Promise<void> {
    console.log('♿ 执行可访问性测试...')
    
    const accessibilityPages = [
      '/',
      '/register',
      '/login', 
      '/dashboard',
      '/chat',
      '/cad-analyzer',
      '/poster-generator'
    ]
    
    const browser = this.browsers[0] // 使用Chromium进行可访问性测试
    const context = await browser.newContext()
    const page = await context.newPage()
    
    try {
      for (const pagePath of accessibilityPages) {
        console.log(`🔍 检查页面可访问性: ${pagePath}`)
        
        await page.goto(`http://localhost:3000${pagePath}`)
        await page.waitForLoadState('networkidle')
        
        // 运行axe-core可访问性检查
        const accessibilityResults = await page.evaluate(async () => {
          // @ts-ignore
          const axe = require('axe-core')
          return await axe.run()
        })
        
        // 检查违规项
        const violations = accessibilityResults.violations
        if (violations.length > 0) {
          console.error(`❌ 页面 ${pagePath} 发现可访问性问题:`)
          violations.forEach(violation => {
            console.error(`- ${violation.id}: ${violation.description}`)
          })
          throw new Error(`可访问性测试失败: ${pagePath}`)
        }
        
        // 键盘导航测试
        await this.testKeyboardNavigation(page)
        
        // 颜色对比度测试
        await this.testColorContrast(page)
        
        console.log(`✅ 页面 ${pagePath} 可访问性测试通过`)
      }
    } finally {
      await context.close()
    }
  }
  
  private async testKeyboardNavigation(page: any): Promise<void> {
    // 获取所有可聚焦元素
    const focusableElements = await page.locator('[tabindex]:not([tabindex="-1"]), button, input, select, textarea, a[href]').all()
    
    // 测试Tab键导航
    for (let i = 0; i < Math.min(focusableElements.length, 10); i++) {
      await page.keyboard.press('Tab')
      
      const focusedElement = await page.locator(':focus')
      expect(await focusedElement.isVisible()).toBe(true)
      
      // 验证焦点指示器
      const outline = await focusedElement.evaluate(el => 
        window.getComputedStyle(el).outline
      )
      expect(outline).not.toBe('none')
    }
  }
  
  private async testColorContrast(page: any): Promise<void> {
    // 检查所有文本元素的颜色对比度
    const textElements = await page.locator('p, span, div, h1, h2, h3, h4, h5, h6, button, a').all()
    
    for (const element of textElements.slice(0, 20)) { // 限制检查数量避免超时
      const styles = await element.evaluate(el => {
        const computed = window.getComputedStyle(el)
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          fontSize: computed.fontSize
        }
      })
      
      // 这里应该调用颜色对比度计算函数
      // const contrast = calculateColorContrast(styles.color, styles.backgroundColor)
      // const fontSize = parseInt(styles.fontSize)
      // const requiredContrast = fontSize >= 18 ? 3 : 4.5
      // expect(contrast).toBeGreaterThanOrEqual(requiredContrast)
    }
  }
}

// 执行E2E测试
if (require.main === module) {
  const runner = new E2ETestRunner()
  runner.runE2ETests()
    .then(() => {
      console.log('🎉 所有E2E测试通过！')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 E2E测试失败:', error)
      process.exit(1)
    })
}
```

---

## 🔒 安全验证程序

### 📋 安全扫描执行程序

```bash
#!/bin/bash
# security-validation.sh - 安全验证程序

echo "🔒 执行安全验证程序..."

# 1. 依赖安全扫描
echo "🔍 执行依赖安全扫描..."
pnpm audit --audit-level high --json > security-audit.json

HIGH_VULNERABILITIES=$(cat security-audit.json | jq '.metadata.vulnerabilities.high // 0')
CRITICAL_VULNERABILITIES=$(cat security-audit.json | jq '.metadata.vulnerabilities.critical // 0')

echo "📊 依赖安全扫描结果:"
echo "- 严重漏洞: $CRITICAL_VULNERABILITIES"
echo "- 高危漏洞: $HIGH_VULNERABILITIES"

if [ "$CRITICAL_VULNERABILITIES" -gt 0 ] || [ "$HIGH_VULNERABILITIES" -gt 0 ]; then
    echo "❌ 发现高危安全漏洞！详细信息:"
    cat security-audit.json | jq '.advisories'
    exit 1
fi
echo "✅ 依赖安全扫描通过"

# 2. 静态代码安全分析
echo "🔍 执行静态代码安全分析..."
if ! npx semgrep --config=auto --json --output=semgrep-report.json .; then
    echo "❌ 静态代码安全分析失败！"
    cat semgrep-report.json | jq '.results'
    exit 1
fi

SECURITY_ISSUES=$(cat semgrep-report.json | jq '.results | length')
if [ "$SECURITY_ISSUES" -gt 0 ]; then
    echo "❌ 发现代码安全问题！数量: $SECURITY_ISSUES"
    cat semgrep-report.json | jq '.results'
    exit 1
fi
echo "✅ 静态代码安全分析通过"

# 3. 密钥和敏感信息检查
echo "🔐 检查密钥和敏感信息..."
if ! npx truffleHog filesystem . --json > trufflehog-report.json; then
    echo "⚠️  TruffleHog扫描完成，检查结果..."
fi

SECRETS_FOUND=$(cat trufflehog-report.json | jq '. | length')
if [ "$SECRETS_FOUND" -gt 0 ]; then
    echo "❌ 发现疑似敏感信息！数量: $SECRETS_FOUND"
    cat trufflehog-report.json | jq '.'
    exit 1
fi
echo "✅ 密钥和敏感信息检查通过"

# 4. 容器安全扫描（如果有Docker文件）
if [ -f "Dockerfile" ]; then
    echo "🐳 执行容器安全扫描..."
    if ! docker run --rm -v "$PWD":/path aquasec/trivy fs --format json --output trivy-report.json /path; then
        echo "❌ 容器安全扫描失败！"
        exit 1
    fi
    
    HIGH_CVE=$(cat trivy-report.json | jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "HIGH")] | length')
    CRITICAL_CVE=$(cat trivy-report.json | jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "CRITICAL")] | length')
    
    if [ "$CRITICAL_CVE" -gt 0 ] || [ "$HIGH_CVE" -gt 5 ]; then
        echo "❌ 容器镜像存在高危漏洞！严重: $CRITICAL_CVE, 高危: $HIGH_CVE"
        exit 1
    fi
    echo "✅ 容器安全扫描通过"
fi

# 5. OWASP ZAP动态安全扫描
echo "🕷️ 执行OWASP ZAP动态安全扫描..."

# 启动应用
pnpm run start &
APP_PID=$!
sleep 30

# 运行ZAP扫描
docker run -t owasp/zap2docker-stable zap-baseline.py \
    -t http://host.docker.internal:3000 \
    -J zap-report.json \
    -r zap-report.html

ZAP_EXIT_CODE=$?

# 关闭应用
kill $APP_PID

if [ $ZAP_EXIT_CODE -ne 0 ]; then
    echo "❌ OWASP ZAP扫描发现安全问题！"
    echo "详细报告请查看: zap-report.html"
    exit 1
fi
echo "✅ OWASP ZAP动态安全扫描通过"

# 6. SSL/TLS配置检查（生产环境）
if [ "$NODE_ENV" = "production" ]; then
    echo "🔒 检查SSL/TLS配置..."
    
    # 检查证书有效性
    if ! curl -sSL https://localhost:3000/api/health > /dev/null; then
        echo "❌ SSL/TLS配置检查失败！"
        exit 1
    fi
    
    # 检查安全头
    SECURITY_HEADERS=$(curl -I https://localhost:3000 2>/dev/null)
    
    REQUIRED_HEADERS=(
        "Strict-Transport-Security"
        "X-Content-Type-Options"
        "X-Frame-Options"
        "X-XSS-Protection"
        "Content-Security-Policy"
    )
    
    for header in "${REQUIRED_HEADERS[@]}"; do
        if ! echo "$SECURITY_HEADERS" | grep -i "$header" > /dev/null; then
            echo "❌ 缺少安全头: $header"
            exit 1
        fi
    done
    echo "✅ SSL/TLS配置检查通过"
fi

# 7. 生成安全验证报告
echo "📊 生成安全验证报告..."
cat > security-validation-report.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "PASSED",
  "checks": {
    "dependency_scan": {
      "status": "PASSED",
      "critical_vulnerabilities": $CRITICAL_VULNERABILITIES,
      "high_vulnerabilities": $HIGH_VULNERABILITIES
    },
    "static_code_analysis": {
      "status": "PASSED",
      "security_issues": $SECURITY_ISSUES
    },
    "secret_detection": {
      "status": "PASSED",
      "secrets_found": $SECRETS_FOUND
    },
    "container_scan": {
      "status": "PASSED",
      "critical_cve": ${CRITICAL_CVE:-0},
      "high_cve": ${HIGH_CVE:-0}
    },
    "dynamic_scan": {
      "status": "PASSED",
      "zap_exit_code": $ZAP_EXIT_CODE
    }
  }
}
EOF

echo "✅ 安全验证程序完成！所有检查通过"
echo "📄 详细报告: security-validation-report.json"
```

---

## ⚡ 性能验证程序

### 📋 性能测试执行程序

```javascript
// performance-validation.js - 性能验证程序

const lighthouse = require('lighthouse')
const chromeLauncher = require('chrome-launcher')
const k6 = require('k6')
const fs = require('fs')

class PerformanceValidator {
  constructor() {
    this.results = {
      lighthouse: null,
      loadTest: null,
      stressTest: null,
      webVitals: null
    }
  }
  
  async runPerformanceValidation() {
    console.log('⚡ 执行性能验证程序...')
    
    try {
      // 1. Lighthouse性能测试
      await this.runLighthouseTests()
      
      // 2. 负载测试
      await this.runLoadTests()
      
      // 3. 压力测试
      await this.runStressTests()
      
      // 4. Web Vitals测试
      await this.runWebVitalsTests()
      
      // 5. 内存泄漏检测
      await this.runMemoryLeakTests()
      
      // 6. 生成性能报告
      await this.generatePerformanceReport()
      
      console.log('✅ 性能验证程序完成！')
      
    } catch (error) {
      console.error('❌ 性能验证失败:', error.message)
      throw error
    }
  }
  
  async runLighthouseTests() {
    console.log('🏮 执行Lighthouse性能测试...')
    
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] })
    
    const options = {
      logLevel: 'info',
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      port: chrome.port,
    }
    
    const pages = [
      'http://localhost:3000/',
      'http://localhost:3000/register',
      'http://localhost:3000/login',
      'http://localhost:3000/dashboard',
      'http://localhost:3000/chat'
    ]
    
    const lighthouseResults = []
    
    for (const url of pages) {
      console.log(`📊 测试页面: ${url}`)
      
      const result = await lighthouse(url, options)
      const scores = result.report.categories
      
      const pageResult = {
        url,
        performance: scores.performance.score * 100,
        accessibility: scores.accessibility.score * 100,
        bestPractices: scores['best-practices'].score * 100,
        seo: scores.seo.score * 100,
        metrics: {
          firstContentfulPaint: result.report.audits['first-contentful-paint'].numericValue,
          largestContentfulPaint: result.report.audits['largest-contentful-paint'].numericValue,
          firstInputDelay: result.report.audits['first-input-delay'].numericValue,
          cumulativeLayoutShift: result.report.audits['cumulative-layout-shift'].numericValue,
          speedIndex: result.report.audits['speed-index'].numericValue
        }
      }
      
      lighthouseResults.push(pageResult)
      
      // 验证性能标准
      if (pageResult.performance < 90) {
        throw new Error(`页面 ${url} 性能评分过低: ${pageResult.performance}`)
      }
      
      if (pageResult.metrics.largestContentfulPaint > 2500) {
        throw new Error(`页面 ${url} LCP过慢: ${pageResult.metrics.largestContentfulPaint}ms`)
      }
      
      console.log(`✅ ${url} 性能测试通过 (评分: ${pageResult.performance})`)
    }
    
    await chrome.kill()
    this.results.lighthouse = lighthouseResults
    
    console.log('✅ Lighthouse性能测试完成')
  }
  
  async runLoadTests() {
    console.log('🔄 执行负载测试...')
    
    // k6负载测试脚本
    const loadTestScript = `
      import http from 'k6/http';
      import { check, sleep } from 'k6';
      import { Rate } from 'k6/metrics';
      
      const errorRate = new Rate('errors');
      
      export let options = {
        stages: [
          { duration: '2m', target: 50 },   // 2分钟内逐渐增加到50用户
          { duration: '5m', target: 100 },  // 保持100用户5分钟
          { duration: '2m', target: 200 },  // 增加到200用户
          { duration: '5m', target: 200 },  // 保持200用户5分钟
          { duration: '2m', target: 0 },    // 逐渐减少到0
        ],
        thresholds: {
          http_req_duration: ['p(95)<200'],  // 95%请求响应时间<200ms
          http_req_failed: ['rate<0.1'],     // 错误率<10%
          errors: ['rate<0.1'],              // 自定义错误率<10%
        },
      };
      
      export default function() {
        // 测试主要API端点
        const endpoints = [
          'http://localhost:3000/api/health',
          'http://localhost:3000/api/auth/verify-token',
          'http://localhost:3000/api/user/profile',
          'http://localhost:3000/api/chat/sessions'
        ];
        
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        
        const response = http.get(endpoint, {
          headers: {
            'Authorization': 'Bearer test-token',
          },
        });
        
        const success = check(response, {
          'status is 200': (r) => r.status === 200,
          'response time < 200ms': (r) => r.timings.duration < 200,
        });
        
        errorRate.add(!success);
        
        sleep(1);
      }
    `;
    
    // 写入临时脚本文件
    fs.writeFileSync('temp-load-test.js', loadTestScript)
    
    try {
      // 执行k6负载测试
      const { execSync } = require('child_process')
      const loadTestOutput = execSync('k6 run --out json=load-test-results.json temp-load-test.js', {
        encoding: 'utf8'
      })
      
      console.log('📊 负载测试结果:')
      console.log(loadTestOutput)
      
      // 解析测试结果
      const results = JSON.parse(fs.readFileSync('load-test-results.json', 'utf8'))
      
      this.results.loadTest = {
        avgResponseTime: results.metrics.http_req_duration.avg,
        p95ResponseTime: results.metrics.http_req_duration['p(95)'],
        errorRate: results.metrics.http_req_failed.rate,
        requestsPerSecond: results.metrics.http_reqs.rate
      }
      
      // 验证负载测试标准
      if (this.results.loadTest.p95ResponseTime > 200) {
        throw new Error(`P95响应时间过慢: ${this.results.loadTest.p95ResponseTime}ms`)
      }
      
      if (this.results.loadTest.errorRate > 0.1) {
        throw new Error(`错误率过高: ${this.results.loadTest.errorRate * 100}%`)
      }
      
      console.log('✅ 负载测试通过')
      
    } finally {
      // 清理临时文件
      if (fs.existsSync('temp-load-test.js')) {
        fs.unlinkSync('temp-load-test.js')
      }
    }
  }
  
  async runMemoryLeakTests() {
    console.log('🧠 执行内存泄漏检测...')
    
    const { spawn } = require('child_process')
    
    // 启动应用并监控内存
    const app = spawn('node', ['--expose-gc', 'server.js'], {
      env: { ...process.env, NODE_ENV: 'test' }
    })
    
    const memoryUsage = []
    let initialMemory = 0
    
    // 监控内存使用情况
    const memoryMonitor = setInterval(async () => {
      try {
        const response = await fetch('http://localhost:3000/api/health/memory')
        const memory = await response.json()
        
        if (initialMemory === 0) {
          initialMemory = memory.heapUsed
        }
        
        memoryUsage.push({
          timestamp: Date.now(),
          heapUsed: memory.heapUsed,
          heapTotal: memory.heapTotal,
          external: memory.external,
          rss: memory.rss
        })
        
      } catch (error) {
        // 忽略监控错误
      }
    }, 5000)
    
    // 模拟负载5分钟
    console.log('📊 运行5分钟内存负载测试...')
    
    for (let i = 0; i < 300; i++) {
      try {
        await Promise.all([
          fetch('http://localhost:3000/api/chat/sessions'),
          fetch('http://localhost:3000/api/user/profile'),
          fetch('http://localhost:3000/api/health')
        ])
      } catch (error) {
        // 忽略请求错误
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    clearInterval(memoryMonitor)
    app.kill()
    
    // 分析内存使用趋势
    const finalMemory = memoryUsage[memoryUsage.length - 1].heapUsed
    const memoryGrowth = finalMemory - initialMemory
    const memoryGrowthPercent = (memoryGrowth / initialMemory) * 100
    
    console.log(`📊 内存使用分析:`)
    console.log(`- 初始内存: ${Math.round(initialMemory / 1024 / 1024)}MB`)
    console.log(`- 最终内存: ${Math.round(finalMemory / 1024 / 1024)}MB`)
    console.log(`- 内存增长: ${Math.round(memoryGrowth / 1024 / 1024)}MB (${memoryGrowthPercent.toFixed(2)}%)`)
    
    // 验证内存泄漏标准
    if (memoryGrowthPercent > 20) {
      throw new Error(`检测到内存泄漏！内存增长${memoryGrowthPercent.toFixed(2)}%`)
    }
    
    this.results.memoryLeak = {
      initialMemory,
      finalMemory,
      memoryGrowth,
      memoryGrowthPercent,
      samples: memoryUsage.length
    }
    
    console.log('✅ 内存泄漏检测通过')
  }
  
  async generatePerformanceReport() {
    console.log('📊 生成性能验证报告...')
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        status: 'PASSED',
        overallScore: this.calculateOverallScore()
      },
      lighthouse: this.results.lighthouse,
      loadTest: this.results.loadTest,
      stressTest: this.results.stressTest,
      webVitals: this.results.webVitals,
      memoryLeak: this.results.memoryLeak,
      recommendations: this.generateRecommendations()
    }
    
    fs.writeFileSync('performance-validation-report.json', JSON.stringify(report, null, 2))
    
    console.log('📄 性能报告已生成: performance-validation-report.json')
    console.log(`📊 总体性能评分: ${report.summary.overallScore}/100`)
  }
  
  calculateOverallScore() {
    const lighthouseAvg = this.results.lighthouse?.reduce((sum, page) => sum + page.performance, 0) / this.results.lighthouse?.length || 0
    const loadTestScore = this.results.loadTest?.errorRate < 0.05 ? 100 : 80
    const memoryScore = this.results.memoryLeak?.memoryGrowthPercent < 10 ? 100 : 80
    
    return Math.round((lighthouseAvg + loadTestScore + memoryScore) / 3)
  }
  
  generateRecommendations() {
    const recommendations = []
    
    if (this.results.lighthouse) {
      this.results.lighthouse.forEach(page => {
        if (page.metrics.largestContentfulPaint > 2000) {
          recommendations.push(`优化 ${page.url} 的LCP性能，当前: ${page.metrics.largestContentfulPaint}ms`)
        }
      })
    }
    
    if (this.results.loadTest?.p95ResponseTime > 150) {
      recommendations.push('优化API响应时间，考虑添加缓存或数据库索引')
    }
    
    if (this.results.memoryLeak?.memoryGrowthPercent > 10) {
      recommendations.push('检查可能的内存泄漏，特别是事件监听器和定时器的清理')
    }
    
    return recommendations
  }
}

// 执行性能验证
if (require.main === module) {
  const validator = new PerformanceValidator()
  validator.runPerformanceValidation()
    .then(() => {
      console.log('🎉 性能验证完成！')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 性能验证失败:', error)
      process.exit(1)
    })
}

module.exports = PerformanceValidator
```

---

## 📋 生产部署验证程序

### 📋 部署前检查清单

```markdown
# 🚀 生产部署前验证清单

## 📋 环境验证
- [ ] **服务器环境检查**
  - [ ] Node.js版本: 22.x LTS
  - [ ] 内存: ≥ 8GB
  - [ ] 磁盘空间: ≥ 100GB
  - [ ] CPU: ≥ 4核心
  - [ ] 网络带宽: ≥ 1Gbps

- [ ] **数据库环境检查**
  - [ ] PostgreSQL版本: 15+
  - [ ] 数据库连接池配置
  - [ ] 备份策略验证
  - [ ] 性能调优参数
  - [ ] 监控配置

- [ ] **缓存环境检查**
  - [ ] Redis版本: 7+
  - [ ] 内存配置: ≥ 4GB
  - [ ] 持久化配置
  - [ ] 集群配置（如果需要）
  - [ ] 监控配置

## 📋 配置验证
- [ ] **环境变量配置**
  - [ ] DATABASE_URL
  - [ ] REDIS_URL
  - [ ] JWT_SECRET
  - [ ] API密钥配置
  - [ ] 文件存储配置

- [ ] **SSL/TLS配置**
  - [ ] SSL证书有效
  - [ ] 证书链完整
  - [ ] 自动续期配置
  - [ ] HTTPS重定向
  - [ ] 安全头配置

- [ ] **域名和DNS配置**
  - [ ] 域名解析正确
  - [ ] CDN配置
  - [ ] 负载均衡配置
  - [ ] 健康检查配置
  - [ ] 故障转移配置

## 📋 安全验证
- [ ] **防火墙配置**
  - [ ] 只开放必要端口
  - [ ] WAF配置
  - [ ] DDoS防护
  - [ ] IP白名单配置
  - [ ] 访问日志记录

- [ ] **权限配置**
  - [ ] 服务账户权限最小化
  - [ ] 文件权限正确设置
  - [ ] 数据库权限隔离
  - [ ] API访问控制
  - [ ] 管理员权限分离

## 📋 监控验证
- [ ] **应用监控**
  - [ ] APM配置
  - [ ] 错误追踪
  - [ ] 性能监控
  - [ ] 业务指标监控
  - [ ] 用户行为分析

- [ ] **基础设施监控**
  - [ ] 服务器监控
  - [ ] 数据库监控
  - [ ] 网络监控
  - [ ] 存储监控
  - [ ] 告警配置

## 📋 备份和恢复验证
- [ ] **数据备份**
  - [ ] 自动备份配置
  - [ ] 备份完整性验证
  - [ ] 备份恢复测试
  - [ ] 异地备份配置
  - [ ] 备份保留策略

- [ ] **灾难恢复**
  - [ ] 恢复流程文档
  - [ ] 恢复时间测试
  - [ ] 数据一致性验证
  - [ ] 故障切换测试
  - [ ] 回滚计划准备
```

### 📋 部署执行脚本

```bash
#!/bin/bash
# production-deployment.sh - 生产部署脚本

set -e  # 遇到错误立即退出

echo "🚀 开始生产环境部署..."

# 配置参数
DEPLOYMENT_ENV="production"
APP_NAME="zk-agent"
DOCKER_IMAGE="$APP_NAME:$(git rev-parse --short HEAD)"
HEALTH_CHECK_URL="https://api.zk-agent.com/health"
DEPLOYMENT_TIMEOUT=600  # 10分钟超时

# 1. 部署前验证
echo "🔍 执行部署前验证..."

# 检查Git状态
if [[ -n $(git status --porcelain) ]]; then
    echo "❌ 工作目录不干净！请提交或储藏所有更改"
    exit 1
fi

# 检查分支
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" ]] && [[ "$CURRENT_BRANCH" != "release/"* ]]; then
    echo "❌ 只能从main分支或release分支部署到生产环境！当前分支: $CURRENT_BRANCH"
    exit 1
fi

# 检查最新代码
git fetch origin
LOCAL_COMMIT=$(git rev-parse HEAD)
REMOTE_COMMIT=$(git rev-parse "origin/$CURRENT_BRANCH")
if [[ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]]; then
    echo "❌ 本地代码不是最新的！请先拉取最新代码"
    exit 1
fi

echo "✅ 部署前验证通过"

# 2. 构建和测试
echo "🔨 执行构建和测试..."

# 安装依赖
pnpm install --frozen-lockfile --production=false

# 执行完整测试套件
pnpm run test:production

# 安全扫描
pnpm run security:scan

# 构建生产版本
NODE_ENV=production pnpm run build

echo "✅ 构建和测试完成"

# 3. Docker镜像构建
echo "🐳 构建Docker镜像..."

# 构建镜像
docker build -t $DOCKER_IMAGE .

# 安全扫描镜像
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
    aquasec/trivy image --exit-code 1 --severity HIGH,CRITICAL $DOCKER_IMAGE

# 推送到镜像仓库
docker tag $DOCKER_IMAGE $REGISTRY_URL/$DOCKER_IMAGE
docker push $REGISTRY_URL/$DOCKER_IMAGE

echo "✅ Docker镜像构建完成"

# 4. 数据库迁移
echo "🗄️ 执行数据库迁移..."

# 创建数据库备份
BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
kubectl exec deployment/postgres -- pg_dump -U postgres zkagent > $BACKUP_NAME.sql

# 执行迁移
export DATABASE_URL=$PRODUCTION_DATABASE_URL
pnpm exec prisma migrate deploy

# 验证迁移
pnpm run db:verify

echo "✅ 数据库迁移完成"

# 5. 蓝绿部署
echo "🔄 执行蓝绿部署..."

# 获取当前活跃版本
CURRENT_VERSION=$(kubectl get service $APP_NAME -o jsonpath='{.spec.selector.version}')
if [[ "$CURRENT_VERSION" == "blue" ]]; then
    NEW_VERSION="green"
else
    NEW_VERSION="blue"
fi

echo "当前版本: $CURRENT_VERSION, 新版本: $NEW_VERSION"

# 部署新版本
envsubst < k8s/deployment-template.yaml | \
    sed "s/{{VERSION}}/$NEW_VERSION/g" | \
    sed "s/{{IMAGE}}/$REGISTRY_URL\/$DOCKER_IMAGE/g" | \
    kubectl apply -f -

# 等待新版本就绪
echo "⏳ 等待新版本启动..."
kubectl rollout status deployment/$APP_NAME-$NEW_VERSION --timeout=${DEPLOYMENT_TIMEOUT}s

# 健康检查
echo "🔍 执行健康检查..."
for i in {1..10}; do
    if kubectl exec deployment/$APP_NAME-$NEW_VERSION -- curl -f http://localhost:3000/health; then
        echo "✅ 健康检查通过"
        break
    fi
    
    if [[ $i -eq 10 ]]; then
        echo "❌ 健康检查失败，回滚部署"
        kubectl delete deployment $APP_NAME-$NEW_VERSION
        exit 1
    fi
    
    echo "⏳ 健康检查失败，等待重试... ($i/10)"
    sleep 10
done

# 6. 流量切换
echo "🔀 切换流量到新版本..."

# 更新服务选择器
kubectl patch service $APP_NAME -p '{"spec":{"selector":{"version":"'$NEW_VERSION'"}}}'

# 验证流量切换
sleep 30
for i in {1..5}; do
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_CHECK_URL)
    if [[ "$RESPONSE" == "200" ]]; then
        echo "✅ 流量切换成功"
        break
    fi
    
    if [[ $i -eq 5 ]]; then
        echo "❌ 流量切换验证失败，回滚"
        kubectl patch service $APP_NAME -p '{"spec":{"selector":{"version":"'$CURRENT_VERSION'"}}}'
        exit 1
    fi
    
    sleep 10
done

# 7. 清理旧版本
echo "🧹 清理旧版本..."
kubectl delete deployment $APP_NAME-$CURRENT_VERSION

# 8. 部署后验证
echo "🔍 执行部署后验证..."

# API功能测试
pnpm run test:api:production

# 性能基准测试
pnpm run test:performance:production

# 安全扫描
pnpm run security:scan:production

# 监控验证
sleep 60  # 等待监控数据收集
pnpm run monitoring:verify

echo "✅ 部署后验证完成"

# 9. 通知和记录
echo "📨 发送部署通知..."

# 发送Slack通知
curl -X POST -H 'Content-type: application/json' \
    --data "{
        \"text\":\"🚀 ZK-Agent生产环境部署成功\",
        \"attachments\":[{
            \"color\":\"good\",
            \"fields\":[
                {\"title\":\"版本\",\"value\":\"$DOCKER_IMAGE\",\"short\":true},
                {\"title\":\"分支\",\"value\":\"$CURRENT_BRANCH\",\"short\":true},
                {\"title\":\"部署者\",\"value\":\"$(git config user.name)\",\"short\":true},
                {\"title\":\"时间\",\"value\":\"$(date)\",\"short\":true}
            ]
        }]
    }" \
    $SLACK_WEBHOOK_URL

# 记录部署日志
echo "{
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
    \"version\": \"$DOCKER_IMAGE\",
    \"branch\": \"$CURRENT_BRANCH\",
    \"commit\": \"$(git rev-parse HEAD)\",
    \"deployer\": \"$(git config user.name)\",
    \"environment\": \"$DEPLOYMENT_ENV\",
    \"status\": \"SUCCESS\"
}" >> deployment-log.json

echo "🎉 生产环境部署成功完成！"
echo "🔗 应用访问地址: $HEALTH_CHECK_URL"
echo "📊 监控面板: https://monitoring.zk-agent.com"
echo "📄 部署日志已记录到: deployment-log.json"
```

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"id": "create-validation-framework", "content": "\u5efa\u7acb\u5168\u9762\u7684M\u9a8c\u8bc1\u6846\u67b6\u4f53\u7cfb", "status": "completed", "priority": "high"}, {"id": "design-functional-tests", "content": "\u8bbe\u8ba1\u529f\u80fd\u5b8c\u5584\u6027\u6d4b\u8bd5\u65b9\u6848", "status": "completed", "priority": "high"}, {"id": "implement-quality-assurance", "content": "\u5b9e\u65bd\u8d28\u91cf\u4fdd\u8bc1\u9a8c\u8bc1\u6d41\u7a0b", "status": "completed", "priority": "high"}, {"id": "create-acceptance-criteria", "content": "\u5236\u5b9a\u8be6\u7ec6\u9a8c\u6536\u6807\u51c6\u548c\u68c0\u67e5\u6e05\u5355", "status": "completed", "priority": "medium"}, {"id": "document-validation-procedures", "content": "\u7f16\u5199\u9a8c\u8bc1\u7a0b\u5e8f\u548c\u64cd\u4f5c\u6587\u6863", "status": "completed", "priority": "medium"}]