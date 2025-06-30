const fs = require('fs');
const path = require('path');

// 需要修复的文件列表（从搜索结果中提取）
const filesToFix = [
  'app/api/likes/toggle/route.ts',
  'app/api/health/route.ts',
  'app/api/fastgpt/health/route.ts',
  'app/api/sharing/[shareId]/download/route.ts',
  'app/api/metrics/record/route.ts',
  'app/api/likes/batch-status/route.ts',
  'app/api/ai-models/[id]/test/route.ts',
  'app/api/metrics/route.ts',
  'app/api/cad/export/route.ts',
  'app/api/cad/history/route.ts',
  'app/api/auth/refresh/route.ts',
  'app/api/auth/profile/route.ts',
  'app/api/fastgpt/[...path]/route.ts',
  'app/api/shared/route.ts',
  'app/api/proxy/route.ts',
  'app/api/fastgpt/feedback/route.ts',
  'app/api/ag-ui/compliance/audit/route.ts',
  'app/api/ag-ui/cad-analysis/route.ts',
  'app/api/db/health/route.ts',
  'app/api/ag-ui/standard/chat/route.ts',
  'app/api/poster/convert-to-pdf/route.ts',
  'app/api/cad/upload/route.ts',
  'app/api/admin/users/route.ts',
  'app/api/admin/metrics/route.ts',
  'app/api/admin/error-monitoring/status/route.ts',
  'app/api/shared/[shareId]/route.ts',
  'app/api/fastgpt/api/v1/chat/completions/route.ts',
  'app/api/poster/export/route.ts',
  'app/api/ag-ui/chat/route.ts',
  'app/api/auth/register/route.ts',
  'app/api/poster/templates/route.ts',
  'app/api/auth/login/route.ts',
  'app/api/ai-models/[id]/route.ts',
  'app/api/likes/status/route.ts',
  'app/api/likes/stats/route.ts',
  'app/api/sharing/generate-poster/route.ts',
  'app/api/admin/error-monitoring/report/route.ts',
  'app/api/fastgpt/test-connection/route.ts',
  'app/api/poster/config/route.ts',
  'app/api/v1/route.ts',
  'app/api/poster/history/route.ts',
  'app/api/fastgpt/init-chat/route.ts',
  'app/api/db/route.ts',
  'app/api/images/temp/[filename]/route.ts'
];

// 参数映射：下划线版本 -> 标准版本
const parameterMappings = {
  '_params': 'params',
  '_validatedBody': 'validatedBody',
  '_validatedQuery': 'validatedQuery',
  '_user': 'user',
  '_requestId': 'requestId'
};

function fixParameterUnderscores(content) {
  let modified = false;
  let newContent = content;
  
  // 修复函数参数定义中的下划线
  const functionParamPattern = /async\s*\([^)]*\{([^}]*)\}[^)]*\)\s*=>/g;
  newContent = newContent.replace(functionParamPattern, (match) => {
    let updatedMatch = match;
    let hasChanges = false;
    
    Object.entries(parameterMappings).forEach(([underscore, standard]) => {
      const regex = new RegExp(`\\b${underscore.replace('_', '\\_')}\\b`, 'g');
      if (regex.test(updatedMatch)) {
        updatedMatch = updatedMatch.replace(regex, standard);
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      modified = true;
    }
    return updatedMatch;
  });
  
  // 修复函数体中对这些参数的使用
  Object.entries(parameterMappings).forEach(([underscore, standard]) => {
    // 匹配变量使用，但避免匹配函数参数定义
    const usagePattern = new RegExp(`(?<!\\{[^}]*)(\\b${underscore.replace('_', '\\_')}\\b)(?![^}]*\\})`, 'g');
    if (usagePattern.test(newContent)) {
      newContent = newContent.replace(usagePattern, standard);
      modified = true;
    }
  });
  
  return { content: newContent, modified };
}

function processFile(filePath) {
  try {
    const fullPath = path.resolve(filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`跳过不存在的文件: ${filePath}`);
      return;
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    const result = fixParameterUnderscores(content);
    
    if (result.modified) {
      fs.writeFileSync(fullPath, result.content, 'utf8');
      console.log(`已修复: ${filePath}`);
    } else {
      console.log(`无需修复: ${filePath}`);
    }
  } catch (error) {
    console.error(`处理文件 ${filePath} 时出错:`, error.message);
  }
}

console.log('开始批量修复参数下划线问题...');

filesToFix.forEach(processFile);

console.log('批量修复完成!');