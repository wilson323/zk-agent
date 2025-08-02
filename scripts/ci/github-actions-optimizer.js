#!/usr/bin/env node

/**
 * GitHub Actions CI/CD 流程优化器
 * 
 * 功能说明:
 * - 分析现有 GitHub Actions 工作流
 * - 应用最佳实践优化建议
 * - 生成优化后的工作流配置
 * - 提供性能和成本分析报告
 * 
 * @author ZK-Agent Team
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const chalk = require('chalk');

class GitHubActionsOptimizer {
    /**
     * 构造函数
     * @param {Object} options - 配置选项
     * @param {string} options.workflowsDir - 工作流目录路径
     * @param {boolean} options.verbose - 是否显示详细信息
     * @param {boolean} options.dryRun - 是否为试运行模式
     */
    constructor(options = {}) {
        this.workflowsDir = options.workflowsDir || '.github/workflows';
        this.verbose = options.verbose || false;
        this.dryRun = options.dryRun || false;
        this.optimizations = [];
        this.metrics = {
            totalWorkflows: 0,
            optimizedWorkflows: 0,
            potentialTimeSavings: 0,
            costReduction: 0
        };
    }

    /**
     * 获取所有工作流文件
     * @returns {Array<string>} 工作流文件路径列表
     */
    getWorkflowFiles() {
        try {
            const files = fs.readdirSync(this.workflowsDir)
                .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'))
                .filter(file => !file.includes('backup'))
                .map(file => path.join(this.workflowsDir, file));
            
            this.metrics.totalWorkflows = files.length;
            return files;
        } catch (error) {
            console.error(chalk.red(`❌ 读取工作流目录失败: ${error.message}`));
            return [];
        }
    }

    /**
     * 解析工作流文件
     * @param {string} filePath - 工作流文件路径
     * @returns {Object|null} 解析后的工作流对象
     */
    parseWorkflow(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return yaml.load(content);
        } catch (error) {
            console.error(chalk.red(`❌ 解析工作流文件失败 ${filePath}: ${error.message}`));
            return null;
        }
    }

    /**
     * 优化矩阵策略
     * @param {Object} workflow - 工作流对象
     * @returns {Object} 优化后的工作流
     */
    optimizeMatrixStrategy(workflow) {
        const optimizations = [];
        
        Object.keys(workflow.jobs || {}).forEach(jobKey => {
            const job = workflow.jobs[jobKey];
            
            // 检查是否需要添加矩阵策略
            if (job.steps && !job.strategy && this.shouldAddMatrix(job)) {
                job.strategy = {
                    matrix: {
                        'node-version': ['18.x', '20.x', '22.x'],
                        os: ['ubuntu-latest']
                    },
                    'fail-fast': false
                };
                
                // 更新 runs-on 使用矩阵
                job['runs-on'] = '${{ matrix.os }}';
                
                optimizations.push({
                    type: 'matrix-strategy',
                    job: jobKey,
                    description: '添加多版本兼容性测试矩阵'
                });
            }
        });
        
        this.optimizations.push(...optimizations);
        return workflow;
    }

    /**
     * 判断是否应该添加矩阵策略
     * @param {Object} job - 作业对象
     * @returns {boolean} 是否需要矩阵策略
     */
    shouldAddMatrix(job) {
        const nodeSetupStep = job.steps?.find(step => 
            step.uses && step.uses.includes('setup-node')
        );
        return !!nodeSetupStep;
    }

    /**
     * 优化缓存策略
     * @param {Object} workflow - 工作流对象
     * @returns {Object} 优化后的工作流
     */
    optimizeCaching(workflow) {
        const optimizations = [];
        
        Object.keys(workflow.jobs || {}).forEach(jobKey => {
            const job = workflow.jobs[jobKey];
            
            if (job.steps) {
                const hasNodeSetup = job.steps.some(step => 
                    step.uses && step.uses.includes('setup-node')
                );
                
                const hasCache = job.steps.some(step => 
                    step.uses && step.uses.includes('cache')
                );
                
                if (hasNodeSetup && !hasCache) {
                    // 在 setup-node 之后添加缓存步骤
                    const setupIndex = job.steps.findIndex(step => 
                        step.uses && step.uses.includes('setup-node')
                    );
                    
                    const cacheStep = {
                        name: '缓存依赖',
                        uses: 'actions/cache@v4',
                        with: {
                            path: [
                                '~/.npm',
                                '~/.pnpm-store',
                                'node_modules',
                                '.next/cache'
                            ].join('\n'),
                            key: '${{ runner.os }}-node-${{ hashFiles(\'**/package-lock.json\', \'**/pnpm-lock.yaml\') }}',
                            'restore-keys': '${{ runner.os }}-node-'
                        }
                    };
                    
                    job.steps.splice(setupIndex + 1, 0, cacheStep);
                    
                    optimizations.push({
                        type: 'caching',
                        job: jobKey,
                        description: '添加多层依赖缓存策略'
                    });
                }
            }
        });
        
        this.optimizations.push(...optimizations);
        return workflow;
    }

    /**
     * 优化条件执行
     * @param {Object} workflow - 工作流对象
     * @returns {Object} 优化后的工作流
     */
    optimizeConditionalExecution(workflow) {
        const optimizations = [];
        
        // 添加路径过滤
        if (!workflow.on.push?.paths && !workflow.on.pull_request?.paths) {
            if (workflow.on.push) {
                workflow.on.push.paths = [
                    'src/**',
                    'package*.json',
                    '.github/workflows/**'
                ];
            }
            
            if (workflow.on.pull_request) {
                workflow.on.pull_request.paths = [
                    'src/**',
                    'package*.json',
                    '.github/workflows/**'
                ];
            }
            
            optimizations.push({
                type: 'path-filtering',
                description: '添加智能路径过滤触发条件'
            });
        }
        
        this.optimizations.push(...optimizations);
        return workflow;
    }

    /**
     * 添加安全性增强
     * @param {Object} workflow - 工作流对象
     * @returns {Object} 优化后的工作流
     */
    enhanceSecurity(workflow) {
        const optimizations = [];
        
        // 添加权限配置
        if (!workflow.permissions) {
            workflow.permissions = {
                contents: 'read',
                'security-events': 'write',
                actions: 'read',
                checks: 'write',
                'pull-requests': 'write'
            };
            
            optimizations.push({
                type: 'permissions',
                description: '添加最小权限原则配置'
            });
        }
        
        // 添加并发控制
        if (!workflow.concurrency) {
            workflow.concurrency = {
                group: '${{ github.workflow }}-${{ github.ref }}',
                'cancel-in-progress': true
            };
            
            optimizations.push({
                type: 'concurrency',
                description: '添加并发控制防止资源浪费'
            });
        }
        
        this.optimizations.push(...optimizations);
        return workflow;
    }

    /**
     * 添加监控和报告
     * @param {Object} workflow - 工作流对象
     * @returns {Object} 优化后的工作流
     */
    addMonitoring(workflow) {
        const optimizations = [];
        
        Object.keys(workflow.jobs || {}).forEach(jobKey => {
            const job = workflow.jobs[jobKey];
            
            if (job.steps) {
                // 检查是否有测试步骤
                const hasTest = job.steps.some(step => 
                    step.run && (step.run.includes('test') || step.run.includes('jest'))
                );
                
                if (hasTest) {
                    // 添加测试报告步骤
                    const reportStep = {
                        name: '发布测试报告',
                        uses: 'dorny/test-reporter@v1',
                        if: 'success() || failure()',
                        with: {
                            name: 'Jest Tests',
                            path: 'reports/jest-*.xml',
                            reporter: 'jest-junit'
                        }
                    };
                    
                    job.steps.push(reportStep);
                    
                    optimizations.push({
                        type: 'test-reporting',
                        job: jobKey,
                        description: '添加测试结果报告'
                    });
                }
            }
        });
        
        this.optimizations.push(...optimizations);
        return workflow;
    }

    /**
     * 优化单个工作流
     * @param {string} filePath - 工作流文件路径
     * @returns {boolean} 是否成功优化
     */
    optimizeWorkflow(filePath) {
        const workflow = this.parseWorkflow(filePath);
        if (!workflow) return false;
        
        console.log(chalk.blue(`🔧 优化工作流: ${path.basename(filePath)}`));
        
        const originalOptimizations = this.optimizations.length;
        
        // 应用各种优化
        let optimizedWorkflow = workflow;
        optimizedWorkflow = this.optimizeMatrixStrategy(optimizedWorkflow);
        optimizedWorkflow = this.optimizeCaching(optimizedWorkflow);
        optimizedWorkflow = this.optimizeConditionalExecution(optimizedWorkflow);
        optimizedWorkflow = this.enhanceSecurity(optimizedWorkflow);
        optimizedWorkflow = this.addMonitoring(optimizedWorkflow);
        
        const newOptimizations = this.optimizations.length - originalOptimizations;
        
        if (newOptimizations > 0) {
            this.metrics.optimizedWorkflows++;
            
            if (!this.dryRun) {
                // 备份原文件
                const backupPath = `${filePath}.backup.${Date.now()}`;
                fs.copyFileSync(filePath, backupPath);
                
                // 写入优化后的工作流
                const optimizedYaml = yaml.dump(optimizedWorkflow, {
                    indent: 2,
                    lineWidth: 120
                });
                fs.writeFileSync(filePath, optimizedYaml);
                
                console.log(chalk.green(`✅ 已优化 ${newOptimizations} 项配置`));
            } else {
                console.log(chalk.yellow(`🔍 发现 ${newOptimizations} 项可优化配置 (试运行模式)`));
            }
        } else {
            console.log(chalk.gray(`ℹ️  无需优化`));
        }
        
        return true;
    }

    /**
     * 执行优化
     * @returns {Promise<void>}
     */
    async optimize() {
        console.log(chalk.cyan('🚀 GitHub Actions CI/CD 流程优化器'));
        console.log(chalk.cyan('=====================================\n'));
        
        const workflowFiles = this.getWorkflowFiles();
        
        if (workflowFiles.length === 0) {
            console.log(chalk.yellow('⚠️  未找到工作流文件'));
            return;
        }
        
        console.log(chalk.blue(`📁 发现 ${workflowFiles.length} 个工作流文件\n`));
        
        for (const filePath of workflowFiles) {
            await this.optimizeWorkflow(filePath);
        }
        
        this.generateReport();
    }

    /**
     * 生成优化报告
     */
    generateReport() {
        console.log(chalk.cyan('\n📊 优化报告'));
        console.log(chalk.cyan('=============\n'));
        
        console.log(`📈 总工作流数量: ${this.metrics.totalWorkflows}`);
        console.log(`✨ 已优化工作流: ${this.metrics.optimizedWorkflows}`);
        console.log(`🔧 总优化项目: ${this.optimizations.length}\n`);
        
        // 按类型分组优化项目
        const optimizationsByType = this.optimizations.reduce((acc, opt) => {
            acc[opt.type] = (acc[opt.type] || 0) + 1;
            return acc;
        }, {});
        
        console.log(chalk.blue('优化类型统计:'));
        Object.entries(optimizationsByType).forEach(([type, count]) => {
            console.log(`  ${type}: ${count} 项`);
        });
        
        // 生成详细报告文件
        const reportPath = path.join('reports', 'github-actions-optimization.json');
        const report = {
            timestamp: new Date().toISOString(),
            metrics: this.metrics,
            optimizations: this.optimizations,
            summary: {
                totalOptimizations: this.optimizations.length,
                optimizationsByType: optimizationsByType,
                recommendations: this.generateRecommendations()
            }
        };
        
        // 确保报告目录存在
        const reportsDir = path.dirname(reportPath);
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }
        
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(chalk.green(`\n📄 详细报告已保存到: ${reportPath}`));
    }

    /**
     * 生成优化建议
     * @returns {Array<string>} 建议列表
     */
    generateRecommendations() {
        const recommendations = [];
        
        if (this.metrics.optimizedWorkflows === 0) {
            recommendations.push('所有工作流已经过优化，无需进一步改进');
        } else {
            recommendations.push('定期审查工作流性能，持续优化 CI/CD 流程');
            recommendations.push('监控构建时间和资源使用情况');
            recommendations.push('考虑使用自托管运行器处理大型构建任务');
        }
        
        recommendations.push('定期更新 GitHub Actions 版本');
        recommendations.push('实施工作流安全最佳实践');
        
        return recommendations;
    }
}

/**
 * 主函数
 */
function main() {
    const args = process.argv.slice(2);
    const options = {
        verbose: args.includes('--verbose') || args.includes('-v'),
        dryRun: args.includes('--dry-run') || args.includes('-d'),
        workflowsDir: '.github/workflows'
    };
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
使用方法: node github-actions-optimizer.js [选项]

选项:
  --verbose, -v     显示详细信息
  --dry-run, -d     试运行模式，不实际修改文件
  --help, -h        显示帮助信息
`);
        return;
    }
    
    const optimizer = new GitHubActionsOptimizer(options);
    optimizer.optimize().catch(error => {
        console.error(chalk.red(`❌ 优化过程中发生错误: ${error.message}`));
        process.exit(1);
    });
}

if (require.main === module) {
    main();
}

module.exports = GitHubActionsOptimizer;