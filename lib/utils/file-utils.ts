/**
 * 文件处理工具函数
 * 提供文件上传、下载、格式验证等功能
 * @author ZK-Agent Team
 * @version 1.0.0
 */

import { SUPPORTED_FILE_TYPES, FILE_SIZE_LIMITS } from '../constants';
import type { ValidationResult, FileInfo } from '../types/interfaces';

// ============================================================================
// 文件验证工具函数
// ============================================================================

/**
 * 验证文件类型
 * @param file - 文件对象
 * @param allowedTypes - 允许的文件类型数组
 * @returns 验证结果
 */
export function validateFileType(file: File, allowedTypes: string[]): ValidationResult {
  const isValid = allowedTypes.includes(file.type);
  return {
    isValid,
    errors: isValid ? [] : [`不支持的文件类型: ${file.type}`]
  };
}

/**
 * 验证文件大小
 * @param file - 文件对象
 * @param maxSize - 最大文件大小（字节）
 * @returns 验证结果
 */
export function validateFileSize(file: File, maxSize: number): ValidationResult {
  const isValid = file.size <= maxSize;
  return {
    isValid,
    errors: isValid ? [] : [`文件大小超出限制，最大允许 ${formatFileSize(maxSize)}`]
  };
}

/**
 * 验证图片文件
 * @param file - 文件对象
 * @returns 验证结果
 */
export function validateImageFile(file: File): ValidationResult {
  const typeValidation = validateFileType(file, SUPPORTED_FILE_TYPES.IMAGES);
  if (!typeValidation.isValid) {
    return typeValidation;
  }
  
  return validateFileSize(file, FILE_SIZE_LIMITS.IMAGE);
}

/**
 * 验证文档文件
 * @param file - 文件对象
 * @returns 验证结果
 */
export function validateDocumentFile(file: File): ValidationResult {
  const typeValidation = validateFileType(file, SUPPORTED_FILE_TYPES.DOCUMENTS);
  if (!typeValidation.isValid) {
    return typeValidation;
  }
  
  return validateFileSize(file, FILE_SIZE_LIMITS.DOCUMENT);
}

/**
 * 验证CAD文件
 * @param file - 文件对象
 * @returns 验证结果
 */
export function validateCADFile(file: File): ValidationResult {
  const typeValidation = validateFileType(file, SUPPORTED_FILE_TYPES.CAD_FILES);
  if (!typeValidation.isValid) {
    return typeValidation;
  }
  
  return validateFileSize(file, FILE_SIZE_LIMITS.CAD);
}

/**
 * 验证音频文件
 * @param file - 文件对象
 * @returns 验证结果
 */
export function validateAudioFile(file: File): ValidationResult {
  const typeValidation = validateFileType(file, SUPPORTED_FILE_TYPES.AUDIO);
  if (!typeValidation.isValid) {
    return typeValidation;
  }
  
  return validateFileSize(file, FILE_SIZE_LIMITS.GENERAL);
}

/**
 * 验证视频文件
 * @param file - 文件对象
 * @returns 验证结果
 */
export function validateVideoFile(file: File): ValidationResult {
  const typeValidation = validateFileType(file, SUPPORTED_FILE_TYPES.VIDEO);
  if (!typeValidation.isValid) {
    return typeValidation;
  }
  
  return validateFileSize(file, FILE_SIZE_LIMITS.VIDEO);
}

// ============================================================================
// 文件信息提取工具函数
// ============================================================================

/**
 * 获取文件扩展名
 * @param filename - 文件名
 * @returns 文件扩展名（不包含点号）
 */
export function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex === -1 ? '' : filename.slice(lastDotIndex + 1).toLowerCase();
}

/**
 * 获取文件名（不包含扩展名）
 * @param filename - 完整文件名
 * @returns 不包含扩展名的文件名
 */
export function getFileNameWithoutExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex === -1 ? filename : filename.slice(0, lastDotIndex);
}

/**
 * 生成唯一文件名
 * @param originalName - 原始文件名
 * @param timestamp - 是否添加时间戳，默认为true
 * @returns 唯一文件名
 */
export function generateUniqueFileName(originalName: string, timestamp = true): string {
  const extension = getFileExtension(originalName);
  const nameWithoutExt = getFileNameWithoutExtension(originalName);
  
  if (timestamp) {
    const now = Date.now();
    return `${nameWithoutExt}_${now}.${extension}`;
  }
  
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${nameWithoutExt}_${randomSuffix}.${extension}`;
}

/**
 * 从文件对象创建FileInfo
 * @param file - 文件对象
 * @returns FileInfo对象
 */
export function createFileInfo(file: File): FileInfo {
  return {
    id: crypto.randomUUID(), // Assuming a UUID is generated for new files
    name: file.name,
    size: file.size,
    type: file.type,
    mimeType: file.type, // Assuming mimeType is the same as type for simplicity
    path: '', // Path is usually determined after upload
    extension: getFileExtension(file.name),
    uploadedAt: new Date(),
    lastModified: new Date(file.lastModified),
  };
}

// ============================================================================
// 文件读取工具函数
// ============================================================================

/**
 * 读取文件为文本
 * @param file - 文件对象
 * @param encoding - 编码格式，默认为'utf-8'
 * @returns Promise<string>
 */
export function readFileAsText(file: File, encoding = 'utf-8'): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, encoding);
  });
}

/**
 * 读取文件为Data URL
 * @param file - 文件对象
 * @returns Promise<string>
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * 读取文件为ArrayBuffer
 * @param file - 文件对象
 * @returns Promise<ArrayBuffer>
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

// ============================================================================
// 图片处理工具函数
// ============================================================================

/**
 * 获取图片尺寸
 * @param file - 图片文件
 * @returns Promise<{width: number, height: number}>
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * 压缩图片
 * @param file - 图片文件
 * @param maxWidth - 最大宽度
 * @param maxHeight - 最大高度
 * @param quality - 压缩质量 (0-1)
 * @returns Promise<Blob>
 */
export function compressImage(
  file: File,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // 计算新的尺寸
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // 绘制压缩后的图片
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        file.type,
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * 创建图片缩略图
 * @param file - 图片文件
 * @param size - 缩略图尺寸
 * @returns Promise<string> - Data URL
 */
export function createImageThumbnail(file: File, size = 150): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = size;
      canvas.height = size;
      
      // 计算裁剪区域（居中裁剪）
      const { width, height } = img;
      const minDimension = Math.min(width, height);
      const x = (width - minDimension) / 2;
      const y = (height - minDimension) / 2;
      
      ctx?.drawImage(
        img,
        x, y, minDimension, minDimension,
        0, 0, size, size
      );
      
      resolve(canvas.toDataURL());
    };
    
    img.onerror = () => reject(new Error('Failed to create thumbnail'));
    img.src = URL.createObjectURL(file);
  });
}

// ============================================================================
// 文件下载工具函数
// ============================================================================

/**
 * 下载文件
 * @param data - 文件数据（Blob、ArrayBuffer或字符串）
 * @param filename - 文件名
 * @param mimeType - MIME类型
 */
export function downloadFile(
  data: Blob | ArrayBuffer | string,
  filename: string,
  mimeType?: string
): void {
  let blob: Blob;
  
  if (data instanceof Blob) {
    blob = data;
  } else if (data instanceof ArrayBuffer) {
    blob = new Blob([data], { type: mimeType });
  } else {
    blob = new Blob([data], { type: mimeType || 'text/plain' });
  }
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 下载JSON数据
 * @param data - JSON数据
 * @param filename - 文件名
 */
export function downloadJSON(data: any, filename: string): void {
  const jsonString = JSON.stringify(data, null, 2);
  downloadFile(jsonString, filename, 'application/json');
}

/**
 * 下载CSV数据
 * @param data - 二维数组数据
 * @param filename - 文件名
 * @param headers - 表头
 */
export function downloadCSV(
  data: string[][],
  filename: string,
  headers?: string[]
): void {
  const csvContent = [];
  
  if (headers) {
    csvContent.push(headers.join(','));
  }
  
  data.forEach(row => {
    csvContent.push(row.map(cell => `"${cell}"`).join(','));
  });
  
  downloadFile(csvContent.join('\n'), filename, 'text/csv');
}

// ============================================================================
// 文件上传工具函数
// ============================================================================

/**
 * 创建文件上传FormData
 * @param file - 文件对象
 * @param fieldName - 字段名，默认为'file'
 * @param additionalData - 额外数据
 * @returns FormData对象
 */
export function createUploadFormData(
  file: File,
  fieldName = 'file',
  additionalData?: Record<string, string | number | boolean>
): FormData {
  const formData = new FormData();
  formData.append(fieldName, file);
  
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
  }
  
  return formData;
}

/**
 * 批量文件上传FormData
 * @param files - 文件数组
 * @param fieldName - 字段名，默认为'files'
 * @param additionalData - 额外数据
 * @returns FormData对象
 */
export function createBatchUploadFormData(
  files: File[],
  fieldName = 'files',
  additionalData?: Record<string, string | number | boolean>
): FormData {
  const formData = new FormData();
  
  files.forEach(file => {
    formData.append(fieldName, file);
  });
  
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, String(value));
    });
  }
  
  return formData;
}

// ============================================================================
// 文件格式化工具函数
// ============================================================================

/**
 * 格式化文件大小
 * @param bytes - 字节数
 * @param decimals - 小数位数
 * @returns 格式化后的文件大小字符串
 */
export function formatFileSize(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 获取文件类型图标
 * @param fileType - 文件MIME类型或扩展名
 * @returns 文件类型图标
 */
export function getFileTypeIcon(fileType: string): string {
  const type = fileType.toLowerCase();
  
  if (type.includes('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(type)) {
    return '🖼️';
  }
  
  if (type.includes('video/') || ['mp4', 'avi', 'mov', 'wmv', 'flv'].includes(type)) {
    return '🎥';
  }
  
  if (type.includes('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(type)) {
    return '🎵';
  }
  
  if (type.includes('pdf') || type === 'pdf') {
    return '📄';
  }
  
  if (type.includes('word') || ['doc', 'docx'].includes(type)) {
    return '📝';
  }
  
  if (type.includes('excel') || type.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(type)) {
    return '📊';
  }
  
  if (type.includes('powerpoint') || type.includes('presentation') || ['ppt', 'pptx'].includes(type)) {
    return '📈';
  }
  
  if (type.includes('zip') || type.includes('rar') || type.includes('7z') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(type)) {
    return '🗜️';
  }
  
  if (type.includes('text/') || ['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts'].includes(type)) {
    return '📄';
  }
  
  return '📁';
}

// ============================================================================
// 文件拖拽工具函数
// ============================================================================

/**
 * 处理拖拽文件事件
 * @param event - 拖拽事件
 * @returns 文件数组
 */
export function handleDropFiles(event: DragEvent): File[] {
  event.preventDefault();
  
  const files: File[] = [];
  
  if (event.dataTransfer?.items) {
    // 使用DataTransferItemList接口
    for (let i = 0; i < event.dataTransfer.items.length; i++) {
      const item = event.dataTransfer.items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }
  } else if (event.dataTransfer?.files) {
    // 使用FileList接口
    for (let i = 0; i < event.dataTransfer.files.length; i++) {
      files.push(event.dataTransfer.files[i]);
    }
  }
  
  return files;
}

/**
 * 检查是否为拖拽文件事件
 * @param event - 拖拽事件
 * @returns 是否包含文件
 */
export function isDragEventWithFiles(event: DragEvent): boolean {
  if (!event.dataTransfer) return false;
  
  return Array.from(event.dataTransfer.types).includes('Files');
}