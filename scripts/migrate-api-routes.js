/**
 * @file API Routes Migration Script
 * @description 自动迁移所有API路由以使用全局错误处理机制
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

const fs = require('fs');
const path = require('path');

// 配置
const API_DIR = path.join(__dirname, '../app/api');
const BACKUP_DIR = path.join(__dirname, '../backups/api-routes');

/**
 * 递归查找route.ts文件
 */
function findRouteFiles(dir) {
  const files = [];
  
  function walkDir(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else if (item === 'route.ts' || item.endsWith('.ts')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // 忽略无法访问的目录
    }
  }
  
  if (fs.existsSync(dir)) {
    walkDir(dir);
  }
  
  return files;
}

// 确保备份目录存在
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * 迁移统计
 */
const stats = {
  total: 0,
  migrated: 0,
  skipped: 0,
  errors: 0,
  files: []
};

/**
 * 检查文件是否已经迁移
 */
function isAlreadyMigrated(content) {
  return content.includes('createApiRoute') || 
         content.includes('withGlobalErrorHandler') ||
         content.includes('api-route-wrapper');
}

/**
 * 生成新的路由代码
 */
function generateNewRouteCode(originalContent, routePath) {
  // 提取现有的导入
  const imports = [];
  const importRegex = /import\s+.*?from\s+['"].*?['"]/g;
  let match;
  while ((match = importRegex.exec(originalContent)) !== null) {
    imports.push(match[0]);
  }

  // 检测HTTP方法
  const methods = [];
  if (originalContent.includes('export async function GET')) methods.push('GET');
  if (originalContent.includes('export async function POST')) methods.push('POST');
  if (originalContent.includes('export async function PUT')) methods.push('PUT');
  if (originalContent.includes('export async function DELETE')) methods.push('DELETE');
  if (originalContent.includes('export async function PATCH')) methods.push('PATCH');

  // 提取现有的处理逻辑
  const handlerRegex = /export async function (GET|POST|PUT|DELETE|PATCH)\s*\([^)]*\)\s*{([\s\S]*?)^}/gm;
  const handlers = {};
  
  let handlerMatch;
  while ((handlerMatch = handlerRegex.exec(originalContent)) !== null) {
    const method = handlerMatch[1];
    let handlerBody = handlerMatch[2];
    
    // 清理处理逻辑，移除try-catch和console.error
    handlerBody = handlerBody
      .replace(/try\s*{/g, '')
      .replace(/}\s*catch\s*\([^)]*\)\s*{[\s\S]*?}/g, '')
      .replace(/console\.error\([^)]*\);?/g, '')
      .replace(/return NextResponse\.json\(\s*{[\s\S]*?error[\s\S]*?}[\s\S]*?{\s*status:\s*\d+\s*}\s*\);?/g, '')
      .trim();
    
    handlers[method] = handlerBody;
  }

  // 生成新代码
  let newCode = `/**
 * @file ${routePath}
 * @description Migrated API route with global error handling
 * @author ZK-Agent Team
 * @date ${new Date().toISOString().split('T')[0]}
 */

`;

  // 添加必要的导入
  newCode += `import { NextRequest, NextResponse } from 'next/server';
`;
  newCode += `import { createApiRoute, RouteConfigs, CommonValidations } from '@/lib/middleware/api-route-wrapper';
`;
  newCode += `import { ApiResponseWrapper } from '@/lib/utils/api-helper';
`;
  
  // 添加其他导入（排除Next.js相关的）
  imports.forEach(imp => {
    if (!imp.includes('next/server') && !imp.includes('next/response')) {
      newCode += `${imp}\n`;
    }
  });

  newCode += `\n`;

  // 为每个方法生成新的处理器
  methods.forEach(method => {
    const handlerBody = handlers[method] || '';
    
    // 确定路由配置
    let routeConfig = 'RouteConfigs.publicGet()';
    if (method === 'POST') {
      routeConfig = 'RouteConfigs.protectedPost()';
    } else if (method === 'PUT' || method === 'DELETE') {
      routeConfig = `{ method: '${method}', requireAuth: true, timeout: 60000 }`;
    }

    // 检测是否需要认证
    if (handlerBody.includes('auth') || handlerBody.includes('token') || routePath.includes('admin')) {
      routeConfig = routeConfig.replace('publicGet', 'protectedGet');
    }

    newCode += `export const ${method} = createApiRoute(\n`;
    newCode += `  ${routeConfig},\n`;
    newCode += `  async (req: NextRequest, { params, validatedBody, validatedQuery, user, requestId }) => {\n`;
    
    // 添加处理逻辑
    if (handlerBody) {
      // 替换常见模式
      let processedBody = handlerBody
        .replace(/const\s+{\s*([^}]+)\s*}\s*=\s*await\s+req\.json\(\)/g, 'const { $1 } = validatedBody || {}')
        .replace(/const\s+url\s*=\s*new\s+URL\(req\.url\)/g, '')
        .replace(/const\s+searchParams\s*=\s*url\.searchParams/g, '')
        .replace(/searchParams\.get\(['"](\w+)['"]\)/g, 'validatedQuery?.$1')
        .replace(/return\s+NextResponse\.json\(/g, 'return ApiResponseWrapper.success(')
        .replace(/, \{ status: 200 \}/g, '')
        .replace(/NextResponse\.json\(/g, 'ApiResponseWrapper.success(');
      
      newCode += `    ${processedBody.split('\n').join('\n    ')}\n`;
    } else {
      newCode += `    // TODO: Implement ${method} handler\n`;
      newCode += `    return ApiResponseWrapper.success({ message: '${method} endpoint' });\n`;
    }
    
    newCode += `  }\n`;
    newCode += `);\n\n`;
  });

  return newCode;
}

/**
 * 迁移单个文件
 */
function migrateFile(filePath) {
  try {
    const relativePath = path.relative(API_DIR, filePath);
    console.log(`🔄 Processing: ${relativePath}`);
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 检查是否已经迁移
    if (isAlreadyMigrated(content)) {
      console.log(`⏭️  Skipped (already migrated): ${relativePath}`);
      stats.skipped++;
      return;
    }
    
    // 备份原文件
    const backupPath = path.join(BACKUP_DIR, relativePath);
    const backupDir = path.dirname(backupPath);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    fs.writeFileSync(backupPath, content);
    
    // 生成新代码
    const newCode = generateNewRouteCode(content, relativePath);
    
    // 写入新文件
    fs.writeFileSync(filePath, newCode);
    
    console.log(`✅ Migrated: ${relativePath}`);
    stats.migrated++;
    stats.files.push({
      path: relativePath,
      status: 'migrated',
      backup: path.relative(__dirname, backupPath)
    });
    
  } catch (error) {
    console.error(`❌ Error migrating ${filePath}:`, error.message);
    stats.errors++;
    stats.files.push({
      path: path.relative(API_DIR, filePath),
      status: 'error',
      error: error.message
    });
  }
}

/**
 * 主迁移函数
 */
function migrateApiRoutes() {
  console.log('🚀 Starting API routes migration...');
  console.log(`📁 API Directory: ${API_DIR}`);
  console.log(`💾 Backup Directory: ${BACKUP_DIR}`);
  console.log('');
  
  // 查找所有route.ts文件
  const routeFiles = findRouteFiles(API_DIR);
  
  stats.total = routeFiles.length;
  console.log(`📊 Found ${stats.total} route files`);
  console.log('');
  
  // 迁移每个文件
  routeFiles.forEach(migrateFile);
  
  // 输出统计信息
  console.log('');
  console.log('📈 Migration Summary:');
  console.log(`   Total files: ${stats.total}`);
  console.log(`   ✅ Migrated: ${stats.migrated}`);
  console.log(`   ⏭️  Skipped: ${stats.skipped}`);
  console.log(`   ❌ Errors: ${stats.errors}`);
  
  if (stats.errors > 0) {
    console.log('');
    console.log('❌ Files with errors:');
    stats.files
      .filter(f => f.status === 'error')
      .forEach(f => console.log(`   - ${f.path}: ${f.error}`));
  }
  
  // 生成迁移报告
  const reportPath = path.join(__dirname, '../reports/api-migration-report.json');
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    stats,
    files: stats.files
  }, null, 2));
  
  console.log('');
  console.log(`📄 Migration report saved to: ${reportPath}`);
  
  if (stats.migrated > 0) {
    console.log('');
    console.log('🎉 Migration completed successfully!');
    console.log('💡 Next steps:');
    console.log('   1. Review the migrated files');
    console.log('   2. Test the API endpoints');
    console.log('   3. Update any custom validation logic');
    console.log('   4. Remove backup files when satisfied');
  }
}

/**
 * 回滚迁移
 */
function rollbackMigration() {
  console.log('🔄 Rolling back migration...');
  
  const backupFiles = findRouteFiles(BACKUP_DIR);
  
  backupFiles.forEach(backupFile => {
    try {
      const relativePath = path.relative(BACKUP_DIR, backupFile);
      const originalPath = path.join(API_DIR, relativePath);
      
      const backupContent = fs.readFileSync(backupFile, 'utf8');
      fs.writeFileSync(originalPath, backupContent);
      
      console.log(`✅ Restored: ${relativePath}`);
    } catch (error) {
      console.error(`❌ Error restoring ${backupFile}:`, error.message);
    }
  });
  
  console.log('🎉 Rollback completed!');
}

// 命令行接口
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'migrate':
      migrateApiRoutes();
      break;
    case 'rollback':
      rollbackMigration();
      break;
    default:
      console.log('Usage:');
      console.log('  node migrate-api-routes.js migrate   - Migrate all API routes');
      console.log('  node migrate-api-routes.js rollback  - Rollback migration');
      process.exit(1);
  }
}

module.exports = {
  migrateApiRoutes,
  rollbackMigration,
  stats
};