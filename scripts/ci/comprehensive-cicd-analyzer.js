#!/usr/bin/env node
/**
 * 全面的CI/CD流程分析和优化工具
 * 分析项目中的CI/CD配置，检测冗余、优化机会和环境兼容性问题
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class ComprehensiveCICDAnalyzer {
  constructor() {
    this.projectRoot = process.cwd();
    this.workflowsDir = path.join(this.projectRoot, '.github', 'workflows');
    this.backupDir = path.join(this.workflowsDir, 'backup');
    this.reportsDir = path.join(this.projectRoot, 'reports');
    this.analysis = {
      redundancies: [],
      optimizations: [],
      environmentIssues: [],
      fileStructure: [],
      gitignoreIssues: []
    };
  }

  async analyze() {
    console.log('🔍 开始全面CI/CD流程分析...');
    
    await this.analyzeWorkflowFiles();
    await this.analyzeRedundancies();
    await this.analyzeEnvironmentCompatibility();
    await this.analyzeFileStructure();
    await this.analyzeGitignoreConfiguration();
    await this.generateOptimizationPlan();
    
    console.log('✅ CI/CD流程分析完成');
    return this.analysis;
  }

  async analyzeWorkflowFiles() {
    console.log('📋 分析工作流文件...');
    
    const workflowFiles = fs.readdirSync(this.workflowsDir)
      .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'))
      .filter(file => !file.includes('backup'));

    const workflows = {};
    const duplicateJobs = new Map();
    const duplicateSteps = new Map();

    for (const file of workflowFiles) {
      const filePath = path.join(this.workflowsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      try {
        const workflow = yaml.load(content);
        workflows[file] = workflow;
        
        // 检查重复的作业
        if (workflow.jobs) {
          Object.keys(workflow.jobs).forEach(jobName => {
            const jobKey = JSON.stringify(workflow.jobs[jobName]);
            if (!duplicateJobs.has(jobKey)) {
              duplicateJobs.set(jobKey, []);
            }
            duplicateJobs.get(jobKey).push({ file, jobName });
          });
        }
      } catch (error) {
        this.analysis.environmentIssues.push({
          type: 'yaml_parse_error',
          file,
          error: error.message
        });
      }
    }

    // 识别重复的作业
    duplicateJobs.forEach((occurrences, jobKey) => {
      if (occurrences.length > 1) {
        this.analysis.redundancies.push({
          type: 'duplicate_job',
          occurrences,
          recommendation: '考虑将重复的作业提取到可重用的工作流中'
        });
      }
    });

    this.workflows = workflows;
  }

  async analyzeRedundancies() {
    console.log('🔄 分析冗余配置...');
    
    const commonPatterns = {
      'runs-on': {},
      'node-version': {},
      'install-dependencies': {},
      'cache-patterns': {}
    };

    Object.entries(this.workflows).forEach(([file, workflow]) => {
      if (workflow.jobs) {
        Object.entries(workflow.jobs).forEach(([jobName, job]) => {
          // 统计运行环境
          if (job['runs-on']) {
            const runsOn = job['runs-on'];
            if (!commonPatterns['runs-on'][runsOn]) {
              commonPatterns['runs-on'][runsOn] = [];
            }
            commonPatterns['runs-on'][runsOn].push({ file, jobName });
          }

          // 统计Node.js版本配置
          if (job.strategy?.matrix?.['node-version']) {
            const versions = JSON.stringify(job.strategy.matrix['node-version']);
            if (!commonPatterns['node-version'][versions]) {
              commonPatterns['node-version'][versions] = [];
            }
            commonPatterns['node-version'][versions].push({ file, jobName });
          }

          // 检查依赖安装步骤
          if (job.steps) {
            job.steps.forEach((step, index) => {
              if (step.name && step.name.includes('Install dependencies')) {
                const stepKey = JSON.stringify(step);
                if (!commonPatterns['install-dependencies'][stepKey]) {
                  commonPatterns['install-dependencies'][stepKey] = [];
                }
                commonPatterns['install-dependencies'][stepKey].push({ file, jobName, stepIndex: index });
              }
            });
          }
        });
      }
    });

    // 分析冗余模式
    Object.entries(commonPatterns).forEach(([pattern, occurrences]) => {
      Object.entries(occurrences).forEach(([key, locations]) => {
        if (locations.length > 3) {
          this.analysis.redundancies.push({
            type: `redundant_${pattern}`,
            pattern: key,
            occurrences: locations.length,
            locations,
            recommendation: `考虑创建可重用的工作流模板或使用组合操作`
          });
        }
      });
    });
  }

  async analyzeEnvironmentCompatibility() {
    console.log('🌍 分析环境兼容性...');
    
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // 检查Node.js版本兼容性
      const nodeVersion = packageJson.engines?.node;
      if (nodeVersion) {
        Object.entries(this.workflows).forEach(([file, workflow]) => {
          if (workflow.jobs) {
            Object.entries(workflow.jobs).forEach(([jobName, job]) => {
              if (job.strategy?.matrix?.['node-version']) {
                const workflowVersions = job.strategy.matrix['node-version'];
                // 这里可以添加版本兼容性检查逻辑
              }
            });
          }
        });
      }

      // 检查包管理器兼容性
      const packageManager = packageJson.packageManager;
      if (packageManager) {
        this.analysis.environmentIssues.push({
          type: 'package_manager_compatibility',
          packageManager,
          recommendation: '确保CI/CD流程使用正确的包管理器'
        });
      }
    }
  }

  async analyzeFileStructure() {
    console.log('📁 分析文件结构...');
    
    const expectedDirectories = [
      'reports',
      'logs',
      'temp',
      'cache',
      'artifacts',
      'test-reports'
    ];

    expectedDirectories.forEach(dir => {
      const dirPath = path.join(this.projectRoot, dir);
      if (fs.existsSync(dirPath)) {
        this.analysis.fileStructure.push({
          type: 'existing_directory',
          path: dir,
          status: 'exists'
        });
      } else {
        this.analysis.fileStructure.push({
          type: 'missing_directory',
          path: dir,
          status: 'missing',
          recommendation: '考虑创建此目录或在CI/CD流程中动态创建'
        });
      }
    });

    // 检查备份文件
    if (fs.existsSync(this.backupDir)) {
      const backupFiles = fs.readdirSync(this.backupDir);
      if (backupFiles.length > 10) {
        this.analysis.fileStructure.push({
          type: 'excessive_backups',
          count: backupFiles.length,
          recommendation: '考虑清理旧的备份文件或实施自动清理策略'
        });
      }
    }
  }

  async analyzeGitignoreConfiguration() {
    console.log('🚫 分析.gitignore配置...');
    
    const gitignorePath = path.join(this.projectRoot, '.gitignore');
    const requiredPatterns = [
      'reports/',
      'logs/',
      'temp/',
      'tmp/',
      'cache/',
      '*.log',
      'test-reports/',
      'artifacts/',
      'coverage/',
      '.env*',
      'node_modules/',
      '.next/',
      'build/',
      'dist/'
    ];

    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      const existingPatterns = gitignoreContent.split('\n').map(line => line.trim());

      const missingPatterns = requiredPatterns.filter(pattern => 
        !existingPatterns.some(existing => 
          existing === pattern || 
          existing.includes(pattern.replace('/', '')) ||
          pattern.includes(existing.replace('/', ''))
        )
      );

      if (missingPatterns.length > 0) {
        this.analysis.gitignoreIssues.push({
          type: 'missing_patterns',
          patterns: missingPatterns,
          recommendation: '添加缺失的.gitignore模式以避免提交不必要的文件'
        });
      }
    } else {
      this.analysis.gitignoreIssues.push({
        type: 'missing_gitignore',
        recommendation: '创建.gitignore文件'
      });
    }
  }

  async generateOptimizationPlan() {
    console.log('📋 生成优化计划...');
    
    const optimizations = [];

    // 基于分析结果生成优化建议
    if (this.analysis.redundancies.length > 0) {
      optimizations.push({
        priority: 'high',
        category: 'redundancy_reduction',
        title: '减少CI/CD配置冗余',
        description: '创建可重用的工作流模板和组合操作',
        actions: [
          '创建.github/workflows/templates/目录',
          '提取通用的作业配置到可重用工作流',
          '使用组合操作封装重复的步骤序列'
        ]
      });
    }

    if (this.analysis.gitignoreIssues.length > 0) {
      optimizations.push({
        priority: 'medium',
        category: 'file_management',
        title: '优化.gitignore配置',
        description: '确保不必要的文件不被提交到版本控制',
        actions: [
          '更新.gitignore文件',
          '添加缺失的忽略模式',
          '清理已提交的不必要文件'
        ]
      });
    }

    if (this.analysis.fileStructure.some(item => item.type === 'excessive_backups')) {
      optimizations.push({
        priority: 'low',
        category: 'maintenance',
        title: '清理备份文件',
        description: '实施自动备份清理策略',
        actions: [
          '创建备份清理脚本',
          '在CI/CD流程中添加清理步骤',
          '设置备份文件保留策略'
        ]
      });
    }

    this.analysis.optimizations = optimizations;
  }

  async generateReport() {
    console.log('📊 生成分析报告...');
    
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }

    const reportPath = path.join(this.reportsDir, 'cicd-comprehensive-analysis.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalWorkflows: Object.keys(this.workflows || {}).length,
        redundanciesFound: this.analysis.redundancies.length,
        optimizationsRecommended: this.analysis.optimizations.length,
        environmentIssues: this.analysis.environmentIssues.length,
        gitignoreIssues: this.analysis.gitignoreIssues.length
      },
      analysis: this.analysis,
      recommendations: this.generateRecommendations()
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 报告已保存到: ${reportPath}`);

    return report;
  }

  generateRecommendations() {
    const recommendations = {
      immediate: [],
      shortTerm: [],
      longTerm: []
    };

    // 立即执行的建议
    if (this.analysis.gitignoreIssues.length > 0) {
      recommendations.immediate.push('更新.gitignore文件以包含所有必要的忽略模式');
    }

    if (this.analysis.environmentIssues.length > 0) {
      recommendations.immediate.push('修复YAML解析错误和环境配置问题');
    }

    // 短期建议
    if (this.analysis.redundancies.length > 0) {
      recommendations.shortTerm.push('重构重复的CI/CD配置，创建可重用组件');
    }

    // 长期建议
    recommendations.longTerm.push('实施CI/CD流程的持续监控和优化');
    recommendations.longTerm.push('建立CI/CD最佳实践文档和培训');

    return recommendations;
  }

  async optimizeGitignore() {
    console.log('🔧 优化.gitignore配置...');
    
    const gitignorePath = path.join(this.projectRoot, '.gitignore');
    const additionalPatterns = [
      '',
      '# CI/CD and Build artifacts',
      'reports/',
      'logs/',
      'temp/',
      'tmp/',
      'cache/',
      'artifacts/',
      'test-reports/',
      'coverage/',
      '',
      '# Log files',
      '*.log',
      '*.log.*',
      '',
      '# OS generated files',
      '.DS_Store',
      '.DS_Store?',
      '._*',
      '.Spotlight-V100',
      '.Trashes',
      'ehthumbs.db',
      'Thumbs.db'
    ];

    if (fs.existsSync(gitignorePath)) {
      const existingContent = fs.readFileSync(gitignorePath, 'utf8');
      const newContent = existingContent + '\n' + additionalPatterns.join('\n');
      fs.writeFileSync(gitignorePath, newContent);
      console.log('✅ .gitignore文件已更新');
    } else {
      const content = additionalPatterns.join('\n');
      fs.writeFileSync(gitignorePath, content);
      console.log('✅ .gitignore文件已创建');
    }
  }

  async createDirectoryStructure() {
    console.log('📁 创建标准目录结构...');
    
    const directories = [
      'reports',
      'reports/cicd',
      'reports/quality',
      'reports/security',
      'reports/performance',
      'logs',
      'temp',
      'cache',
      'artifacts',
      'test-reports',
      'test-reports/coverage'
    ];

    directories.forEach(dir => {
      const dirPath = path.join(this.projectRoot, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        
        // 创建.gitkeep文件以确保空目录被跟踪
        const gitkeepPath = path.join(dirPath, '.gitkeep');
        fs.writeFileSync(gitkeepPath, '');
        
        console.log(`✅ 创建目录: ${dir}`);
      }
    });
  }
}

// 主执行函数
async function main() {
  const analyzer = new ComprehensiveCICDAnalyzer();
  
  try {
    const analysis = await analyzer.analyze();
    const report = await analyzer.generateReport();
    
    // 如果指定了优化标志，执行优化操作
    if (process.argv.includes('--optimize')) {
      await analyzer.optimizeGitignore();
      await analyzer.createDirectoryStructure();
    }
    
    console.log('\n📊 分析摘要:');
    console.log(`- 工作流文件: ${report.summary.totalWorkflows}`);
    console.log(`- 发现冗余: ${report.summary.redundanciesFound}`);
    console.log(`- 优化建议: ${report.summary.optimizationsRecommended}`);
    console.log(`- 环境问题: ${report.summary.environmentIssues}`);
    console.log(`- .gitignore问题: ${report.summary.gitignoreIssues}`);
    
    if (report.analysis.optimizations.length > 0) {
      console.log('\n🎯 优化建议:');
      report.analysis.optimizations.forEach((opt, index) => {
        console.log(`${index + 1}. [${opt.priority.toUpperCase()}] ${opt.title}`);
        console.log(`   ${opt.description}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 分析过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = ComprehensiveCICDAnalyzer;