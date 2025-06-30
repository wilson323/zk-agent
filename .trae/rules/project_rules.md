# 智能体工具使用指南

## AI导师工具 (mcp.config.usrlocalmcp.mentor)
### 功能说明
- 获取第二意见: `second_opinion(user_request: str) -> str`
  - 用途：针对用户请求获取AI的第二种解决方案
  - 参数：user_request为用户请求文本
  - 返回：替代性解决方案的详细描述

- 代码审查: 
  ```python
  code_review(file_path: str, language: str) -> dict
  # 或
  code_review(code_snippet: str, language: str) -> dict
  ```
  - 用途：对代码进行质量审查
  - 参数：
    - file_path: 代码文件路径
    - code_snippet: 代码片段
    - language: 编程语言(如'python','java','javascript'等)
  - 返回：包含代码质量评估、问题清单和改进建议的字典

- 设计评估: `design_critique(design_document: str, design_type: str) -> dict`
  - 用途：评估系统设计方案
  - 参数：
    - design_document: 设计文档内容
    - design_type: 设计类型('architecture', 'database', 'api'等)
  - 返回：设计评估报告

- 写作反馈: `writing_feedback(text: str, writing_type: str) -> dict`
  - 用途：提供写作建议和改进意见
  - 参数：
    - text: 待评估文本
    - writing_type: 写作类型('technical', 'blog', 'academic'等)
  - 返回：写作评估和建议

- 创意增强: `brainstorm_enhancements(concept: str) -> list`
  - 用途：扩展和增强创意概念
  - 参数：concept为初始创意概念
  - 返回：创意增强建议列表

### 使用规则
1. 所有输入文本需要清晰完整，避免歧义
2. 代码审查时应提供完整的上下文
3. 设计评估需要包含足够的细节信息
4. 写作反馈建议提供写作目标和受众信息

## 文档转换工具 (mcp.config.usrlocalmcp.Pandoc)
### 功能说明
- 格式转换: `convert-contents(contents: str, input_format: str, output_format: str, output_file: str) -> bool`
  - 用途：在不同文档格式间转换
  - 参数：
    - contents: 源文档内容
    - input_format: 输入格式
    - output_format: 输出格式
    - output_file: 输出文件路径
  - 支持格式：txt, html, markdown, pdf, docx, rst, latex, epub
  
### 使用规则
1. 确保输入文档格式正确
2. 转换前备份原始文件
3. 检查输出路径是否有写入权限
4. 大文件转换建议分批处理

## 任务管理工具 (mcp.config.usrlocalmcp.TaskManager)
### 功能说明
- 请求规划: `request_planning() -> dict`
  - 用途：创建新的任务规划
  - 返回：任务计划详情

- 任务操作: 
  - `get_next_task() -> dict`：获取下一个待执行任务
  - `mark_task_done(task_id: str) -> bool`：标记任务完成
  - `approve_task_completion(task_id: str) -> bool`：确认任务完成
  - `approve_request_completion(request_id: str) -> bool`：确认请求完成
  - `open_task_details(task_id: str) -> dict`：查看任务详情
  - `list_requests() -> list`：列出所有请求
  - `add_tasks_to_request(request_id: str, tasks: list) -> bool`：添加任务到请求
  - `update_task(task_id: str, updates: dict) -> bool`：更新任务信息
  - `delete_task(task_id: str) -> bool`：删除任务

### 使用规则
1. 任务状态变更需要权限验证
2. 删除操作需要二次确认
3. 任务更新需要保持数据一致性
4. 批量操作建议使用事务

## Excel操作工具 (mcp.config.usrlocalmcp.Excel)
### 功能说明
- 工作表操作:
  - `excel_copy_sheet(source_file: str, target_file: str, sheet_name: str) -> bool`：复制工作表
  - `excel_create_table(file_path: str, data: list, sheet_name: str) -> bool`：创建表格
  - `excel_describe_sheets(file_path: str) -> dict`：描述工作表结构
  - `excel_read_sheet(file_path: str, sheet_name: str) -> list`：读取工作表
  - `excel_screen_capture(file_path: str, sheet_name: str) -> str`：工作表截图(仅Windows)
  - `excel_write_to_sheet(file_path: str, data: list, sheet_name: str) -> bool`：写入工作表

### 使用规则
1. 操作前检查文件是否被占用
2. 大数据量操作建议分批处理
3. 保存前自动备份
4. 注意数据类型匹配

## 网络获取工具 (mcp.config.usrlocalmcp.Fetch)
### 功能说明
- 获取网页: `fetch(url: str, max_length: int = 5000, start_index: int = 0, raw: bool = False) -> str`
  - 用途：获取网页内容
  - 参数：
    - url: 网页地址
    - max_length: 最大获取长度
    - start_index: 开始位置
    - raw: 是否返回原始HTML
  
### 使用规则
1. 遵守网站robots.txt规则
2. 实现请求间隔和重试机制
3. 处理网络超时异常
4. 注意内容编码处理

## 序列思维工具 (mcp.config.usrlocalmcp.sequential-thinking)
### 功能说明
- 思维处理:
  - `process_thought(thought: str) -> dict`：处理思维内容
  - `generate_summary(thoughts: list) -> str`：生成思维总结
  - `clear_history() -> bool`：清除历史记录
  - `export_session(file_path: str) -> bool`：导出会话
  - `import_session(file_path: str) -> bool`：导入会话

### 使用规则
1. 定期导出重要会话
2. 清理历史前确认备份
3. 导入会话检查格式兼容性
4. 维护会话上下文完整性

## AWS知识库检索 (mcp.config.usrlocalmcp.aws-kb-retrieval)
### 功能说明
- 检索知识: `retrieve_from_aws_kb(query: str, knowledgeBaseId: str, n: int) -> list`
  - 用途：从AWS知识库检索信息
  - 参数：
    - query: 检索查询
    - knowledgeBaseId: 知识库ID
    - n: 返回结果数量

### 使用规则
1. 优化查询关键词
2. 控制并发请求数
3. 处理API限流
4. 缓存常用查询结果

## Context7文档工具 (mcp.config.usrlocalmcp.context7)
### 功能说明
- 文档操作:
  - `resolve-library-id(name: str) -> str`：解析库ID
  - `get-library-docs(library_id: str) -> list`：获取库文档

### 使用规则
1. 验证库访问权限
2. 实现文档缓存机制
3. 处理大型文档集合
4. 监控API使用配额

## 知识图谱内存工具 (mcp.config.usrlocalmcp.memory)
### 功能说明
- 图谱操作:
  - `create_entities(entities: list) -> bool`：创建实体
  - `create_relations(relations: list) -> bool`：创建关系
  - `add_observations(observations: list) -> bool`：添加观察
  - `delete_entities(entity_ids: list) -> bool`：删除实体

### 使用规则
1. 维护实体关系一致性
2. 定期备份图谱数据
3. 实现变更日志记录
4. 控制图谱规模增长
对所有新代码使用 TypeScript
遵循现有的代码样式
使用 ESLint 和 Prettier 进行代码格式化：
npm run lint          # Check code style
npm run lint:fix      # Fix code style issues

每项工作必须要充分使用mcp的工具.