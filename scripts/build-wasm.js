#!/usr/bin/env node

/**
 * @file WASM构建脚本
 * @description 编译和优化WebAssembly模块，提升性能关键部分
 * @author ZK-Agent Team
 * @date 2024-01-20
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// WASM模块配置
const WASM_MODULES = [
  {
    name: 'cad-parser',
    source: 'lib/wasm/cad-parser.c',
    output: 'public/wasm/cad-parser.wasm',
    exports: ['parse_cad_file', 'get_geometry_data', 'analyze_structure'],
    optimization: 'O3',
  },
  {
    name: 'image-processor',
    source: 'lib/wasm/image-processor.c',
    output: 'public/wasm/image-processor.wasm',
    exports: ['process_image', 'apply_filters', 'resize_image'],
    optimization: 'O2',
  },
  {
    name: 'data-compressor',
    source: 'lib/wasm/data-compressor.c',
    output: 'public/wasm/data-compressor.wasm',
    exports: ['compress_data', 'decompress_data', 'get_compression_ratio'],
    optimization: 'Os',
  },
];

// 构建结果
const buildResults = {
  success: [],
  failed: [],
  warnings: [],
};

/**
 * 检查构建环境
 */
function checkBuildEnvironment() {
  logInfo('检查WASM构建环境...');
  
  try {
    // 检查Emscripten
    execSync('emcc --version', { stdio: 'pipe' });
    logSuccess('Emscripten已安装');
  } catch (error) {
    logError('Emscripten未安装，请先安装Emscripten SDK');
    logInfo('安装指南: https://emscripten.org/docs/getting_started/downloads.html');
    return false;
  }
  
  try {
    // 检查wasm-opt
    execSync('wasm-opt --version', { stdio: 'pipe' });
    logSuccess('wasm-opt已安装');
  } catch (error) {
    logWarning('wasm-opt未安装，将跳过优化步骤');
  }
  
  return true;
}

/**
 * 创建WASM源文件模板
 */
function createWasmTemplates() {
  logInfo('创建WASM源文件模板...');
  
  const wasmDir = 'lib/wasm';
  if (!fs.existsSync(wasmDir)) {
    fs.mkdirSync(wasmDir, { recursive: true });
  }
  
  // CAD解析器模板
  const cadParserTemplate = `
#include <emscripten.h>
#include <stdlib.h>
#include <string.h>

// CAD文件解析器
typedef struct {
    float x, y, z;
} Point3D;

typedef struct {
    Point3D* vertices;
    int vertex_count;
    int* indices;
    int index_count;
} Geometry;

static Geometry* current_geometry = NULL;

EMSCRIPTEN_KEEPALIVE
int parse_cad_file(const char* data, int size) {
    // 简化的CAD文件解析逻辑
    if (current_geometry) {
        free(current_geometry->vertices);
        free(current_geometry->indices);
        free(current_geometry);
    }
    
    current_geometry = (Geometry*)malloc(sizeof(Geometry));
    current_geometry->vertex_count = size / 12; // 假设每个顶点12字节
    current_geometry->vertices = (Point3D*)malloc(current_geometry->vertex_count * sizeof(Point3D));
    
    // 模拟解析过程
    for (int i = 0; i < current_geometry->vertex_count; i++) {
        current_geometry->vertices[i].x = (float)(i * 1.0);
        current_geometry->vertices[i].y = (float)(i * 1.5);
        current_geometry->vertices[i].z = (float)(i * 0.5);
    }
    
    current_geometry->index_count = current_geometry->vertex_count;
    current_geometry->indices = (int*)malloc(current_geometry->index_count * sizeof(int));
    
    for (int i = 0; i < current_geometry->index_count; i++) {
        current_geometry->indices[i] = i;
    }
    
    return current_geometry->vertex_count;
}

EMSCRIPTEN_KEEPALIVE
float* get_geometry_data() {
    if (!current_geometry) return NULL;
    return (float*)current_geometry->vertices;
}

EMSCRIPTEN_KEEPALIVE
int analyze_structure() {
    if (!current_geometry) return 0;
    
    // 简化的结构分析
    int complexity = 0;
    for (int i = 0; i < current_geometry->vertex_count; i++) {
        if (current_geometry->vertices[i].z > 0) {
            complexity++;
        }
    }
    
    return complexity;
}
`;

  // 图像处理器模板
  const imageProcessorTemplate = `
#include <emscripten.h>
#include <stdlib.h>
#include <math.h>

typedef struct {
    unsigned char* data;
    int width;
    int height;
    int channels;
} Image;

static Image* current_image = NULL;

EMSCRIPTEN_KEEPALIVE
int process_image(unsigned char* data, int width, int height, int channels) {
    if (current_image) {
        free(current_image->data);
        free(current_image);
    }
    
    current_image = (Image*)malloc(sizeof(Image));
    current_image->width = width;
    current_image->height = height;
    current_image->channels = channels;
    
    int size = width * height * channels;
    current_image->data = (unsigned char*)malloc(size);
    memcpy(current_image->data, data, size);
    
    return size;
}

EMSCRIPTEN_KEEPALIVE
void apply_filters(int filter_type) {
    if (!current_image) return;
    
    int size = current_image->width * current_image->height * current_image->channels;
    
    switch (filter_type) {
        case 1: // 亮度调整
            for (int i = 0; i < size; i++) {
                int value = current_image->data[i] + 20;
                current_image->data[i] = value > 255 ? 255 : value;
            }
            break;
        case 2: // 对比度调整
            for (int i = 0; i < size; i++) {
                int value = (current_image->data[i] - 128) * 1.2 + 128;
                current_image->data[i] = value < 0 ? 0 : (value > 255 ? 255 : value);
            }
            break;
    }
}

EMSCRIPTEN_KEEPALIVE
unsigned char* resize_image(int new_width, int new_height) {
    if (!current_image) return NULL;
    
    int new_size = new_width * new_height * current_image->channels;
    unsigned char* new_data = (unsigned char*)malloc(new_size);
    
    // 简化的双线性插值
    float x_ratio = (float)current_image->width / new_width;
    float y_ratio = (float)current_image->height / new_height;
    
    for (int y = 0; y < new_height; y++) {
        for (int x = 0; x < new_width; x++) {
            int src_x = (int)(x * x_ratio);
            int src_y = (int)(y * y_ratio);
            
            for (int c = 0; c < current_image->channels; c++) {
                int src_index = (src_y * current_image->width + src_x) * current_image->channels + c;
                int dst_index = (y * new_width + x) * current_image->channels + c;
                new_data[dst_index] = current_image->data[src_index];
            }
        }
    }
    
    return new_data;
}
`;

  // 数据压缩器模板
  const dataCompressorTemplate = `
#include <emscripten.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    unsigned char* data;
    int size;
} CompressedData;

static CompressedData* compressed_data = NULL;

EMSCRIPTEN_KEEPALIVE
int compress_data(unsigned char* input, int input_size) {
    if (compressed_data) {
        free(compressed_data->data);
        free(compressed_data);
    }
    
    // 简化的RLE压缩
    compressed_data = (CompressedData*)malloc(sizeof(CompressedData));
    compressed_data->data = (unsigned char*)malloc(input_size * 2); // 最坏情况
    compressed_data->size = 0;
    
    int i = 0;
    while (i < input_size) {
        unsigned char current = input[i];
        int count = 1;
        
        while (i + count < input_size && input[i + count] == current && count < 255) {
            count++;
        }
        
        compressed_data->data[compressed_data->size++] = count;
        compressed_data->data[compressed_data->size++] = current;
        i += count;
    }
    
    return compressed_data->size;
}

EMSCRIPTEN_KEEPALIVE
unsigned char* decompress_data(int* output_size) {
    if (!compressed_data) return NULL;
    
    int estimated_size = compressed_data->size * 2;
    unsigned char* output = (unsigned char*)malloc(estimated_size);
    int output_index = 0;
    
    for (int i = 0; i < compressed_data->size; i += 2) {
        int count = compressed_data->data[i];
        unsigned char value = compressed_data->data[i + 1];
        
        for (int j = 0; j < count; j++) {
            output[output_index++] = value;
        }
    }
    
    *output_size = output_index;
    return output;
}

EMSCRIPTEN_KEEPALIVE
float get_compression_ratio() {
    if (!compressed_data) return 0.0;
    
    // 估算原始大小（简化）
    int original_size = 0;
    for (int i = 0; i < compressed_data->size; i += 2) {
        original_size += compressed_data->data[i];
    }
    
    return (float)compressed_data->size / original_size;
}
`;

  // 写入模板文件
  const templates = [
    { file: 'lib/wasm/cad-parser.c', content: cadParserTemplate },
    { file: 'lib/wasm/image-processor.c', content: imageProcessorTemplate },
    { file: 'lib/wasm/data-compressor.c', content: dataCompressorTemplate },
  ];

  templates.forEach(({ file, content }) => {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, content.trim());
      logSuccess(`创建模板: ${file}`);
    } else {
      logInfo(`模板已存在: ${file}`);
    }
  });
}

/**
 * 构建单个WASM模块
 */
async function buildWasmModule(module) {
  logInfo(`构建WASM模块: ${module.name}`);
  
  try {
    // 确保输出目录存在
    const outputDir = path.dirname(module.output);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 检查源文件是否存在
    if (!fs.existsSync(module.source)) {
      throw new Error(`源文件不存在: ${module.source}`);
    }
    
    // 构建emcc命令
    const exports = module.exports.map(exp => `_${exp}`).join(',');
    const emccCommand = [
      'emcc',
      module.source,
      `-${module.optimization}`,
      '-s', 'WASM=1',
      '-s', 'EXPORTED_RUNTIME_METHODS=["ccall","cwrap"]',
      '-s', `EXPORTED_FUNCTIONS="[${exports}]"`,
      '-s', 'ALLOW_MEMORY_GROWTH=1',
      '-s', 'MODULARIZE=1',
      '-s', `EXPORT_NAME="${module.name}"`,
      '--no-entry',
      '-o', module.output,
    ].join(' ');
    
    logInfo(`执行命令: ${emccCommand}`);
    execSync(emccCommand, { stdio: 'pipe' });
    
    // 检查输出文件
    if (fs.existsSync(module.output)) {
      const stats = fs.statSync(module.output);
      logSuccess(`${module.name} 构建成功 (${formatBytes(stats.size)})`);
      
      buildResults.success.push({
        name: module.name,
        output: module.output,
        size: stats.size,
      });
      
      // 尝试优化
      await optimizeWasm(module.output);
      
    } else {
      throw new Error('输出文件未生成');
    }
    
  } catch (error) {
    logError(`${module.name} 构建失败: ${error.message}`);
    buildResults.failed.push({
      name: module.name,
      error: error.message,
    });
  }
}

/**
 * 优化WASM文件
 */
async function optimizeWasm(wasmFile) {
  try {
    const optimizedFile = wasmFile.replace('.wasm', '.opt.wasm');
    
    const optimizeCommand = [
      'wasm-opt',
      '-O3',
      '--enable-bulk-memory',
      '--enable-sign-ext',
      wasmFile,
      '-o', optimizedFile,
    ].join(' ');
    
    execSync(optimizeCommand, { stdio: 'pipe' });
    
    const originalStats = fs.statSync(wasmFile);
    const optimizedStats = fs.statSync(optimizedFile);
    
    const reduction = ((originalStats.size - optimizedStats.size) / originalStats.size * 100).toFixed(1);
    
    // 替换原文件
    fs.renameSync(optimizedFile, wasmFile);
    
    logSuccess(`WASM优化完成，体积减少 ${reduction}%`);
    
  } catch (error) {
    logWarning(`WASM优化失败: ${error.message}`);
  }
}

/**
 * 生成TypeScript绑定
 */
function generateTypeScriptBindings() {
  logInfo('生成TypeScript绑定...');
  
  const bindingsDir = 'lib/wasm/bindings';
  if (!fs.existsSync(bindingsDir)) {
    fs.mkdirSync(bindingsDir, { recursive: true });
  }
  
  WASM_MODULES.forEach(module => {
    const bindingContent = `
/**
 * @file ${module.name} WASM绑定
 * @description TypeScript绑定文件，自动生成
 * @author ZK-Agent Team (自动生成)
 * @date ${new Date().toISOString().split('T')[0]}
 */

export interface I${toPascalCase(module.name)}Module {
${module.exports.map(exp => `  ${exp}: (...args: any[]) => any;`).join('\n')}
}

export class ${toPascalCase(module.name)} {
  private module: I${toPascalCase(module.name)}Module | null = null;
  private loading: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.loading) {
      return this.loading;
    }

    this.loading = this.loadModule();
    return this.loading;
  }

  private async loadModule(): Promise<void> {
    try {
      const wasmModule = await import('/wasm/${module.name}.wasm');
      this.module = await wasmModule.default();
    } catch (error) {
      throw new Error(\`Failed to load ${module.name} WASM module: \${error.message}\`);
    }
  }

  private ensureInitialized(): void {
    if (!this.module) {
      throw new Error('${module.name} module not initialized. Call initialize() first.');
    }
  }

${module.exports.map(exp => `
  ${exp}(...args: any[]): any {
    this.ensureInitialized();
    return this.module!.${exp}(...args);
  }`).join('\n')}
}

// 单例实例
export const ${toCamelCase(module.name)} = new ${toPascalCase(module.name)}();
`.trim();

    const bindingFile = path.join(bindingsDir, `${module.name}.ts`);
    fs.writeFileSync(bindingFile, bindingContent);
    logSuccess(`生成绑定: ${bindingFile}`);
  });
  
  // 生成索引文件
  const indexContent = `
/**
 * @file WASM模块索引
 * @description 导出所有WASM模块绑定
 * @author ZK-Agent Team (自动生成)
 * @date ${new Date().toISOString().split('T')[0]}
 */

${WASM_MODULES.map(module => 
  `export * from './${module.name}';`
).join('\n')}

// 初始化所有模块
export async function initializeAllWasmModules(): Promise<void> {
  const modules = [
${WASM_MODULES.map(module => 
  `    ${toCamelCase(module.name)}`
).join(',\n')}
  ];

  await Promise.all(modules.map(module => module.initialize()));
}
`.trim();

  fs.writeFileSync(path.join(bindingsDir, 'index.ts'), indexContent);
  logSuccess('生成索引文件: lib/wasm/bindings/index.ts');
}

/**
 * 工具函数
 */
function toPascalCase(str) {
  return str.replace(/(^|-)([a-z])/g, (_, __, char) => char.toUpperCase());
}

function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 生成构建报告
 */
function generateBuildReport() {
  log('\n' + '='.repeat(60), 'cyan');
  log('WASM构建报告', 'cyan');
  log('='.repeat(60), 'cyan');
  
  log(`\n构建成功: ${buildResults.success.length}`, 'green');
  log(`构建失败: ${buildResults.failed.length}`, 'red');
  log(`警告数量: ${buildResults.warnings.length}`, 'yellow');
  
  if (buildResults.success.length > 0) {
    log('\n成功构建的模块:', 'green');
    buildResults.success.forEach(result => {
      log(`  ✅ ${result.name}: ${formatBytes(result.size)}`);
    });
  }
  
  if (buildResults.failed.length > 0) {
    log('\n构建失败的模块:', 'red');
    buildResults.failed.forEach(result => {
      log(`  ❌ ${result.name}: ${result.error}`);
    });
  }
  
  if (buildResults.warnings.length > 0) {
    log('\n警告:', 'yellow');
    buildResults.warnings.forEach(warning => {
      log(`  ⚠️  ${warning}`);
    });
  }
  
  log('\n使用建议:', 'cyan');
  log('• 在生产环境中启用WASM模块以获得最佳性能', 'blue');
  log('• 定期更新和优化WASM模块', 'blue');
  log('• 监控WASM模块的内存使用情况', 'blue');
  
  return buildResults.failed.length === 0 ? 0 : 1;
}

/**
 * 主函数
 */
async function main() {
  log('开始WASM构建...', 'cyan');
  log('='.repeat(60), 'cyan');
  
  if (!checkBuildEnvironment()) {
    process.exit(1);
  }
  
  createWasmTemplates();
  
  // 构建所有模块
  for (const module of WASM_MODULES) {
    await buildWasmModule(module);
  }
  
  generateTypeScriptBindings();
  
  const exitCode = generateBuildReport();
  process.exit(exitCode);
}

// 运行构建
if (require.main === module) {
  main().catch(error => {
    logError(`WASM构建失败: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  buildWasmModule,
  generateTypeScriptBindings,
  checkBuildEnvironment,
  createWasmTemplates,
  generateBuildReport,
}; 