/**
 * @file API Error Handling Migration Script
 * @description 系统性迁移API路由到统一异常处理模式
 * @author ZK-Agent Team
 * @date 2025-01-27
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

// 迁移配置
interface MigrationConfig {
  sourceDir: string;
  backupDir: string;
  dryRun: boolean;
  verbose: boolean;
}

// 错误处理模式
interface ErrorPattern {
  pattern: RegExp;
  replacement: string;
  description: string;
}

// 统一的错误处理模式
const ERROR_PATTERNS: ErrorPattern[] = [
  {
    pattern: /catch\s*\(\s*error[^)]*\)\s*\{[\s\S]*?console\.error\([^)]*\)[\s\S]*?return\s+[^;]*ApiResponseWrapper\.error\([^)]*\)[\s\S]*?\}/g,
    replacement: `catch (error) {
      return handleApiError(error, requestId, {
        context: 'API_OPERATION',
        enableRetry: true
      });
    }`,
    description: '统一catch块错误处理'
  },
  {
    pattern: /return\s+wrapper\.error\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*\{\s*status:\s*(\d+)\s*\}\s*\)/g,
    replacement: 'return ApiResponseWrapper.error(UnifiedErrorCode.$1, "$2", null, $3)',
    description: '标准化wrapper.error调用'
  },
  {
    pattern: /ApiResponseWrapper\.error\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*\{\s*status:\s*(\d+)\s*\}\s*\)/g,
    replacement: 'ApiResponseWrapper.error(UnifiedErrorCode.$1, "$2", null, $3)',
    description: '标准化ApiResponseWrapper.error调用'
  },
  {
    pattern: /console\.error\([^)]*error[^)]*\);?\s*return\s+ApiResponseWrapper\.error\([^)]*\)/g,
    replacement: 'return handleApiError(error, requestId)',
    description: '替换console.error + return模式'
  }
];

// 需要添加的导入
const REQUIRED_IMPORTS = [
  "import { withUnifiedErrorHandling, handleApiError } from '@/lib/middleware/unified-error-handler';",
  "import { UnifiedErrorCode } from '@/types/core/unified-error-codes';"
];

/**
 * 主迁移函数
 */
export async function migrateApiErrorHandling(config: MigrationConfig): Promise<void> {
  console.log('🚀 开始API异常处理迁移...');
  
  // 1. 查找所有API路由文件
  const apiFiles = await findApiRouteFiles(config.sourceDir);
  console.log(`📁 找到 ${apiFiles.length} 个API路由文件`);
  
  // 2. 创建备份目录
  if (!config.dryRun) {
    await createBackupDirectory(config.backupDir);
  }
  
  // 3. 迁移每个文件
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[]
  };
  
  for (const filePath of apiFiles) {
    try {
      const migrationResult = await migrateFile(filePath, config);
      
      if (migrationResult.migrated) {
        results.success++;
        console.log(`✅ ${filePath} - 迁移成功`);
      } else {
        results.skipped++;
        console.log(`⏭️  ${filePath} - 跳过 (${migrationResult.reason})`);
      }
    } catch (error) {
      results.failed++;
      const errorMsg = `❌ ${filePath} - 迁移失败: ${error instanceof Error ? error.message : '未知错误'}`;
      results.errors.push(errorMsg);
      console.error(errorMsg);
    }
  }
  
  // 4. 输出迁移结果
  printMigrationSummary(results);
}

/**
 * 查找API路由文件
 */
async function findApiRouteFiles(sourceDir: string): Promise<string[]> {
  const patterns = [
    path.join(sourceDir, 'app/api/**/*.ts'),
    path.join(sourceDir, 'pages/api/**/*.ts'),
    path.join(sourceDir, 'src/app/api/**/*.ts'),
    path.join(sourceDir, 'src/pages/api/**/*.ts')
  ];
  
  const files: string[] = [];
  
  for (const pattern of patterns) {
    try {
      const matches = await glob(pattern, { ignore: ['**/*.test.ts', '**/*.spec.ts'] });
      files.push(...matches);
    } catch (error) {
      console.warn(`警告: 无法搜索模式 ${pattern}:`, error);
    }
  }
  
  return [...new Set(files)]; // 去重
}

/**
 * 创建备份目录
 */
async function createBackupDirectory(backupDir: string): Promise<void> {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`📂 创建备份目录: ${backupDir}`);
  }
}

/**
 * 迁移单个文件
 */
async function migrateFile(
  filePath: string,
  config: MigrationConfig
): Promise<{ migrated: boolean; reason?: string }> {
  // 1. 读取文件内容
  const originalContent = fs.readFileSync(filePath, 'utf-8');
  
  // 2. 检查是否需要迁移
  if (!needsMigration(originalContent)) {
    return { migrated: false, reason: '无需迁移' };
  }
  
  // 3. 创建备份
  if (!config.dryRun) {
    const backupPath = path.join(config.backupDir, path.relative(config.sourceDir, filePath));
    const backupDir = path.dirname(backupPath);
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    fs.writeFileSync(backupPath, originalContent);
  }
  
  // 4. 应用迁移
  let migratedContent = originalContent;
  
  // 添加必要的导入
  migratedContent = addRequiredImports(migratedContent);
  
  // 应用错误处理模式
  for (const pattern of ERROR_PATTERNS) {
    migratedContent = migratedContent.replace(pattern.pattern, pattern.replacement);
    
    if (config.verbose) {
      console.log(`  🔄 应用模式: ${pattern.description}`);
    }
  }
  
  // 包装导出的处理函数
  migratedContent = wrapExportedHandlers(migratedContent);
  
  // 5. 写入迁移后的文件
  if (!config.dryRun) {
    fs.writeFileSync(filePath, migratedContent);
  } else {
    console.log(`[DRY RUN] 将写入: ${filePath}`);
  }
  
  return { migrated: true };
}

/**
 * 检查文件是否需要迁移
 */
function needsMigration(content: string): boolean {
  // 检查是否已经使用了统一错误处理
  if (content.includes('withUnifiedErrorHandling') || content.includes('handleApiError')) {
    return false;
  }
  
  // 检查是否包含需要迁移的错误处理模式
  const hasOldErrorHandling = ERROR_PATTERNS.some(pattern => pattern.pattern.test(content));
  const hasTryCatch = /try\s*\{[\s\S]*?catch\s*\([^)]*\)\s*\{[\s\S]*?\}/.test(content);
  const hasConsoleError = /console\.error\([^)]*error[^)]*\)/.test(content);
  
  return hasOldErrorHandling || hasTryCatch || hasConsoleError;
}

/**
 * 添加必要的导入
 */
function addRequiredImports(content: string): string {
  const lines = content.split('\n');
  const importLines: string[] = [];
  const otherLines: string[] = [];
  
  let inImportSection = true;
  
  for (const line of lines) {
    if (inImportSection && (line.startsWith('import ') || line.trim() === '')) {
      importLines.push(line);
    } else {
      inImportSection = false;
      otherLines.push(line);
    }
  }
  
  // 添加新的导入（如果不存在）
  for (const requiredImport of REQUIRED_IMPORTS) {
    const importName = requiredImport.match(/import\s+\{([^}]+)\}/)?.[1];
    if (importName && !content.includes(importName)) {
      importLines.push(requiredImport);
    }
  }
  
  return [...importLines, '', ...otherLines].join('\n');
}

/**
 * 包装导出的处理函数
 */
function wrapExportedHandlers(content: string): string {
  // 查找导出的HTTP方法处理器
  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  
  for (const method of httpMethods) {
    const exportPattern = new RegExp(
      `export\s+const\s+${method}\s*=\s*([^;]+);`,
      'g'
    );
    
    content = content.replace(exportPattern, (match, handler) => {
      // 如果已经包装过，跳过
      if (handler.includes('withUnifiedErrorHandling')) {
        return match;
      }
      
      return `export const ${method} = withUnifiedErrorHandling(${handler.trim()});`;
    });
  }
  
  return content;
}

/**
 * 打印迁移摘要
 */
function printMigrationSummary(results: {
  success: number;
  failed: number;
  skipped: number;
  errors: string[];
}): void {
  console.log('\n📊 迁移摘要:');
  console.log(`✅ 成功: ${results.success}`);
  console.log(`⏭️  跳过: ${results.skipped}`);
  console.log(`❌ 失败: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ 错误详情:');
    results.errors.forEach(error => console.log(`  ${error}`));
  }
  
  console.log('\n🎉 迁移完成!');
}

/**
 * 验证迁移结果
 */
export async function validateMigration(sourceDir: string): Promise<void> {
  console.log('🔍 验证迁移结果...');
  
  const apiFiles = await findApiRouteFiles(sourceDir);
  const issues: string[] = [];
  
  for (const filePath of apiFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // 检查是否还有旧的错误处理模式
    if (content.includes('console.error') && !content.includes('handleApiError')) {
      issues.push(`${filePath}: 仍包含console.error调用`);
    }
    
    // 检查是否缺少必要的导入
    if (content.includes('UnifiedErrorCode.') && !content.includes('import { UnifiedErrorCode }')) {
      issues.push(`${filePath}: 缺少UnifiedErrorCode导入`);
    }
  }
  
  if (issues.length > 0) {
    console.log('⚠️  发现问题:');
    issues.forEach(issue => console.log(`  ${issue}`));
  } else {
    console.log('✅ 验证通过，所有文件已正确迁移');
  }
}

// CLI入口
if (require.main === module) {
  const config: MigrationConfig = {
    sourceDir: process.argv[2] || process.cwd(),
    backupDir: path.join(process.cwd(), 'migration-backup'),
    dryRun: process.argv.includes('--dry-run'),
    verbose: process.argv.includes('--verbose')
  };
  
  migrateApiErrorHandling(config)
    .then(() => {
      if (!config.dryRun) {
        return validateMigration(config.sourceDir);
      }
      return; // Add this line
    })
    .catch(error => {
      console.error('迁移失败:', error);
      process.exit(1);
    });
}