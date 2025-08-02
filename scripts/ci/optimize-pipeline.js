#!/usr/bin/env node

/**
 * CI/CD 流程优化器
 * 解决与 Claude Code、Gemini CLI 等开发工具的兼容性问题
 * 
 * @author ZK-Agent Team
 * @version 1.0.0
 * @date 2025-07-22
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const chalk = require('chalk');

/**
 * CI/CD 流程优化器类
 */
class PipelineOptimizer {
    constructor(options = {}) {
        this.options = {
            projectRoot: options.projectRoot || process.cwd(),
            workflowsDir: options.workflowsDir || '.github/workflows',
            backupDir: options.backupDir || '.github/workflows/backup',
            maxTokenLimit: options.maxTokenLimit || 1000000,
            enableChunking: options.enableChunking !== false,
            enableCaching: options.enableCaching !== false,
            enableParallel: options.enableParallel !== false,
            ...options
        };
        
        this.optimizations = {
            applied: [],
            skipped: [],
            errors: []
        };
    }
    
    /**
     * 获取所有工作流文件
     * @returns {Array<string>} 工作流文件路径数组
     */
    getWorkflowFiles() {
        const workflowsPath = path.join(this.options.projectRoot, this.options.workflowsDir);
        
        if (!fs.existsSync(workflowsPath)) {
            console.log(chalk.yellow(`⚠️  工作流目录不存在: ${workflowsPath}`));
            return [];
        }
        
        return fs.readdirSync(workflowsPath)
            .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'))
            .map(file => path.join(workflowsPath, file));
    }
    
    /**
     * 备份工作流文件
     * @param {string} filePath - 文件路径
     */
    backupWorkflow(filePath) {
        try {
            const backupPath = path.join(this.options.projectRoot, this.options.backupDir);
            if (!fs.existsSync(backupPath)) {
                fs.mkdirSync(backupPath, { recursive: true });
            }
            
            const fileName = path.basename(filePath);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(backupPath, `${fileName}.${timestamp}.backup`);
            
            fs.copyFileSync(filePath, backupFile);
            console.log(chalk.gray(`📋 已备份: ${fileName} -> ${path.basename(backupFile)}`));
        } catch (error) {
            console.error(chalk.red(`❌ 备份失败: ${error.message}`));
        }
    }
    
    /**
     * 优化代码质量工具工作流
     * @param {Object} workflow - 工作流配置
     * @returns {Object} 优化后的工作流配置
     */
    optimizeCodeQualityWorkflow(workflow) {
        console.log(chalk.blue('🔧 优化代码质量工具工作流...'));
        
        if (!workflow.jobs) {
            workflow.jobs = {};
        }
        
        // 添加智能分块处理步骤
        if (this.options.enableChunking) {
            const chunkingStep = {
                name: '智能分块处理',
                run: [
                  '# 安装智能分块工具',
                  'npm install -g js-yaml',
                  '',
                  '# 运行智能分块处理',
                  'node scripts/tools/intelligent-chunking.js ./src --max-tokens 800000 --output reports/chunks.json',
                  '',
                  '# 检查分块结果',
                  'if [ -f reports/chunks.json ]; then',
                  '  echo "✅ 智能分块处理完成"',
                  '  cat reports/chunks.json | jq \'.metadata.stats\'',
                  'else',
                  '  echo "❌ 智能分块处理失败"',
                  '  exit 1',
                  'fi'
                ].join('\n')
            };
            
            // 在代码质量分析任务中添加分块步骤
            Object.keys(workflow.jobs).forEach(jobKey => {
                const job = workflow.jobs[jobKey];
                if (job.name && job.name.includes('质量') || jobKey.includes('quality')) {
                    if (!job.steps) job.steps = [];
                    
                    // 在依赖安装后添加分块步骤
                    const installIndex = job.steps.findIndex(step => 
                        step.name && (step.name.includes('安装') || step.name.includes('Install'))
                    );
                    
                    if (installIndex !== -1) {
                        job.steps.splice(installIndex + 1, 0, chunkingStep);
                        this.optimizations.applied.push('添加智能分块处理步骤');
                    }
                }
            });
        }
        
        // 优化缓存策略
        if (this.options.enableCaching) {
            Object.keys(workflow.jobs).forEach(jobKey => {
                const job = workflow.jobs[jobKey];
                if (!job.steps) return;
                
                // 添加增强的缓存步骤
                const cacheStep = {
                    name: '缓存依赖和工具',
                    uses: 'actions/cache@v3',
                    with: {
                        path: [
                          '~/.npm',
                          '~/.cache',
                          'node_modules',
                          '.next/cache',
                          'reports/cache'
                        ].join('\n'),
                        key: "${{ runner.os }}-deps-${{ hashFiles('**/package-lock.json', '**/yarn.lock') }}-${{ hashFiles('scripts/**/*.js') }}",
                        'restore-keys': [
                          "${{ runner.os }}-deps-${{ hashFiles('**/package-lock.json', '**/yarn.lock') }}-",
                          "${{ runner.os }}-deps-"
                        ].join('\n')
                    }
                };
                
                // 在 checkout 后添加缓存步骤
                const checkoutIndex = job.steps.findIndex(step => 
                    step.uses && step.uses.includes('checkout')
                );
                
                if (checkoutIndex !== -1) {
                    job.steps.splice(checkoutIndex + 1, 0, cacheStep);
                    this.optimizations.applied.push(`为 ${jobKey} 添加增强缓存`);
                }
            });
        }
        
        // 添加 token 限制检查
        const tokenCheckStep = {
            name: 'Token 限制检查',
            run: [
              'echo "🔍 检查 token 使用情况..."',
              '',
              '# 检查文件大小和复杂度',
              'find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | \\',
              '  head -20 | \\',
              '  xargs wc -l | \\',
              '  sort -nr | \\',
              '  head -10',
              '',
              '# 检查是否有超大文件',
              'find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | \\',
              '  xargs ls -la | \\',
              '  awk \'$5 > 100000 {print "⚠️  大文件:", $9, "(" $5 " bytes)"}\''
              ,
              '# 运行智能分块检查',
              'if [ -f scripts/tools/intelligent-chunking.js ]; then',
              '  node scripts/tools/intelligent-chunking.js ./src --max-tokens 1000000 --output /tmp/token-check.json',
              '  if [ -f /tmp/token-check.json ]; then',
              '    echo "✅ Token 检查完成"',
              '    cat /tmp/token-check.json | jq \'.metadata.stats\'',
              '  fi',
              'fi'
            ].join('\n')
        };
        
        // 在所有质量检查任务中添加 token 检查
        Object.keys(workflow.jobs).forEach(jobKey => {
            const job = workflow.jobs[jobKey];
            if (job.name && (job.name.includes('质量') || job.name.includes('quality'))) {
                if (!job.steps) job.steps = [];
                job.steps.push(tokenCheckStep);
                this.optimizations.applied.push(`为 ${jobKey} 添加 token 限制检查`);
            }
        });
        
        return workflow;
    }
    
    /**
     * 优化 CI/CD 主流水线
     * @param {Object} workflow - 工作流配置
     * @returns {Object} 优化后的工作流配置
     */
    optimizeMainPipeline(workflow) {
        console.log(chalk.blue('🔧 优化主 CI/CD 流水线...'));
        
        // 添加环境兼容性检查
        const compatibilityJob = {
            name: '环境兼容性检查',
            'runs-on': 'ubuntu-latest',
            steps: [
                {
                    name: '检出代码',
                    uses: 'actions/checkout@v4'
                },
                {
                    name: '设置 Node.js',
                    uses: 'actions/setup-node@v4',
                    with: {
                        'node-version': '18',
                        cache: 'npm'
                    }
                },
                {
                    name: '安装依赖',
                    run: 'npm ci'
                },
                {
                    name: '运行环境兼容性检查',
                    run: [
                      'echo "🔍 检查开发环境兼容性..."',
                      '',
                      '# 运行环境兼容性检查器',
                      'node scripts/tools/environment-compatibility-checker.js',
                      '',
                      '# 检查 Claude Code 兼容性',
                      'echo "🤖 检查 Claude Code 兼容性..."',
                      'if command -v claude &> /dev/null; then',
                      '  echo "✅ Claude CLI 已安装"',
                      '  claude --version || echo "⚠️  Claude CLI 版本检查失败"',
                      'else',
                      '  echo "ℹ️  Claude CLI 未安装（可选）"',
                      'fi',
                      '',
                      '# 检查 Gemini CLI 兼容性',
                      'echo "🔮 检查 Gemini CLI 兼容性..."',
                      'if command -v gemini &> /dev/null; then',
                      '  echo "✅ Gemini CLI 已安装"',
                      '  gemini --version || echo "⚠️  Gemini CLI 版本检查失败"',
                      'else',
                      '  echo "ℹ️  Gemini CLI 未安装（可选）"',
                      'fi',
                      '',
                      '# 检查项目配置',
                      'echo "⚙️  检查项目配置..."',
                      'if [ -f package.json ]; then',
                      '  echo "✅ package.json 存在"',
                      '  npm run tools:status || echo "⚠️  工具状态检查失败"',
                      'fi',
                      '',
                      'echo "✅ 环境兼容性检查完成"'
                    ].join('\n')
                },
                {
                    name: '上传兼容性报告',
                    uses: 'actions/upload-artifact@v3',
                    if: 'always()',
                    with: {
                        name: 'compatibility-report',
                        path: 'reports/environment-compatibility.json'
                    }
                }
            ]
        };
        
        // 添加兼容性检查任务
        if (!workflow.jobs) workflow.jobs = {};
        workflow.jobs['compatibility-check'] = compatibilityJob;
        
        // 让其他任务依赖兼容性检查
        Object.keys(workflow.jobs).forEach(jobKey => {
            if (jobKey !== 'compatibility-check') {
                const job = workflow.jobs[jobKey];
                if (!job.needs) {
                    job.needs = ['compatibility-check'];
                } else if (Array.isArray(job.needs)) {
                    if (!job.needs.includes('compatibility-check')) {
                        job.needs.unshift('compatibility-check');
                    }
                } else if (typeof job.needs === 'string') {
                    job.needs = ['compatibility-check', job.needs];
                }
            }
        });
        
        this.optimizations.applied.push('添加环境兼容性检查任务');
        
        // 优化并行执行
        if (this.options.enableParallel) {
            // 识别可以并行执行的任务
            const parallelizableJobs = ['quality-check', 'security-scan', 'test'];
            parallelizableJobs.forEach(jobKey => {
                if (workflow.jobs[jobKey]) {
                    const job = workflow.jobs[jobKey];
                    if (job.needs && job.needs.includes('compatibility-check')) {
                        job.needs = ['compatibility-check']; // 只依赖兼容性检查
                    }
                }
            });
            
            this.optimizations.applied.push('优化任务并行执行');
        }
        
        return workflow;
    }
    
    /**
     * 添加错误处理和重试机制
     * @param {Object} workflow - 工作流配置
     * @returns {Object} 优化后的工作流配置
     */
    addErrorHandling(workflow) {
        console.log(chalk.blue('🔧 添加错误处理和重试机制...'));
        
        Object.keys(workflow.jobs).forEach(jobKey => {
            const job = workflow.jobs[jobKey];
            if (!job.steps) return;
            
            // 为关键步骤添加重试机制
            job.steps.forEach(step => {
                if (step.name && (
                    step.name.includes('安装') || 
                    step.name.includes('Install') ||
                    step.name.includes('测试') ||
                    step.name.includes('Test') ||
                    step.name.includes('构建') ||
                    step.name.includes('Build')
                )) {
                    if (!step.uses) {
                        // 为 run 步骤添加重试逻辑
                        const originalRun = step.run;
                        step.run = [
                          'set +e',
                          'for i in {1..3}; do',
                          '  echo "🔄 尝试第 $i 次..."',
                          `  ${originalRun}`,
                          '  if [ $? -eq 0 ]; then',
                          '    echo "✅ 成功"',
                          '    break',
                          '  else',
                          '    echo "❌ 失败，等待重试..."',
                          '    sleep $((i * 5))',
                          '  fi',
                          'done',
                          'set -e'
                        ].join('\n');
                    }
                }
            });
            
            // 添加失败时的诊断步骤
            const diagnosticStep = {
                name: '失败诊断',
                if: 'failure()',
                run: [
                  'echo "🔍 收集失败诊断信息..."',
                  '',
                  '# 系统信息',
                  'echo "📊 系统信息:"',
                  'uname -a',
                  'df -h',
                  'free -h',
                  '',
                  '# Node.js 环境',
                  'echo "📦 Node.js 环境:"',
                  'node --version',
                  'npm --version',
                  'npm config list',
                  '',
                  '# 项目状态',
                  'echo "📁 项目状态:"',
                  'ls -la',
                  'if [ -f package.json ]; then',
                  '  echo "📄 package.json 存在"',
                  '  cat package.json | jq \'.scripts\' || echo "无法解析 scripts"',
                  'fi',
                  '',
                  '# 日志文件',
                  'echo "📋 查找日志文件:"',
                  'find . -name "*.log" -type f -exec echo "发现日志: {}" \\; -exec tail -20 {} \\;',
                  '',
                  '# 错误报告',
                  'echo "📊 生成错误报告..."',
                  'mkdir -p reports/diagnostics',
                  'echo "$(date): CI/CD 流程失败" > reports/diagnostics/failure-$(date +%Y%m%d-%H%M%S).log'
                ].join('\n')
            };
            
            job.steps.push(diagnosticStep);
        });
        
        this.optimizations.applied.push('添加错误处理和重试机制');
        return workflow;
    }
    
    /**
     * 优化单个工作流文件
     * @param {string} filePath - 工作流文件路径
     */
    optimizeWorkflow(filePath) {
        try {
            console.log(chalk.blue(`\n🔧 优化工作流: ${path.basename(filePath)}`));
            
            // 备份原文件
            this.backupWorkflow(filePath);
            
            // 读取工作流配置
            const content = fs.readFileSync(filePath, 'utf8');
            let workflow = yaml.load(content);
            
            if (!workflow) {
                console.log(chalk.yellow(`⚠️  跳过空工作流: ${path.basename(filePath)}`));
                this.optimizations.skipped.push(path.basename(filePath));
                return;
            }
            
            // 根据文件名应用不同的优化策略
            const fileName = path.basename(filePath);
            
            if (fileName.includes('code-quality')) {
                workflow = this.optimizeCodeQualityWorkflow(workflow);
            } else if (fileName.includes('ci-cd') || fileName.includes('pipeline')) {
                workflow = this.optimizeMainPipeline(workflow);
            }
            
            // 通用优化
            workflow = this.addErrorHandling(workflow);
            
            // 添加优化标记
            if (!workflow.env) workflow.env = {};
            workflow.env.OPTIMIZED_BY = 'ZK-Agent Pipeline Optimizer';
            workflow.env.OPTIMIZED_AT = new Date().toISOString();
            workflow.env.TOKEN_LIMIT_AWARE = 'true';
            
            // 写回文件
            const optimizedContent = yaml.dump(workflow, {
                indent: 2,
                lineWidth: 120,
                noRefs: true
            });
            
            fs.writeFileSync(filePath, optimizedContent);
            console.log(chalk.green(`✅ 优化完成: ${path.basename(filePath)}`));
            
        } catch (error) {
            console.error(chalk.red(`❌ 优化失败: ${path.basename(filePath)} - ${error.message}`));
            this.optimizations.errors.push({
                file: path.basename(filePath),
                error: error.message
            });
        }
    }
    
    /**
     * 执行优化
     */
    optimize() {
        console.log(chalk.blue('🚀 开始 CI/CD 流程优化...'));
        console.log(chalk.gray(`📁 项目根目录: ${this.options.projectRoot}`));
        
        const workflowFiles = this.getWorkflowFiles();
        
        if (workflowFiles.length === 0) {
            console.log(chalk.yellow('⚠️  未找到工作流文件'));
            return;
        }
        
        console.log(chalk.blue(`📄 发现 ${workflowFiles.length} 个工作流文件`));
        
        // 优化每个工作流文件
        workflowFiles.forEach(file => {
            this.optimizeWorkflow(file);
        });
        
        // 输出优化结果
        this.printOptimizationSummary();
    }
    
    /**
     * 打印优化摘要
     */
    printOptimizationSummary() {
        console.log(chalk.green('\n🎉 CI/CD 流程优化完成!'));
        console.log(chalk.blue('📊 优化摘要:'));
        
        if (this.optimizations.applied.length > 0) {
            console.log(chalk.green('\n✅ 已应用的优化:'));
            this.optimizations.applied.forEach(opt => {
                console.log(chalk.green(`   • ${opt}`));
            });
        }
        
        if (this.optimizations.skipped.length > 0) {
            console.log(chalk.yellow('\n⏭️  跳过的文件:'));
            this.optimizations.skipped.forEach(file => {
                console.log(chalk.yellow(`   • ${file}`));
            });
        }
        
        if (this.optimizations.errors.length > 0) {
            console.log(chalk.red('\n❌ 优化错误:'));
            this.optimizations.errors.forEach(error => {
                console.log(chalk.red(`   • ${error.file}: ${error.error}`));
            });
        }
        
        console.log(chalk.blue('\n📋 后续建议:'));
        console.log('   • 测试优化后的工作流');
        console.log('   • 监控 token 使用情况');
        console.log('   • 定期运行兼容性检查');
        console.log('   • 查看备份文件以便回滚');
    }
}

/**
 * 命令行接口
 */
function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(chalk.blue('🔧 CI/CD 流程优化器'));
        console.log('\n用法:');
        console.log('  node optimize-pipeline.js [选项]');
        console.log('\n选项:');
        console.log('  --project-root <路径>    项目根目录 (默认: 当前目录)');
        console.log('  --max-token-limit <数量> 最大 token 限制 (默认: 1000000)');
        console.log('  --no-chunking           禁用智能分块');
        console.log('  --no-caching            禁用缓存优化');
        console.log('  --no-parallel           禁用并行优化');
        console.log('  --help, -h              显示帮助信息');
        console.log('\n示例:');
        console.log('  node optimize-pipeline.js --max-token-limit 500000');
        return;
    }
    
    const options = {};
    
    // 解析命令行参数
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        switch (arg) {
            case '--project-root':
                options.projectRoot = args[++i];
                break;
            case '--max-token-limit':
                options.maxTokenLimit = parseInt(args[++i]);
                break;
            case '--no-chunking':
                options.enableChunking = false;
                break;
            case '--no-caching':
                options.enableCaching = false;
                break;
            case '--no-parallel':
                options.enableParallel = false;
                break;
        }
    }
    
    // 创建优化器并执行
    const optimizer = new PipelineOptimizer(options);
    optimizer.optimize();
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = PipelineOptimizer;