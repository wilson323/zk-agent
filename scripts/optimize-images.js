const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

class ImageOptimizer {
  constructor(options = {}) {
    this.options = {
      quality: 80,
      maxWidth: 1920,
      maxHeight: 1080,
      outputFormat: 'webp',
      backupOriginal: true,
      ...options
    };
  }

  /**
   * 记录日志
   */
  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}]`;
    
    switch (type) {
      case 'success':
        console.log(`${prefix} ✅ ${message}`);
        break;
      case 'warning':
        console.log(`${prefix} ⚠️  ${message}`);
        break;
      case 'error':
        console.log(`${prefix} ❌ ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
        break;
    }
  }

  /**
   * 获取文件大小（格式化）
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 备份原始文件
   */
  async backupFile(filePath) {
    if (!this.options.backupOriginal) return;
    
    const backupDir = path.join(path.dirname(filePath), 'originals');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const fileName = path.basename(filePath);
    const backupPath = path.join(backupDir, fileName);
    
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(filePath, backupPath);
      this.log(`备份原始文件: ${fileName}`);
    }
  }

  /**
   * 优化单个图片
   */
  async optimizeImage(inputPath, outputPath = null) {
    try {
      const originalStats = fs.statSync(inputPath);
      const originalSize = originalStats.size;
      
      // 备份原始文件
      await this.backupFile(inputPath);
      
      // 设置输出路径
      if (!outputPath) {
        const ext = path.extname(inputPath);
        const baseName = path.basename(inputPath, ext);
        const dir = path.dirname(inputPath);
        outputPath = path.join(dir, `${baseName}.${this.options.outputFormat}`);
      }
      
      // 使用 Sharp 进行图片优化
      let sharpInstance = sharp(inputPath);
      
      // 获取图片元数据
      const metadata = await sharpInstance.metadata();
      
      // 调整尺寸（如果需要）
      if (metadata.width > this.options.maxWidth || metadata.height > this.options.maxHeight) {
        sharpInstance = sharpInstance.resize({
          width: this.options.maxWidth,
          height: this.options.maxHeight,
          fit: 'inside',
          withoutEnlargement: true
        });
      }
      
      // 根据输出格式进行压缩
      switch (this.options.outputFormat) {
        case 'webp':
          sharpInstance = sharpInstance.webp({ quality: this.options.quality });
          break;
        case 'jpeg':
        case 'jpg':
          sharpInstance = sharpInstance.jpeg({ quality: this.options.quality });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({ quality: this.options.quality });
          break;
        default:
          throw new Error(`不支持的输出格式: ${this.options.outputFormat}`);
      }
      
      // 保存优化后的图片
      await sharpInstance.toFile(outputPath);
      
      // 如果输出路径与输入路径不同，删除原文件
      if (outputPath !== inputPath && path.extname(outputPath) !== path.extname(inputPath)) {
        // 只有当格式发生变化时才删除原文件
        // fs.unlinkSync(inputPath);
      }
      
      const optimizedStats = fs.statSync(outputPath);
      const optimizedSize = optimizedStats.size;
      const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
      
      this.log(
        `优化完成: ${path.basename(inputPath)} -> ${path.basename(outputPath)} ` +
        `(${this.formatFileSize(originalSize)} -> ${this.formatFileSize(optimizedSize)}, 节省 ${savings}%)`,
        'success'
      );
      
      return {
        inputPath,
        outputPath,
        originalSize,
        optimizedSize,
        savings: parseFloat(savings)
      };
      
    } catch (error) {
      this.log(`优化失败: ${path.basename(inputPath)} - ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * 批量优化图片
   */
  async optimizeImages(imagePaths) {
    const results = [];
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;
    
    this.log(`开始优化 ${imagePaths.length} 个图片文件...`);
    
    for (const imagePath of imagePaths) {
      try {
        const result = await this.optimizeImage(imagePath);
        results.push(result);
        totalOriginalSize += result.originalSize;
        totalOptimizedSize += result.optimizedSize;
      } catch (error) {
        this.log(`跳过文件: ${imagePath}`, 'warning');
      }
    }
    
    const totalSavings = ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize * 100).toFixed(1);
    
    this.log(
      `\n📊 优化完成!\n` +
      `📁 处理文件: ${results.length}\n` +
      `📉 总大小: ${this.formatFileSize(totalOriginalSize)} -> ${this.formatFileSize(totalOptimizedSize)}\n` +
      `💾 总节省: ${this.formatFileSize(totalOriginalSize - totalOptimizedSize)} (${totalSavings}%)`,
      'success'
    );
    
    return results;
  }

  /**
   * 扫描目录中的大图片文件
   */
  async scanLargeImages(directory, minSize = 100 * 1024) { // 默认100KB
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const largeImages = [];
    
    const scanDir = (dir) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
          // 跳过 node_modules 和其他不需要的目录
          if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(item)) {
            scanDir(fullPath);
          }
        } else if (stats.isFile()) {
          const ext = path.extname(fullPath).toLowerCase();
          if (imageExtensions.includes(ext) && stats.size > minSize) {
            largeImages.push({
              path: fullPath,
              size: stats.size,
              extension: ext
            });
          }
        }
      }
    };
    
    scanDir(directory);
    return largeImages.sort((a, b) => b.size - a.size);
  }
}

// 命令行参数解析
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    directory: process.cwd(),
    quality: 80,
    maxWidth: 1920,
    maxHeight: 1080,
    outputFormat: 'webp',
    minSize: 100 * 1024, // 100KB
    dryRun: false
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--directory':
      case '-d':
        options.directory = args[++i];
        break;
      case '--quality':
      case '-q':
        options.quality = parseInt(args[++i]);
        break;
      case '--max-width':
        options.maxWidth = parseInt(args[++i]);
        break;
      case '--max-height':
        options.maxHeight = parseInt(args[++i]);
        break;
      case '--format':
      case '-f':
        options.outputFormat = args[++i];
        break;
      case '--min-size':
        options.minSize = parseInt(args[++i]) * 1024; // KB to bytes
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
      case '-h':
        console.log(`
图片优化工具

用法:
  node optimize-images.js [选项]

选项:
  --directory, -d <路径>    扫描目录 (默认: 当前目录)
  --quality, -q <数值>      压缩质量 1-100 (默认: 80)
  --max-width <数值>        最大宽度 (默认: 1920)
  --max-height <数值>       最大高度 (默认: 1080)
  --format, -f <格式>       输出格式 webp|jpeg|png (默认: webp)
  --min-size <KB>          最小文件大小 (默认: 100)
  --dry-run                试运行模式，不实际修改文件
  --help, -h               显示帮助信息

示例:
  node optimize-images.js --directory ./public --quality 70
  node optimize-images.js --format jpeg --max-width 1200
`);
        process.exit(0);
        break;
    }
  }
  
  return options;
}

// 主函数
async function main() {
  try {
    const options = parseArgs();
    const optimizer = new ImageOptimizer(options);
    
    // 扫描大图片文件
    const largeImages = await optimizer.scanLargeImages(options.directory, options.minSize);
    
    if (largeImages.length === 0) {
      optimizer.log('没有找到需要优化的大图片文件', 'warning');
      return;
    }
    
    optimizer.log(`找到 ${largeImages.length} 个大图片文件:`);
    largeImages.forEach(img => {
      optimizer.log(`  ${path.relative(options.directory, img.path)} (${optimizer.formatFileSize(img.size)})`);
    });
    
    if (options.dryRun) {
      optimizer.log('\n这是试运行模式，没有实际修改文件', 'warning');
      optimizer.log('要执行实际优化，请移除 --dry-run 参数');
      return;
    }
    
    // 执行优化
    const imagePaths = largeImages.map(img => img.path);
    await optimizer.optimizeImages(imagePaths);
    
  } catch (error) {
    console.error('❌ 优化失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = ImageOptimizer;