# 🚀 快速参考卡片 - 核心开发规范

> **放在办公桌前，随时查阅！**

---

## 🎯 项目核心定位

| 模块 | 归属 | 路径 | 说明 |
|------|------|------|------|
| 对话智能体 | 用户端 | `/chat` | 用户使用，管理端配置 |
| CAD解读智能体 | 用户端 | `/cad-analyzer` | 用户使用，管理端配置 |
| 海报设计智能体 | 用户端 | `/poster-generator` | 用户使用，管理端配置 |
| **🎯 AI大模型管理器** | **管理端专属** | `/admin/dashboard/ai-models` | **仅限管理员** |
| 智能体配置管理 | 管理端专属 | `/admin/dashboard/agents` | 仅限管理员 |
| 数据分析 | 管理端专属 | `/admin/dashboard/analytics` | 仅限管理员 |

---

## 🚫 严禁事项

### ❌ 功能边界严禁混淆
```typescript
// ❌ 用户端严禁出现这些功能
const UserComponent = () => {
  const configAIModel = () => {}; // 严禁！
  const viewModelCosts = () => {}; // 严禁！
  const manageProviders = () => {}; // 严禁！
};
```

### ❌ API路径严禁错乱
```typescript
// ❌ 用户端严禁这些路径
'GET /api/ag-ui/ai-models'     // 严禁！
'GET /api/models/config'       // 严禁！
'POST /api/user/ai-provider'   // 严禁！

// ✅ 正确的路径划分
'GET /api/ag-ui/agents'        // 用户端获取智能体
'GET /api/admin/ai-models'     // 管理端获取AI模型
```

---

## 📂 项目结构速查

```
app/
├── (public)/              # 用户端页面
│   ├── chat/             # 对话智能体
│   ├── cad-analyzer/     # CAD解读
│   └── poster-generator/ # 海报设计
└── admin/                # 管理端页面
    └── dashboard/
        ├── agents/       # 智能体管理
        ├── ai-models/    # 🎯 AI大模型管理器
        ├── analytics/    # 数据分析
        └── users/        # 用户管理

api/
├── ag-ui/                # 用户端API
├── admin/                # 管理端API
│   ├── ai-providers/     # AI提供商管理
│   ├── ai-models/        # AI模型管理
│   └── analytics/        # 数据分析
└── system/               # 系统API
```

---

## 🔤 命名规范速查

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件名 | kebab-case | `ai-model-service.ts` |
| 组件名 | PascalCase | `AIModelManager` |
| 变量名 | camelCase | `aiModelConfig` |
| 常量名 | SCREAMING_SNAKE_CASE | `AI_MODEL_PERMISSIONS` |
| 类型名 | PascalCase | `AIProvider`, `AdminUser` |

---

## 🔄 Git工作流速查

```bash
# 分支命名
feature/ai-model-manager       # 功能分支
hotfix/critical-security-fix   # 紧急修复
release/v1.0.0                # 发布分支

# 提交信息格式
feat(admin): 添加AI模型管理器界面
fix(chat): 修复消息发送失败问题
docs(api): 更新AI模型管理API文档
test(admin): 添加AI模型管理器测试用例
```

---

## 🧪 测试要求速查

```typescript
// 测试文件命名
__tests__/services/ai-model-service.test.ts
__tests__/components/admin/AIModelManager.test.tsx

// 测试覆盖率要求
单元测试覆盖率 > 80%
管理端功能 = 额外安全测试
AI模型管理器 = 完整功能测试
```

---

## 🛡️ 权限控制速查

```typescript
// 管理端权限枚举
enum AIModelPermissions {
  AI_MODEL_VIEW = 'ai_model:view',
  AI_MODEL_CREATE = 'ai_model:create',
  AI_MODEL_UPDATE = 'ai_model:update',
  AI_MODEL_DELETE = 'ai_model:delete',
  AI_PROVIDER_MANAGE = 'ai_provider:manage',
  AI_COST_MANAGE = 'ai_cost:manage'
}

// 权限检查
const hasPermission = useAdminPermission('AI_MODEL_VIEW');
```

---

## 📊 数据库规范速查

```sql
-- 标准表结构
CREATE TABLE standard_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 管理端表必须字段
CREATE TABLE admin_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES admin_users(id), -- 必须
    updated_by UUID REFERENCES admin_users(id), -- 必须
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🎨 TypeScript规范速查

```typescript
// 接口定义规范
interface ServiceInterface {
  getModel(id: string): Promise<AIModel>;
  updateModel(id: string, updates: Partial<AIModel>): Promise<AIModel>;
  handleError(error: unknown): ServiceError;
}

// 组件规范
const Component: React.FC<Props> = ({ prop1, prop2 = 'default' }) => {
  const [state, setState] = useState<StateType>(initialState);
  
  const computed = useMemo(() => calculation(state), [state]);
  
  const handleEvent = useCallback((event: Event) => {
    // 事件处理
  }, [dependency]);
  
  return <div>{/* JSX */}</div>;
};
```

---

## 🚀 性能指标速查

| 指标 | 标准 | 监控方式 |
|------|------|----------|
| API响应时间 | < 500ms | 实时监控 |
| 页面加载时间 | < 3s | 性能测试 |
| 数据库查询 | < 100ms | 查询分析 |
| 测试覆盖率 | > 80% | 自动化检查 |
| 错误率 | < 1% | 错误日志 |
| 系统可用性 | > 99.9% | 健康检查 |

---

## 📋 开发检查清单

### ✅ 开发前
- [ ] 阅读 `PROJECT-DEVELOPMENT-STANDARDS.md`
- [ ] 确认功能归属（用户端 vs 管理端）
- [ ] 创建功能分支
- [ ] 配置开发环境

### ✅ 开发中
- [ ] 遵循命名规范
- [ ] 严格类型检查
- [ ] 编写单元测试
- [ ] 功能边界检查

### ✅ 提交前
- [ ] ESLint检查通过
- [ ] TypeScript检查通过
- [ ] 测试用例通过
- [ ] 代码审查完成

---

## 🆘 紧急问题处理

### 🔥 功能边界混淆
**立即停止开发！** 重新确认功能归属

### 🔥 权限控制问题
**立即升级！** 联系架构师确认

### 🔥 数据安全问题
**立即升级！** 联系安全团队处理

---

**📞 需要帮助？查看完整文档：**
- [PROJECT-DEVELOPMENT-STANDARDS.md](./PROJECT-DEVELOPMENT-STANDARDS.md) - 完整开发规范
- [DETAILED-SYSTEM-DESIGN-SPECIFICATION.md](./DETAILED-SYSTEM-DESIGN-SPECIFICATION.md) - 系统设计
- [AI-MODEL-MANAGER-SPECIFICATION.md](./AI-MODEL-MANAGER-SPECIFICATION.md) - AI模型管理器规范

**🎯 记住：AI大模型管理器是管理端专属功能，严禁在用户端出现！** 