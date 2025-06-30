const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 查找所有路由文件
const routeFiles = glob.sync('app/api/**/route.ts', { cwd: process.cwd() });

console.log(`Found ${routeFiles.length} route files`);

routeFiles.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // 修复常见的语法错误
  
  // 1. 修复未定义的 req 变量（应该是 _req）
  if (content.includes('await req.json()') && content.includes('_req:')) {
    content = content.replace(/await req\.json\(\)/g, 'await _req.json()');
    modified = true;
    console.log(`Fixed req.json() in ${filePath}`);
  }
  
  // 2. 修复缺少分号的情况
  content = content.replace(/return ApiResponseWrapper\.(success|error)\([^)]+\)(?!;)/g, (match) => {
    if (!match.endsWith(';')) {
      modified = true;
      return match + ';';
    }
    return match;
  });
  
  // 3. 修复不完整的函数定义
  const incompletePattern = /export const (GET|POST|PUT|DELETE) = (withAuth\(|withGlobalErrorHandler\(|createApiRoute\()[^}]*$/m;
  if (incompletePattern.test(content)) {
    console.log(`Found incomplete function in ${filePath}`);
    // 这种情况需要手动处理
  }
  
  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
});

console.log('Route fixing completed');