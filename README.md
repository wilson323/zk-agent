# 多智能体系统完整实现

## 项目简介

这是一个生产级别的多智能体系统实现，结合了AutoGen、CrewAI和LangGraph三大主流框架的最佳实践。该系统提供了统一的智能体管理接口，支持多种类型的智能体协作和复杂任务编排。

## 🚀 主要特性

### 核心功能
- **多框架集成**: 支持AutoGen、CrewAI、LangGraph三种智能体框架
- **统一管理**: 提供统一的智能体注册、管理和协调接口
- **异步处理**: 全异步架构，支持高并发消息处理
- **角色扮演**: 支持CrewAI风格的角色扮演智能体
- **工作流编排**: 基于LangGraph的复杂工作流管理
- **消息系统**: 完整的消息传递和广播机制
- **协作任务**: 支持多智能体协作执行复杂任务

### 技术特性
- **类型安全**: 使用Python类型注解和Pydantic数据验证
- **日志记录**: 完整的日志系统和对话记录
- **错误处理**: 健壮的异常处理和错误恢复机制
- **状态管理**: 智能体状态跟踪和系统状态监控
- **可扩展性**: 模块化设计，易于扩展新的智能体类型

## 📋 系统要求

- Python 3.8+
- 支持的操作系统: Windows, macOS, Linux
- 内存: 建议4GB以上
- 存储: 至少1GB可用空间

## 🤖 AI助手开发规范

本项目提供了专门的AI助手开发规则，确保代码质量和开发效率：

### 规则文件
- **完整版规则**: [`optimized_user_rules.md`](./optimized_user_rules.md) - 详细的开发规范和最佳实践
- **项目内规则**: [`.trae/rules/enhanced_user_rules.md`](./.trae/rules/enhanced_user_rules.md) - 项目特定规则
- **Trae配置版**: [`user_rules_for_trae.md`](./user_rules_for_trae.md) - 适用于Trae IDE的简化规则

### 核心要求
1. **MCP工具强制使用**: 每次开发前必须使用Serena、Mentor等MCP工具进行分析
2. **开源优先原则**: 优先使用成熟的开源解决方案，避免重复造轮子
3. **零重复代码**: 严格控制代码重复率，开发前必须检查现有实现
4. **架构一致性**: 遵循统一的配置管理、组件开发和类型定义规范
5. **质量门禁**: 70%+测试覆盖率，TypeScript严格模式，性能要求达标

### 使用方法
将 `user_rules_for_trae.md` 复制到你的Trae配置目录：
```bash
# Windows
copy user_rules_for_trae.md C:\Users\%USERNAME%\.trae\user_rules.md

# macOS/Linux  
cp user_rules_for_trae.md ~/.trae/user_rules.md
```

## 🛠️ 安装指南

### 1. 克隆项目
```bash
git clone <repository-url>
cd multi-agent-system
```

### 2. 创建虚拟环境
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 3. 安装依赖
```bash
pip install -r requirements.txt
```

### 4. 环境配置
创建 `.env` 文件并配置必要的环境变量：
```env
# AI模型API密钥
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
COHERE_API_KEY=your_cohere_api_key

# 日志级别
LOG_LEVEL=INFO

# 数据库配置（可选）
DATABASE_URL=sqlite:///./agents.db

# Redis配置（可选）
REDIS_URL=redis://localhost:6379
```

## 🎯 快速开始

### 运行演示程序
```bash
python multi_agent_system_complete_example.py
```

### 基本使用示例

```python
import asyncio
from multi_agent_system_complete_example import (
    MultiAgentSystem, AutoGenAgent, CrewAIAgent, LangGraphAgent,
    AgentConfig, AgentType
)

async def main():
    # 创建多智能体系统
    system = MultiAgentSystem()
    
    # 创建AutoGen智能体
    autogen_config = AgentConfig(
        name="分析师",
        agent_type=AgentType.AUTOGEN,
        role="数据分析专家",
        system_prompt="你是一个专业的数据分析师"
    )
    analyst = AutoGenAgent(autogen_config)
    system.register_agent(analyst)
    
    # 创建CrewAI智能体
    crewai_config = AgentConfig(
        name="评审员",
        agent_type=AgentType.CREWAI,
        role="质量评审专家",
        system_prompt="你是一个严格的质量评审专家"
    )
    reviewer = CrewAIAgent(crewai_config)
    system.register_agent(reviewer)
    
    # 智能体间对话
    response = await system.send_message(
        analyst.id, 
        reviewer.id, 
        "请评审这份数据分析报告"
    )
    
    print(f"响应: {response.content}")
    
    # 执行协作任务
    result = await system.execute_collaborative_task(
        "分析用户行为数据并生成报告"
    )
    
    print(f"协作结果: {result['summary']}")

if __name__ == "__main__":
    asyncio.run(main())
```

## 🏗️ 架构设计

### 系统架构图
```
┌─────────────────────────────────────────────────────────┐
│                多智能体系统管理器                          │
│                MultiAgentSystem                        │
├─────────────────────────────────────────────────────────┤
│  消息队列  │  状态管理  │  任务调度  │  日志记录  │  监控   │
├─────────────────────────────────────────────────────────┤
│                    智能体基类                            │
│                   BaseAgent                            │
├─────────────┬─────────────────┬─────────────────────────┤
│ AutoGen智能体 │   CrewAI智能体   │   LangGraph智能体        │
│AutoGenAgent │  CrewAIAgent   │   LangGraphAgent       │
├─────────────┼─────────────────┼─────────────────────────┤
│  对话处理    │    角色扮演      │     工作流编排           │
│  任务执行    │    任务协作      │     状态管理             │
│  多轮对话    │    专业领域      │     复杂逻辑             │
└─────────────┴─────────────────┴─────────────────────────┘
```

### 核心组件

#### 1. 智能体基类 (BaseAgent)
- 定义所有智能体的通用接口
- 消息处理和任务执行的抽象方法
- 状态管理和历史记录功能

#### 2. AutoGen智能体 (AutoGenAgent)
- 基于AutoGen框架的对话式智能体
- 支持多轮对话和复杂推理
- 适用于需要深度交互的场景

#### 3. CrewAI智能体 (CrewAIAgent)
- 基于CrewAI框架的角色扮演智能体
- 专注于特定角色和专业领域
- 支持团队协作和任务分工

#### 4. LangGraph智能体 (LangGraphAgent)
- 基于LangGraph的工作流智能体
- 支持复杂的状态管理和流程控制
- 适用于需要精确控制执行流程的场景

#### 5. 系统管理器 (MultiAgentSystem)
- 智能体注册和管理
- 消息路由和广播
- 协作任务编排
- 系统监控和日志

## 📚 详细文档

### 智能体配置

```python
from multi_agent_system_complete_example import AgentConfig, AgentType

# 基础配置
config = AgentConfig(
    name="智能体名称",
    agent_type=AgentType.AUTOGEN,  # 或 CREWAI, LANGGRAPH
    role="角色描述",
    model="gpt-4",  # AI模型
    temperature=0.7,  # 创造性参数
    max_tokens=2000,  # 最大输出长度
    system_prompt="系统提示词",
    tools=["tool1", "tool2"],  # 可用工具
    metadata={"key": "value"}  # 额外配置
)
```

### 消息系统

```python
# 点对点消息
response = await system.send_message(
    sender_id="agent1",
    receiver_id="agent2",
    content="消息内容"
)

# 广播消息
responses = await system.broadcast_message(
    sender_id="agent1",
    content="广播内容"
)
```

### 协作任务

```python
# 执行协作任务
result = await system.execute_collaborative_task(
    "任务描述：开发一个Web应用"
)

# 结果包含:
# - task_id: 任务ID
# - individual_results: 各智能体的执行结果
# - summary: 汇总报告
# - timestamp: 执行时间
```

### 状态监控

```python
# 获取系统状态
status = system.get_system_status()

# 状态信息包含:
# - 系统总体状态
# - 智能体数量和状态
# - 对话记录数量
# - 各智能体详细信息
```

## 🔧 高级配置

### 自定义智能体

```python
from multi_agent_system_complete_example import BaseAgent, AgentConfig

class CustomAgent(BaseAgent):
    async def process_message(self, message):
        # 自定义消息处理逻辑
        pass
    
    async def execute_task(self, task):
        # 自定义任务执行逻辑
        pass

# 使用自定义智能体
custom_config = AgentConfig(
    name="自定义智能体",
    agent_type=AgentType.CUSTOM,
    role="专业角色"
)
custom_agent = CustomAgent(custom_config)
system.register_agent(custom_agent)
```

### 工作流定义

```python
# LangGraph工作流示例
workflow_task = {
    "workflow_type": "sequential",
    "steps": [
        "数据收集",
        "数据清洗",
        "数据分析",
        "报告生成"
    ],
    "initial_state": {"data_source": "database"}
}

result = await langgraph_agent.execute_task(workflow_task)
```

## 🧪 测试

### 运行测试
```bash
# 运行所有测试
pytest

# 运行特定测试
pytest tests/test_agents.py

# 生成覆盖率报告
pytest --cov=multi_agent_system_complete_example
```

### 测试示例
```python
import pytest
from multi_agent_system_complete_example import MultiAgentSystem, AutoGenAgent

@pytest.mark.asyncio
async def test_agent_communication():
    system = MultiAgentSystem()
    
    # 创建测试智能体
    config = AgentConfig(name="测试智能体", agent_type=AgentType.AUTOGEN, role="测试")
    agent = AutoGenAgent(config)
    system.register_agent(agent)
    
    # 测试消息处理
    message = Message(content="测试消息")
    response = await agent.process_message(message)
    
    assert response is not None
    assert response.content != ""
```

## 📊 性能优化

### 并发处理
- 使用异步编程模型，支持高并发
- 智能体状态管理，避免资源冲突
- 消息队列机制，确保消息有序处理

### 内存管理
- 消息历史自动清理机制
- 智能体状态持久化选项
- 大文件处理优化

### 监控指标
- 智能体响应时间
- 消息处理吞吐量
- 系统资源使用情况
- 错误率和成功率

## 🔒 安全考虑

### 输入验证
- 所有输入数据使用Pydantic验证
- 防止注入攻击和恶意输入
- 消息内容过滤和清理

### 权限控制
- 智能体权限分级管理
- API访问控制
- 敏感信息保护

### 数据保护
- 对话记录加密存储
- 个人信息脱敏处理
- 符合数据保护法规

## 🚀 部署指南

### Docker部署
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["python", "multi_agent_system_complete_example.py"]
```

### Kubernetes部署
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: multi-agent-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: multi-agent-system
  template:
    metadata:
      labels:
        app: multi-agent-system
    spec:
      containers:
      - name: multi-agent-system
        image: multi-agent-system:latest
        ports:
        - containerPort: 8000
```

## 🤝 贡献指南

### 开发环境设置
1. Fork项目仓库
2. 创建功能分支
3. 安装开发依赖：`pip install -r requirements-dev.txt`
4. 运行预提交钩子：`pre-commit install`

### 代码规范
- 使用Black进行代码格式化
- 遵循PEP 8编码规范
- 添加类型注解
- 编写完整的文档字符串
- 保持测试覆盖率>90%

### 提交流程
1. 编写测试用例
2. 确保所有测试通过
3. 更新文档
4. 提交Pull Request

## 📝 更新日志

### v1.0.0 (2025-01-27)
- 初始版本发布
- 支持AutoGen、CrewAI、LangGraph三种智能体
- 完整的消息系统和协作机制
- 异步处理和状态管理
- 完善的文档和示例

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🆘 支持与帮助

### 常见问题

**Q: 如何添加新的AI模型支持？**
A: 在智能体配置中修改`model`参数，并确保相应的API密钥已配置。

**Q: 系统支持多少个智能体？**
A: 理论上没有限制，但建议根据硬件资源合理配置，通常10-50个智能体可以良好运行。

**Q: 如何处理智能体执行错误？**
A: 系统内置错误处理机制，智能体状态会自动切换到ERROR状态，可通过日志查看详细错误信息。

### 联系方式
- 项目主页: [GitHub Repository]
- 问题反馈: [GitHub Issues]
- 邮箱: support@zk-agent.com
- 文档: [在线文档]

### 社区
- 微信群: 扫描二维码加入
- QQ群: 123456789
- Discord: [邀请链接]
- 论坛: [社区论坛]

---

**感谢使用多智能体系统！如果这个项目对您有帮助，请给我们一个⭐️**