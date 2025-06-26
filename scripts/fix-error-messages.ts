#!/usr/bin/env tsx
/* eslint-disable */
// @ts-nocheck

/**
 * @file 批量修复error.message类型错误
 * @description 自动替换所有error.message为getErrorMessage(error)
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// 需要修复的文件模式
const patterns: any = [
  'lib/**/*.ts',
  'app/**/*.ts',
  'components/**/*.ts',
  'scripts/**/*.ts',
  '__tests__/**/*.ts'
];

// 排除的文件
const excludePatterns: any = [
  'node_modules/**',
  '.next/**',
  'dist/**',
  'build/**'
];

async function fixErrorMessages() {
  console.log('🔧 开始修复error.message类型错误...');

  // 获取所有需要处理的文件
  const files: string[] = [];
  for (const pattern of patterns) {
    const matches: any = await glob(pattern, { ignore: excludePatterns });
    files.push(...matches);
  }

  console.log(`📁 找到 ${files.length} 个文件需要检查`);

  let fixedFiles: any = 0;
  let totalReplacements: any = 0;

  for (const file of files) {
    try {
      const content: any = fs.readFileSync(file, 'utf-8');
      let newContent: any = content;
      let fileReplacements: any = 0;

      // 检查是否需要添加import
      const needsImport: any = content.includes('error.message') && 
                         !content.includes('getErrorMessage');

      if (needsImport) {
        // 添加import语句
        if (content.includes("import { Logger }")) {
          newContent = newContent.replace(
            "import { Logger } from '@/lib/utils/logger';",
            "import { Logger } from '@/lib/utils/logger';\nimport { getErrorMessage } from '@/lib/utils/error-handler';"
          );
        } else if (content.includes("from '@/lib/utils/error-handler'")) {
          // 如果已经有error-handler的import，添加getErrorMessage
          newContent = newContent.replace(
            /import\s*{([^}]+)}\s*from\s*'@\/lib\/utils\/error-handler'/,
            (match, imports) => {
              if (!imports.includes('getErrorMessage')) {
                return `import { ${imports.trim()}, getErrorMessage } from '@/lib/utils/error-handler'`;
              }
              return match;
            }
          );
        } else {
          // 在第一个import后添加
          const firstImportMatch: any = newContent.match(/^import.*$/m);
          if (firstImportMatch) {
            const insertIndex: any = newContent.indexOf(firstImportMatch[0]) + firstImportMatch[0].length;
            newContent = newContent.slice(0, insertIndex) + 
                        "\nimport { getErrorMessage } from '@/lib/utils/error-handler';" +
                        newContent.slice(insertIndex);
          }
        }
      }

      // 替换error.message
      const errorMessageRegex: any = /\berror\.message\b/g;
      const matches: any = newContent.match(errorMessageRegex);
      if (matches) {
        newContent = newContent.replace(errorMessageRegex, 'getErrorMessage(error)');
        fileReplacements = matches.length;
      }

      // 如果有修改，写入文件
      if (newContent !== content) {
        fs.writeFileSync(file, newContent, 'utf-8');
        fixedFiles++;
        totalReplacements += fileReplacements;
        console.log(`✅ 修复 ${file}: ${fileReplacements} 处替换`);
      }

    } catch (error) {
      console.error(`❌ 处理文件 ${file} 时出错:`, error);
    }
  }

  console.log(`\n🎉 修复完成!`);
  console.log(`📊 统计:`);
  console.log(`   - 修复文件数: ${fixedFiles}`);
  console.log(`   - 总替换数: ${totalReplacements}`);
}

// 运行修复
fixErrorMessages().catch(console.error);