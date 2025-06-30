const fs = require('fs');
const path = require('path');

// 需要修复的文件列表
const filesToFix = [
  'app/api/admin/error-logs/route.ts',
  'app/api/admin/error-logs/export/route.ts',
  'app/api/admin/error-logs/[id]/route.ts',
  'app/api/admin/error-logs/[id]/resolve/route.ts',
  'app/api/admin/error-monitoring/report/route.ts',
  'app/api/admin/error-monitoring/status/route.ts',
  'app/api/admin/ip-stats/route.ts',
  'app/api/admin/metrics/route.ts',
  'app/api/admin/system-monitor/route.ts',
  'app/api/admin/users/route.ts',
  'app/api/admin/users/[id]/route.ts',
  'app/api/ag-ui/cad-analysis/route.ts',
  'app/api/ag-ui/chat/route.ts',
  'app/api/ag-ui/compliance/audit/route.ts',
  'app/api/ag-ui/standard/chat/route.ts',
  'app/api/ai-models/route.ts',
  'app/api/ai-models/metrics/route.ts',
  'app/api/ai-models/[id]/route.ts',
  'app/api/ai-models/[id]/test/route.ts',
  'app/api/auth/profile/route.ts',
  'app/api/auth/refresh/route.ts',
  'app/api/auth/register/route.ts',
  'app/api/cad/export/route.ts',
  'app/api/cad/statistics/route.ts',
  'app/api/cad/upload/route.ts'
];

// 错误代码映射
const errorCodeMap = {
  'AUTH_INSUFFICIENT_PERMISSIONS': 'ErrorCode.AUTHORIZATION_ERROR',
  'VALIDATION_INVALID_FORMAT': 'ErrorCode.VALIDATION_ERROR',
  'INTERNAL_SERVER_ERROR': 'ErrorCode.INTERNAL_SERVER_ERROR',
  'RESOURCE_NOT_FOUND': 'ErrorCode.NOT_FOUND',
  'INTERNAL_ERROR': 'ErrorCode.INTERNAL_SERVER_ERROR'
};

function fixApiResponseWrapperCalls(content) {
  // 修复模式1: ApiResponseWrapper.error('string', status)
  content = content.replace(
    /ApiResponseWrapper\.error\(\s*['"]([^'"]+)['"]\s*,\s*(\d+)\s*\)/g,
    (match, message, status) => {
      const errorCode = status === '400' ? 'ErrorCode.VALIDATION_ERROR' :
                       status === '401' ? 'ErrorCode.AUTHENTICATION_ERROR' :
                       status === '403' ? 'ErrorCode.AUTHORIZATION_ERROR' :
                       status === '404' ? 'ErrorCode.NOT_FOUND' :
                       'ErrorCode.INTERNAL_SERVER_ERROR';
      return `ApiResponseWrapper.error(${errorCode}, '${message}', null, ${status})`;
    }
  );

  // 修复模式2: ApiResponseWrapper.error('string', null, null, status)
  content = content.replace(
    /ApiResponseWrapper\.error\(\s*['"]([^'"]+)['"]\s*,\s*null\s*,\s*null\s*,\s*(\d+)\s*\)/g,
    (match, message, status) => {
      const errorCode = status === '400' ? 'ErrorCode.VALIDATION_ERROR' :
                       status === '401' ? 'ErrorCode.AUTHENTICATION_ERROR' :
                       status === '403' ? 'ErrorCode.AUTHORIZATION_ERROR' :
                       status === '404' ? 'ErrorCode.NOT_FOUND' :
                       'ErrorCode.INTERNAL_SERVER_ERROR';
      return `ApiResponseWrapper.error(${errorCode}, '${message}', null, ${status})`;
    }
  );

  // 修复模式3: ApiResponseWrapper.error('CODE' as ErrorCode, message, ...)
  content = content.replace(
    /ApiResponseWrapper\.error\(\s*['"]([^'"]+)['"]\s+as\s+ErrorCode\s*,/g,
    (match, code) => {
      const mappedCode = errorCodeMap[code] || `ErrorCode.${code}`;
      return `ApiResponseWrapper.error(${mappedCode},`;
    }
  );

  // 修复模式4: ApiResponseWrapper.error(message, { status: xxx })
  content = content.replace(
    /ApiResponseWrapper\.error\(\s*['"]([^'"]+)['"]\s*,\s*\{\s*status:\s*(\d+)\s*\}\s*\)/g,
    (match, message, status) => {
      const errorCode = status === '400' ? 'ErrorCode.VALIDATION_ERROR' :
                       status === '401' ? 'ErrorCode.AUTHENTICATION_ERROR' :
                       status === '403' ? 'ErrorCode.AUTHORIZATION_ERROR' :
                       status === '404' ? 'ErrorCode.NOT_FOUND' :
                       'ErrorCode.INTERNAL_SERVER_ERROR';
      return `ApiResponseWrapper.error(${errorCode}, '${message}', null, ${status})`;
    }
  );

  return content;
}

function ensureErrorCodeImport(content) {
  // 检查是否已经导入了ErrorCode
  if (content.includes('import { ErrorCode }') || content.includes('import {ErrorCode}')) {
    return content;
  }

  // 查找现有的导入语句
  const importMatch = content.match(/import\s+\{[^}]+\}\s+from\s+['"]@\/lib\/utils\/api-helper['"]/g);
  
  if (importMatch) {
    // 如果存在api-helper的导入，添加ErrorCode
    content = content.replace(
      /import\s+\{([^}]+)\}\s+from\s+['"]@\/lib\/utils\/api-helper['"]/g,
      (match, imports) => {
        if (!imports.includes('ErrorCode')) {
          const cleanImports = imports.trim();
          return `import { ${cleanImports}, ErrorCode } from '@/lib/utils/api-helper'`;
        }
        return match;
      }
    );
  } else {
    // 如果没有api-helper的导入，在第一个import后添加
    const firstImportIndex = content.indexOf('import');
    if (firstImportIndex !== -1) {
      const nextLineIndex = content.indexOf('\n', firstImportIndex);
      content = content.slice(0, nextLineIndex + 1) + 
                "import { ErrorCode } from '@/lib/utils/api-helper';\n" +
                content.slice(nextLineIndex + 1);
    }
  }

  return content;
}

function fixFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`文件不存在: ${filePath}`);
    return;
  }

  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;

    // 修复ApiResponseWrapper.error调用
    content = fixApiResponseWrapperCalls(content);
    
    // 确保导入ErrorCode
    content = ensureErrorCodeImport(content);

    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`已修复: ${filePath}`);
    } else {
      console.log(`无需修复: ${filePath}`);
    }
  } catch (error) {
    console.error(`修复文件失败 ${filePath}:`, error.message);
  }
}

// 执行批量修复
console.log('开始批量修复ApiResponseWrapper.error调用...');
filesToFix.forEach(fixFile);
console.log('批量修复完成!');