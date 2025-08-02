#!/usr/bin/env node

/**
 * 智能分块处理器
 * 解决 Claude Code 和 Gemini CLI 的 token 超限问题
 * 
 * @author ZK-Agent Team
 * @version 1.0.0
 * @date 2025-07-22
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * 智能分块处理器类
 */
class IntelligentChunking {
    constructor(options = {}) {
        this.options = {
            maxTokens: options.maxTokens || 1000000, // 默认100万token
            chunkOverlap: options.chunkOverlap || 100, // 块之间的重叠行数
            excludePatterns: options.excludePatterns || [
                'node_modules/**',
                '.next/**',
                'dist/**',
                'build/**',
                'coverage/**',
                'reports/**',
                '*.min.js',
                '*.bundle.js'
            ],
            maxFileSize: options.maxFileSize || 100000, // 100KB
            priorityExtensions: options.priorityExtensions || ['.ts', '.tsx', '.js', '.jsx', '.md'],
            ...options
        };
        
        this.stats = {
            totalFiles: 0,
            processedFiles: 0,
            skippedFiles: 0,
            totalChunks: 0,
            totalTokens: 0
        };
    }
    
    /**
     * 估算文本的token数量
     * @param {string} text - 输入文本
     * @returns {number} 估算的token数量
     */
    estimateTokens(text) {
        if (!text) return 0;
        
        // 简单的token估算：平均每个token约4个字符
        // 对于代码，token密度可能更高
        const avgCharsPerToken = 3.5;
        const baseTokens = Math.ceil(text.length / avgCharsPerToken);
        
        // 代码特殊字符的额外token
        const specialChars = (text.match(/[{}()\[\];,.:]/g) || []).length;
        const keywords = (text.match(/\b(function|class|const|let|var|if|else|for|while|return|import|export)\b/g) || []).length;
        
        return baseTokens + specialChars * 0.1 + keywords * 0.2;
    }
    
    /**
     * 检查文件是否应该被排除
     * @param {string} filePath - 文件路径
     * @returns {boolean} 是否应该排除
     */
    shouldExcludeFile(filePath) {
        const relativePath = path.relative(process.cwd(), filePath);
        
        // 检查排除模式
        for (const pattern of this.options.excludePatterns) {
            const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
            if (regex.test(relativePath)) {
                return true;
            }
        }
        
        // 检查文件大小
        try {
            const stats = fs.statSync(filePath);
            if (stats.size > this.options.maxFileSize) {
                console.log(chalk.yellow(`⚠️  跳过大文件: ${relativePath} (${(stats.size / 1024).toFixed(1)}KB)`));
                return true;
            }
        } catch (error) {
            return true;
        }
        
        return false;
    }
    
    /**
     * 获取文件优先级
     * @param {string} filePath - 文件路径
     * @returns {number} 优先级（数字越小优先级越高）
     */
    getFilePriority(filePath) {
        const ext = path.extname(filePath);
        const index = this.options.priorityExtensions.indexOf(ext);
        return index === -1 ? 999 : index;
    }
    
    /**
     * 智能分块单个文件
     * @param {string} content - 文件内容
     * @param {string} filePath - 文件路径
     * @returns {Array<Object>} 分块结果
     */
    chunkFile(content, filePath) {
        const lines = content.split('\n');
        const chunks = [];
        let currentChunk = {
            content: '',
            lines: [],
            tokens: 0,
            startLine: 1,
            endLine: 1,
            filePath: filePath
        };
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineTokens = this.estimateTokens(line);
            
            // 检查是否需要开始新的块
            if (currentChunk.tokens + lineTokens > this.options.maxTokens && currentChunk.lines.length > 0) {
                // 完成当前块
                currentChunk.endLine = currentChunk.startLine + currentChunk.lines.length - 1;
                chunks.push({ ...currentChunk });
                
                // 开始新块，包含重叠内容
                const overlapStart = Math.max(0, currentChunk.lines.length - this.options.chunkOverlap);
                const overlapLines = currentChunk.lines.slice(overlapStart);
                const overlapContent = overlapLines.join('\n');
                const overlapTokens = this.estimateTokens(overlapContent);
                
                currentChunk = {
                    content: overlapContent + (overlapContent ? '\n' : '') + line,
                    lines: [...overlapLines, line],
                    tokens: overlapTokens + lineTokens,
                    startLine: currentChunk.startLine + overlapStart,
                    endLine: i + 1,
                    filePath: filePath
                };
            } else {
                // 添加到当前块
                if (currentChunk.lines.length === 0) {
                    currentChunk.startLine = i + 1;
                }
                currentChunk.content += (currentChunk.content ? '\n' : '') + line;
                currentChunk.lines.push(line);
                currentChunk.tokens += lineTokens;
            }
        }
        
        // 添加最后一个块
        if (currentChunk.lines.length > 0) {
            currentChunk.endLine = currentChunk.startLine + currentChunk.lines.length - 1;
            chunks.push(currentChunk);
        }
        
        return chunks;
    }
    
    /**
     * 递归获取目录中的所有文件
     * @param {string} dir - 目录路径
     * @returns {Array<string>} 文件路径数组
     */
    getAllFiles(dir) {
        const files = [];
        
        try {
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stats = fs.statSync(fullPath);
                
                if (stats.isDirectory()) {
                    if (!this.shouldExcludeFile(fullPath)) {
                        files.push(...this.getAllFiles(fullPath));
                    }
                } else if (stats.isFile()) {
                    if (!this.shouldExcludeFile(fullPath)) {
                        files.push(fullPath);
                    } else {
                        this.stats.skippedFiles++;
                    }
                }
            }
        } catch (error) {
            console.error(chalk.red(`❌ 读取目录失败: ${dir} - ${error.message}`));
        }
        
        return files;
    }
    
    /**
     * 处理单个文件
     * @param {string} filePath - 文件路径
     * @returns {Array<Object>} 分块结果
     */
    processFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const chunks = this.chunkFile(content, filePath);
            
            this.stats.processedFiles++;
            this.stats.totalChunks += chunks.length;
            
            const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.tokens, 0);
            this.stats.totalTokens += totalTokens;
            
            console.log(chalk.green(`✅ 处理文件: ${path.relative(process.cwd(), filePath)} (${chunks.length} 块, ${totalTokens.toLocaleString()} tokens)`));
            
            return chunks;
        } catch (error) {
            console.error(chalk.red(`❌ 处理文件失败: ${filePath} - ${error.message}`));
            this.stats.skippedFiles++;
            return [];
        }
    }
    
    /**
     * 处理目录或文件
     * @param {string} target - 目标路径
     * @returns {Array<Object>} 所有分块结果
     */
    process(target) {
        console.log(chalk.blue(`🚀 开始智能分块处理: ${target}`));
        console.log(chalk.gray(`📊 配置: 最大${this.options.maxTokens.toLocaleString()}tokens/块, 重叠${this.options.chunkOverlap}行`));
        
        const startTime = Date.now();
        let files = [];
        
        // 获取要处理的文件列表
        const stats = fs.statSync(target);
        if (stats.isDirectory()) {
            files = this.getAllFiles(target);
        } else if (stats.isFile()) {
            if (!this.shouldExcludeFile(target)) {
                files = [target];
            }
        }
        
        // 按优先级排序文件
        files.sort((a, b) => this.getFilePriority(a) - this.getFilePriority(b));
        
        this.stats.totalFiles = files.length;
        console.log(chalk.blue(`📁 发现 ${files.length} 个文件待处理`));
        
        // 处理所有文件
        const allChunks = [];
        for (const file of files) {
            const chunks = this.processFile(file);
            allChunks.push(...chunks);
        }
        
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        // 输出统计信息
        console.log(chalk.green('\n🎉 分块处理完成!'));
        console.log(chalk.blue('📊 统计信息:'));
        console.log(`   📁 总文件数: ${this.stats.totalFiles}`);
        console.log(`   ✅ 已处理: ${this.stats.processedFiles}`);
        console.log(`   ⏭️  已跳过: ${this.stats.skippedFiles}`);
        console.log(`   📦 总块数: ${this.stats.totalChunks}`);
        console.log(`   🔢 总tokens: ${this.stats.totalTokens.toLocaleString()}`);
        console.log(`   ⏱️  耗时: ${duration.toFixed(2)}秒`);
        
        if (this.stats.totalChunks > 0) {
            const avgTokensPerChunk = Math.round(this.stats.totalTokens / this.stats.totalChunks);
            console.log(`   📊 平均tokens/块: ${avgTokensPerChunk.toLocaleString()}`);
        }
        
        return allChunks;
    }
    
    /**
     * 保存分块结果到文件
     * @param {Array<Object>} chunks - 分块结果
     * @param {string} outputPath - 输出路径
     */
    saveChunks(chunks, outputPath) {
        try {
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            
            const result = {
                metadata: {
                    generatedAt: new Date().toISOString(),
                    totalChunks: chunks.length,
                    totalTokens: chunks.reduce((sum, chunk) => sum + chunk.tokens, 0),
                    options: this.options,
                    stats: this.stats
                },
                chunks: chunks
            };
            
            fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
            console.log(chalk.green(`💾 分块结果已保存到: ${outputPath}`));
        } catch (error) {
            console.error(chalk.red(`❌ 保存失败: ${error.message}`));
        }
    }
}

/**
 * 命令行接口
 */
function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        console.log(chalk.blue('🔧 智能分块处理器'));
        console.log('\n用法:');
        console.log('  node intelligent-chunking.js <目标路径> [选项]');
        console.log('\n选项:');
        console.log('  --max-tokens <数量>     最大token数量 (默认: 1000000)');
        console.log('  --chunk-overlap <行数>   块重叠行数 (默认: 100)');
        console.log('  --max-file-size <字节>  最大文件大小 (默认: 100000)');
        console.log('  --output <路径>         输出文件路径');
        console.log('  --help, -h              显示帮助信息');
        console.log('\n示例:');
        console.log('  node intelligent-chunking.js ./src --max-tokens 500000 --output chunks.json');
        return;
    }
    
    const target = args[0];
    const options = {};
    
    // 解析命令行参数
    for (let i = 1; i < args.length; i += 2) {
        const flag = args[i];
        const value = args[i + 1];
        
        switch (flag) {
            case '--max-tokens':
                options.maxTokens = parseInt(value);
                break;
            case '--chunk-overlap':
                options.chunkOverlap = parseInt(value);
                break;
            case '--max-file-size':
                options.maxFileSize = parseInt(value);
                break;
            case '--output':
                options.outputPath = value;
                break;
        }
    }
    
    // 创建处理器并执行
    const chunker = new IntelligentChunking(options);
    const chunks = chunker.process(target);
    
    // 保存结果
    if (options.outputPath) {
        chunker.saveChunks(chunks, options.outputPath);
    }
    
    // 检查是否有超限的块
    const oversizedChunks = chunks.filter(chunk => chunk.tokens > options.maxTokens || 1000000);
    if (oversizedChunks.length > 0) {
        console.log(chalk.yellow(`\n⚠️  警告: 发现 ${oversizedChunks.length} 个超限块，可能需要进一步处理`));
        oversizedChunks.forEach(chunk => {
            console.log(chalk.yellow(`   📄 ${chunk.filePath}:${chunk.startLine}-${chunk.endLine} (${chunk.tokens.toLocaleString()} tokens)`));
        });
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = IntelligentChunking;