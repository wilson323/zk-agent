/**
 * @file .prettierrc.enhanced.js
 * @description 增强版Prettier配置 - 统一代码格式化
 * @author ZK-Agent Team
 * @date 2024-12-27
 */

module.exports = {
  // 基础格式化规则
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'all',
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  endOfLine: 'lf',
  
  // JSX 特定规则
  jsxSingleQuote: true,
  jsxBracketSameLine: false,
  
  // 文件特定覆盖
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80,
        tabWidth: 2
      }
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always',
        tabWidth: 2
      }
    },
    {
      files: '*.yml',
      options: {
        tabWidth: 2,
        singleQuote: false
      }
    },
    {
      files: '*.yaml',
      options: {
        tabWidth: 2,
        singleQuote: false
      }
    },
    {
      files: ['*.css', '*.scss', '*.less'],
      options: {
        singleQuote: false
      }
    }
  ]
};