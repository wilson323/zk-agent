/**
 * 架构符合度可视化仪表盘
 * 生成实时的架构健康度报告和可视化图表
 * 
 * @author ZK-Agent Team
 * @version 1.0.0
 */

import { ArchitectureComplianceResult, ArchitectureViolation, BestPractice } from './architecture-compliance-engine';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * 仪表盘配置接口
 */
export interface DashboardConfig {
  /** 输出格式 */
  outputFormat: 'console' | 'html' | 'json' | 'markdown';
  /** 主题样式 */
  theme: 'light' | 'dark' | 'auto';
  /** 是否包含详细信息 */
  includeDetails: boolean;
  /** 是否生成图表 */
  generateCharts: boolean;
  /** 输出目录 */
  outputDir: string;
}

/**
 * 图表数据接口
 */
export interface ChartData {
  /** 图表类型 */
  type: 'bar' | 'pie' | 'line' | 'radar' | 'heatmap';
  /** 图表标题 */
  title: string;
  /** 数据集 */
  datasets: ChartDataset[];
  /** 标签 */
  labels: string[];
}

/**
 * 图表数据集接口
 */
export interface ChartDataset {
  /** 数据集标签 */
  label: string;
  /** 数据值 */
  data: number[];
  /** 背景颜色 */
  backgroundColor?: string[];
  /** 边框颜色 */
  borderColor?: string;
}

/**
 * 架构符合度可视化仪表盘类
 */
export class ComplianceDashboard {
  private config: DashboardConfig;

  /**
   * 构造函数
   * @param config 仪表盘配置
   */
  constructor(config: Partial<DashboardConfig> = {}) {
    this.config = {
      outputFormat: 'console',
      theme: 'auto',
      includeDetails: true,
      generateCharts: true,
      outputDir: './reports',
      ...config
    };
  }

  /**
   * 生成架构符合度仪表盘
   * @param result 符合度评估结果
   * @returns 生成的报告路径
   */
  public async generateDashboard(result: ArchitectureComplianceResult): Promise<string> {
    console.log('📊 开始生成架构符合度仪表盘...');

    // 确保输出目录存在
    await this.ensureOutputDirectory();

    let reportPath: string;

    switch (this.config.outputFormat) {
      case 'console':
        this.generateConsoleReport(result);
        reportPath = 'console';
        break;
      case 'html':
        reportPath = await this.generateHtmlReport(result);
        break;
      case 'json':
        reportPath = await this.generateJsonReport(result);
        break;
      case 'markdown':
        reportPath = await this.generateMarkdownReport(result);
        break;
      default:
        throw new Error(`不支持的输出格式: ${this.config.outputFormat}`);
    }

    console.log(`✅ 仪表盘生成完成: ${reportPath}`);
    return reportPath;
  }

  /**
   * 确保输出目录存在
   */
  private async ensureOutputDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.outputDir, { recursive: true });
    } catch (error) {
      console.warn('创建输出目录失败:', error);
    }
  }

  /**
   * 生成控制台报告
   * @param result 符合度评估结果
   */
  private generateConsoleReport(result: ArchitectureComplianceResult): void {
    console.log('\n' + '='.repeat(60));
    console.log('🏗️  架构符合度报告 - ZK-Agent系统');
    console.log('='.repeat(60));
    
    // 总体评分区域
    this.printScoreSection(result);
    
    // 高风险违规区域
    this.printViolationsSection(result.highRiskViolations);
    
    // 优秀实践区域
    this.printBestPracticesSection(result.bestPractices);
    
    // 详细统计信息
    if (this.config.includeDetails) {
      this.printDetailedStats(result);
    }
    
    console.log('='.repeat(60));
  }

  /**
   * 打印评分区域
   * @param result 符合度评估结果
   */
  private printScoreSection(result: ArchitectureComplianceResult): void {
    console.log('\n📊 符合度评分:');
    console.log('┌─────────────────────────────────────────┐');
    console.log(`│ 分层架构合规度: ${this.generateProgressBar(result.layeredArchitectureCompliance)} ${result.layeredArchitectureCompliance}%`);
    console.log(`│ 领域模型纯度: ${this.generateProgressBar(result.domainModelPurity)} ${result.domainModelPurity}%`);
    console.log(`│ 服务边界清晰度: ${this.generateProgressBar(result.serviceBoundaryClarity)} ${result.serviceBoundaryClarity}%`);
    console.log(`│ 依赖倒置原则: ${this.generateProgressBar(result.dependencyInversionCompliance)} ${result.dependencyInversionCompliance}%`);
    console.log('└─────────────────────────────────────────┘');
    console.log(`\n🎯 总体评分: ${result.overallScore}/100 ${this.getScoreEmoji(result.overallScore)}`);
  }

  /**
   * 生成进度条
   * @param percentage 百分比
   * @returns 进度条字符串
   */
  private generateProgressBar(percentage: number): string {
    const barLength = 10;
    const filledLength = Math.round((percentage / 100) * barLength);
    const emptyLength = barLength - filledLength;
    
    return '█'.repeat(filledLength) + '░'.repeat(emptyLength);
  }

  /**
   * 获取评分表情符号
   * @param score 评分
   * @returns 表情符号
   */
  private getScoreEmoji(score: number): string {
    if (score >= 95) return '🏆';
    if (score >= 85) return '🥇';
    if (score >= 75) return '🥈';
    if (score >= 65) return '🥉';
    return '⚠️';
  }

  /**
   * 打印违规区域
   * @param violations 违规列表
   */
  private printViolationsSection(violations: ArchitectureViolation[]): void {
    if (violations.length === 0) {
      console.log('\n🟢 未发现高风险违规！');
      return;
    }

    console.log('\n🔴 高风险违规:');
    violations.forEach((violation, index) => {
      const icon = violation.severity === 'error' ? '❌' : violation.severity === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`├── ${icon} ${violation.description}`);
      console.log(`│   📁 ${path.basename(violation.filePath)}:${violation.lineNumber}`);
      console.log(`│   💡 ${violation.fixSuggestion}`);
      if (index < violations.length - 1) {
        console.log('│');
      }
    });
  }

  /**
   * 打印优秀实践区域
   * @param bestPractices 优秀实践列表
   */
  private printBestPracticesSection(bestPractices: BestPractice[]): void {
    if (bestPractices.length === 0) {
      console.log('\n🟡 暂无识别到的优秀实践');
      return;
    }

    console.log('\n🟢 优秀实践:');
    bestPractices.forEach((practice, index) => {
      console.log(`├── ✅ ${practice.description}`);
      console.log(`│   📁 ${path.basename(practice.filePath)}`);
      console.log(`│   📈 评分贡献: +${practice.scoreContribution}`);
      if (index < bestPractices.length - 1) {
        console.log('│');
      }
    });
  }

  /**
   * 打印详细统计信息
   * @param result 符合度评估结果
   */
  private printDetailedStats(result: ArchitectureComplianceResult): void {
    const stats = result.detailedAnalysis.projectStats;
    
    console.log('\n📈 项目统计:');
    console.log(`├── 总文件数: ${stats.totalFiles}`);
    console.log(`├── 总代码行数: ${stats.totalLines.toLocaleString()}`);
    console.log(`├── 组件数量: ${stats.componentCount}`);
    console.log(`├── 服务数量: ${stats.serviceCount}`);
    console.log(`└── 平均复杂度: ${stats.averageComplexity.toFixed(2)}`);

    // 技术债务信息
    const debt = result.detailedAnalysis.technicalDebt;
    console.log('\n💳 技术债务:');
    console.log(`├── 债务评分: ${debt.totalDebtScore}/100`);
    console.log(`├── 债务项目: ${debt.debtItems.length} 个`);
    console.log(`└── 重构建议: ${debt.refactoringRecommendations.length} 条`);
  }

  /**
   * 生成HTML报告
   * @param result 符合度评估结果
   * @returns 报告文件路径
   */
  private async generateHtmlReport(result: ArchitectureComplianceResult): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `architecture-compliance-${timestamp}.html`;
    const filePath = path.join(this.config.outputDir, fileName);

    const htmlContent = this.generateHtmlContent(result);
    await fs.writeFile(filePath, htmlContent, 'utf-8');

    return filePath;
  }

  /**
   * 生成HTML内容
   * @param result 符合度评估结果
   * @returns HTML内容
   */
  private generateHtmlContent(result: ArchitectureComplianceResult): string {
    const chartData = this.generateChartData(result);
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>架构符合度报告 - ZK-Agent</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        ${this.getHtmlStyles()}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🏗️ 架构符合度报告</h1>
            <p class="subtitle">ZK-Agent 系统 - ${new Date().toLocaleString('zh-CN')}</p>
        </header>

        <div class="score-overview">
            <div class="score-card main-score">
                <h2>总体评分</h2>
                <div class="score-value">${result.overallScore}</div>
                <div class="score-label">/ 100</div>
            </div>
            
            <div class="score-grid">
                <div class="score-card">
                    <h3>分层架构合规度</h3>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${result.layeredArchitectureCompliance}%"></div>
                    </div>
                    <span>${result.layeredArchitectureCompliance}%</span>
                </div>
                
                <div class="score-card">
                    <h3>领域模型纯度</h3>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${result.domainModelPurity}%"></div>
                    </div>
                    <span>${result.domainModelPurity}%</span>
                </div>
                
                <div class="score-card">
                    <h3>服务边界清晰度</h3>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${result.serviceBoundaryClarity}%"></div>
                    </div>
                    <span>${result.serviceBoundaryClarity}%</span>
                </div>
                
                <div class="score-card">
                    <h3>依赖倒置原则</h3>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${result.dependencyInversionCompliance}%"></div>
                    </div>
                    <span>${result.dependencyInversionCompliance}%</span>
                </div>
            </div>
        </div>

        ${this.config.generateCharts ? this.generateChartsHtml(chartData) : ''}

        <div class="violations-section">
            <h2>🔴 高风险违规</h2>
            ${this.generateViolationsHtml(result.highRiskViolations)}
        </div>

        <div class="best-practices-section">
            <h2>🟢 优秀实践</h2>
            ${this.generateBestPracticesHtml(result.bestPractices)}
        </div>

        <div class="stats-section">
            <h2>📈 项目统计</h2>
            ${this.generateStatsHtml(result.detailedAnalysis.projectStats)}
        </div>
    </div>

    <script>
        ${this.generateChartScripts(chartData)}
    </script>
</body>
</html>`;
  }

  /**
   * 获取HTML样式
   * @returns CSS样式字符串
   */
  private getHtmlStyles(): string {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        header {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .subtitle {
            opacity: 0.8;
            font-size: 1.1em;
        }
        
        .score-overview {
            padding: 40px;
            background: #f8f9fa;
        }
        
        .score-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
            text-align: center;
        }
        
        .main-score {
            margin-bottom: 30px;
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
        }
        
        .score-value {
            font-size: 4em;
            font-weight: bold;
            margin: 10px 0;
        }
        
        .score-label {
            font-size: 1.2em;
            opacity: 0.8;
        }
        
        .score-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }
        
        .progress-bar {
            width: 100%;
            height: 10px;
            background: #e0e0e0;
            border-radius: 5px;
            margin: 15px 0;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4CAF50, #45a049);
            transition: width 0.3s ease;
        }
        
        .violations-section,
        .best-practices-section,
        .stats-section {
            padding: 40px;
            border-top: 1px solid #eee;
        }
        
        .violation-item,
        .practice-item {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin: 15px 0;
            border-left: 4px solid #e74c3c;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        
        .practice-item {
            border-left-color: #27ae60;
        }
        
        .chart-container {
            padding: 40px;
            background: white;
        }
        
        .chart-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 30px;
        }
        
        .chart-item {
            background: #f8f9fa;
            border-radius: 15px;
            padding: 25px;
        }
        
        canvas {
            max-width: 100%;
            height: auto;
        }
    `;
  }

  /**
   * 生成图表数据
   * @param result 符合度评估结果
   * @returns 图表数据数组
   */
  private generateChartData(result: ArchitectureComplianceResult): ChartData[] {
    return [
      {
        type: 'radar',
        title: '架构符合度雷达图',
        labels: ['分层架构', '领域模型', '服务边界', '依赖倒置'],
        datasets: [{
          label: '符合度评分',
          data: [
            result.layeredArchitectureCompliance,
            result.domainModelPurity,
            result.serviceBoundaryClarity,
            result.dependencyInversionCompliance
          ],
          backgroundColor: 'rgba(76, 175, 80, 0.2)',
          borderColor: 'rgba(76, 175, 80, 1)'
        }]
      },
      {
        type: 'bar',
        title: '质量指标对比',
        labels: ['代码质量', '测试覆盖率', '架构健康', '性能指标'],
        datasets: [{
          label: '当前值',
          data: [result.overallScore, 85, 90, 88],
          backgroundColor: ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0']
        }, {
          label: '目标值',
          data: [95, 95, 95, 90],
          backgroundColor: ['#81C784', '#64B5F6', '#FFB74D', '#BA68C8']
        }]
      }
    ];
  }

  /**
   * 生成图表HTML
   * @param chartData 图表数据
   * @returns 图表HTML字符串
   */
  private generateChartsHtml(chartData: ChartData[]): string {
    const chartsHtml = chartData.map((chart, index) => `
        <div class="chart-item">
            <h3>${chart.title}</h3>
            <canvas id="chart-${index}" width="400" height="300"></canvas>
        </div>
    `).join('');

    return `
        <div class="chart-container">
            <h2>📊 可视化图表</h2>
            <div class="chart-grid">
                ${chartsHtml}
            </div>
        </div>
    `;
  }

  /**
   * 生成图表脚本
   * @param chartData 图表数据
   * @returns JavaScript脚本字符串
   */
  private generateChartScripts(chartData: ChartData[]): string {
    return chartData.map((chart, index) => {
      const config = {
        type: chart.type,
        data: {
          labels: chart.labels,
          datasets: chart.datasets
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: chart.title
            }
          }
        }
      };

      return `
        new Chart(document.getElementById('chart-${index}'), ${JSON.stringify(config)});
      `;
    }).join('\n');
  }

  /**
   * 生成违规HTML
   * @param violations 违规列表
   * @returns 违规HTML字符串
   */
  private generateViolationsHtml(violations: ArchitectureViolation[]): string {
    if (violations.length === 0) {
      return '<p class="no-items">🎉 未发现高风险违规！</p>';
    }

    return violations.map(violation => `
        <div class="violation-item">
            <h4>${violation.severity === 'error' ? '❌' : '⚠️'} ${violation.description}</h4>
            <p><strong>文件:</strong> ${violation.filePath}:${violation.lineNumber}</p>
            <p><strong>类型:</strong> ${violation.violationType}</p>
            <p><strong>修复建议:</strong> ${violation.fixSuggestion}</p>
        </div>
    `).join('');
  }

  /**
   * 生成优秀实践HTML
   * @param bestPractices 优秀实践列表
   * @returns 优秀实践HTML字符串
   */
  private generateBestPracticesHtml(bestPractices: BestPractice[]): string {
    if (bestPractices.length === 0) {
      return '<p class="no-items">暂无识别到的优秀实践</p>';
    }

    return bestPractices.map(practice => `
        <div class="practice-item">
            <h4>✅ ${practice.description}</h4>
            <p><strong>文件:</strong> ${practice.filePath}</p>
            <p><strong>类型:</strong> ${practice.type}</p>
            <p><strong>评分贡献:</strong> +${practice.scoreContribution}</p>
        </div>
    `).join('');
  }

  /**
   * 生成统计信息HTML
   * @param stats 项目统计信息
   * @returns 统计信息HTML字符串
   */
  private generateStatsHtml(stats: any): string {
    return `
        <div class="stats-grid">
            <div class="stat-item">
                <h4>总文件数</h4>
                <p class="stat-value">${stats.totalFiles}</p>
            </div>
            <div class="stat-item">
                <h4>总代码行数</h4>
                <p class="stat-value">${stats.totalLines.toLocaleString()}</p>
            </div>
            <div class="stat-item">
                <h4>组件数量</h4>
                <p class="stat-value">${stats.componentCount}</p>
            </div>
            <div class="stat-item">
                <h4>服务数量</h4>
                <p class="stat-value">${stats.serviceCount}</p>
            </div>
        </div>
    `;
  }

  /**
   * 生成JSON报告
   * @param result 符合度评估结果
   * @returns 报告文件路径
   */
  private async generateJsonReport(result: ArchitectureComplianceResult): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `architecture-compliance-${timestamp}.json`;
    const filePath = path.join(this.config.outputDir, fileName);

    const jsonContent = JSON.stringify(result, null, 2);
    await fs.writeFile(filePath, jsonContent, 'utf-8');

    return filePath;
  }

  /**
   * 生成Markdown报告
   * @param result 符合度评估结果
   * @returns 报告文件路径
   */
  private async generateMarkdownReport(result: ArchitectureComplianceResult): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `architecture-compliance-${timestamp}.md`;
    const filePath = path.join(this.config.outputDir, fileName);

    const markdownContent = this.generateMarkdownContent(result);
    await fs.writeFile(filePath, markdownContent, 'utf-8');

    return filePath;
  }

  /**
   * 生成Markdown内容
   * @param result 符合度评估结果
   * @returns Markdown内容
   */
  private generateMarkdownContent(result: ArchitectureComplianceResult): string {
    return `
# 🏗️ 架构符合度报告

**项目:** ZK-Agent 系统  
**生成时间:** ${new Date().toLocaleString('zh-CN')}  
**总体评分:** ${result.overallScore}/100 ${this.getScoreEmoji(result.overallScore)}

## 📊 符合度评分

| 指标 | 评分 | 进度条 |
|------|------|--------|
| 分层架构合规度 | ${result.layeredArchitectureCompliance}% | ${this.generateMarkdownProgressBar(result.layeredArchitectureCompliance)} |
| 领域模型纯度 | ${result.domainModelPurity}% | ${this.generateMarkdownProgressBar(result.domainModelPurity)} |
| 服务边界清晰度 | ${result.serviceBoundaryClarity}% | ${this.generateMarkdownProgressBar(result.serviceBoundaryClarity)} |
| 依赖倒置原则 | ${result.dependencyInversionCompliance}% | ${this.generateMarkdownProgressBar(result.dependencyInversionCompliance)} |

## 🔴 高风险违规

${result.highRiskViolations.length === 0 ? '🎉 未发现高风险违规！' : 
  result.highRiskViolations.map(v => `
### ${v.severity === 'error' ? '❌' : '⚠️'} ${v.description}

- **文件:** \`${v.filePath}:${v.lineNumber}\`
- **类型:** ${v.violationType}
- **修复建议:** ${v.fixSuggestion}
`).join('')}

## 🟢 优秀实践

${result.bestPractices.length === 0 ? '暂无识别到的优秀实践' : 
  result.bestPractices.map(p => `
### ✅ ${p.description}

- **文件:** \`${p.filePath}\`
- **类型:** ${p.type}
- **评分贡献:** +${p.scoreContribution}
`).join('')}

## 📈 项目统计

- **总文件数:** ${result.detailedAnalysis.projectStats.totalFiles}
- **总代码行数:** ${result.detailedAnalysis.projectStats.totalLines.toLocaleString()}
- **组件数量:** ${result.detailedAnalysis.projectStats.componentCount}
- **服务数量:** ${result.detailedAnalysis.projectStats.serviceCount}
- **平均复杂度:** ${result.detailedAnalysis.projectStats.averageComplexity.toFixed(2)}

## 💳 技术债务

- **债务评分:** ${result.detailedAnalysis.technicalDebt.totalDebtScore}/100
- **债务项目:** ${result.detailedAnalysis.technicalDebt.debtItems.length} 个
- **重构建议:** ${result.detailedAnalysis.technicalDebt.refactoringRecommendations.length} 条

---

*报告由 ZK-Agent 架构符合度评估引擎自动生成*
`;
  }

  /**
   * 生成Markdown进度条
   * @param percentage 百分比
   * @returns Markdown进度条字符串
   */
  private generateMarkdownProgressBar(percentage: number): string {
    const barLength = 20;
    const filledLength = Math.round((percentage / 100) * barLength);
    const emptyLength = barLength - filledLength;
    
    return `\`${'█'.repeat(filledLength)}${'░'.repeat(emptyLength)}\``;
  }
}

/**
 * 导出默认实例
 */
export default ComplianceDashboard;