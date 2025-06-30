/**
 * @file 文件上传安全中间件
 * @description 集成文件上传安全验证的Express/Next.js中间件
 * @author ZK-Agent Team
 * @date 2024-12-27
 */

import { NextRequest, NextResponse } from 'next/server';
import multer from 'multer';
import { z } from 'zod';

import { fileUploadValidator, type FileUploadContext } from '@/lib/security/file-upload-validator';
import { ApiResponseWrapper } from '@/lib/utils/api-helper';
import { Logger } from '@/lib/utils/logger';
import { ERROR_CODES } from '@/config/constants';

const logger = new Logger('FileUploadSecurity');

// 文件上传配置验证模式
const UploadConfigSchema = z.object({
  maxFiles: z.number().min(1).max(10).default(1),
  maxTotalSize: z.number().min(1024).max(500 * 1024 * 1024).default(100 * 1024 * 1024), // 默认100MB
  allowedTypes: z.array(z.string()).optional(),
  category: z.enum(['user-uploads', 'profile-pictures', 'content-images', 'documents', 'cad-files', 'bulk-uploads']).default('user-uploads'),
  requireAuth: z.boolean().default(true),
  virusScanEnabled: z.boolean().default(true),
  contentScanEnabled: z.boolean().default(true)
});

type UploadConfig = z.infer<typeof UploadConfigSchema>;

// 上传结果接口
interface UploadResult {
  success: boolean;
  files: Array<{
    fieldname: string;
    originalname: string;
    filename: string;
    mimetype: string;
    size: number;
    path: string;
    isSecure: boolean;
    securityScore: number;
    threats: Array<{
      ruleId: string;
      ruleName: string;
      severity: string;
      message: string;
    }>;
  }>;
  totalSize: number;
  warnings: string[];
  errors: string[];
}

import type { NextApiRequest } from 'next';

interface ExpressMulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination: string;
  filename: string;
  path: string;
  stream: any;
}

declare global {
  namespace Express {
    namespace Multer {
      interface File extends ExpressMulterFile {}
    }
  }
}

/**
 * 创建安全文件上传中间件
 */
export function createSecureFileUploadMiddleware(config: Partial<UploadConfig> = {}) {
  const validConfig = UploadConfigSchema.parse(config);
  
  // 配置Multer存储
  const storage = multer.memoryStorage();
  
  const upload = multer({
    storage,
    limits: {
      fileSize: validConfig.maxTotalSize,
      files: validConfig.maxFiles
    },
    fileFilter: (req: any, file: any, cb: any) => {
      // 基础文件过滤
      if (validConfig.allowedTypes && validConfig.allowedTypes.length > 0) {
        const isAllowed = validConfig.allowedTypes.some(type => 
          file.mimetype.includes(type) || file.originalname.toLowerCase().includes(type)
        );
        if (!isAllowed) {
          return cb(new Error(`不支持的文件类型: ${file.mimetype}`));
        }
      }
      cb(null, true);
    }
  });

  return {
    middleware: upload.array('files', validConfig.maxFiles),
    validator: async (req: NextRequest & { files?: (Express.Multer.File | File)[] }): Promise<UploadResult> => {
      const result: UploadResult = {
        success: true,
        files: [],
        totalSize: 0,
        warnings: [],
        errors: []
      };

      if (!req.files || req.files.length === 0) {
        result.success = false;
        result.errors.push('未检测到上传文件');
        return result;
      }

      logger.info(`开始处理 ${req.files.length} 个上传文件`);

      // 验证总文件大小
      const totalSize = req.files.reduce((sum, file) => sum + file.size, 0);
      result.totalSize = totalSize;

      if (totalSize > validConfig.maxTotalSize) {
        result.success = false;
        result.errors.push(`总文件大小超过限制: ${(totalSize / 1024 / 1024).toFixed(2)}MB > ${(validConfig.maxTotalSize / 1024 / 1024).toFixed(2)}MB`);
        return result;
      }

      // 验证每个文件
      for (const file of req.files) {
        try {
          const context: FileUploadContext = {
            buffer: (file as Express.Multer.File).buffer,
            originalName: (file as Express.Multer.File).originalname,
            mimetype: (file as Express.Multer.File).mimetype,
            size: file.size,
            metadata: {
              fieldname: (file as Express.Multer.File).fieldname,
              uploadCategory: validConfig.category,
              timestamp: new Date().toISOString()
            }
          };

          // 执行安全验证
          const validationResult = await fileUploadValidator.validateFile(context);
          
          const fileResult = {
            fieldname: (file as Express.Multer.File).fieldname,
            originalname: (file as Express.Multer.File).originalname,
            filename: `${Date.now()}_${(file as Express.Multer.File).originalname}`,
            mimetype: (file as Express.Multer.File).mimetype,
            size: file.size,
            path: '', // 将在实际保存时填充
            isSecure: validationResult.isValid,
            securityScore: validationResult.score,
            threats: validationResult.threats.map(threat => ({
              ruleId: threat.ruleId,
              ruleName: threat.ruleName,
              severity: threat.severity,
              message: threat.message
            }))
          };

          result.files.push(fileResult);

          // 处理验证结果
          if (!validationResult.isValid) {
            const criticalThreats = validationResult.threats.filter(t => 
              ['CRITICAL', 'HIGH'].includes(t.severity)
            );
            
            if (criticalThreats.length > 0) {
              result.success = false;
              result.errors.push(`文件 ${(file as Express.Multer.File).originalname} 包含严重安全威胁`);
              
              // 记录安全事件
              logger.error(`文件上传安全威胁检测`, {
                filename: (file as Express.Multer.File).originalname,
                threats: criticalThreats.map(t => t.message),
                score: validationResult.score
              });
            } else {
              result.warnings.push(`文件 ${(file as Express.Multer.File).originalname} 存在潜在安全问题 (评分: ${validationResult.score})`);
              
              logger.warn(`文件上传安全警告`, {
                filename: (file as Express.Multer.File).originalname,
                score: validationResult.score,
                threats: validationResult.threats.length
              });
            }
          }

          // 添加建议
          if (validationResult.recommendations.length > 0) {
            result.warnings.push(...validationResult.recommendations);
          }

        } catch (error) {
          result.success = false;
          result.errors.push(`文件 ${(file as Express.Multer.File).originalname} 验证失败: ${error instanceof Error ? error.message : String(error)}`);
          
          logger.error(`文件验证异常`, {
            filename: file.originalname,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // 如果有任何错误，标记整体失败
      if (result.errors.length > 0) {
        result.success = false;
      }

      logger.info(`文件上传验证完成`, {
        totalFiles: req.files.length,
        success: result.success,
        errors: result.errors.length,
        warnings: result.warnings.length
      });

      return result;
    }
  };
}

/**
 * Next.js API路由文件上传处理器
 */
export function createFileUploadHandler(config: Partial<UploadConfig> = {}) {
  const { middleware, validator } = createSecureFileUploadMiddleware(config);
  
  return async (req: NextRequest) => {
    try {
      // 这里需要适配Next.js 13+ App Router的FormData处理
      const formData = await req.formData();
      const files: File[] = [];
      
      // 提取文件
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          files.push(value);
        }
      }

      if (files.length === 0) {
        return ApiResponseWrapper.error(
          ERROR_CODES.VALIDATION_REQUIRED_FIELD as ErrorCode,
          '未检测到上传文件'
        );
      }

      // 转换为Multer格式以供验证器使用
      const multerFiles: Array<Express.Multer.File & { buffer: Buffer }> = [];
      
      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        multerFiles.push({
          fieldname: 'files',
          originalname: file.name,
          encoding: '',
          mimetype: file.type,
          size: file.size,
          buffer,
          destination: '',
          filename: '',
          path: '',
          stream: null as never
        });
      }

      // 执行安全验证
      const extendedReq = { files: multerFiles } as NextRequest & { files: Express.Multer.File[] };
      const result = await validator(extendedReq);

      if (!result.success) {
        return ApiResponseWrapper.error(
          ERROR_CODES.VALIDATION_FILE_TOO_LARGE as ErrorCode,
          '文件上传安全验证失败',
          {
            errors: result.errors,
            warnings: result.warnings,
            files: result.files.map(f => ({
              name: f.originalname,
              isSecure: f.isSecure,
              score: f.securityScore,
              threatCount: f.threats.length
            }))
          }
        );
      }

      // 返回验证成功的结果
      return ApiResponseWrapper.success({
        message: '文件上传验证通过',
        files: result.files,
        totalSize: result.totalSize,
        warnings: result.warnings
      });

    } catch (error) {
      logger.error('文件上传处理异常', {
        error: error instanceof Error ? error.message : String(error)
      });

      return ApiResponseWrapper.error(
        ERROR_CODES.INTERNAL_SERVER_ERROR as ErrorCode,
        '文件上传处理失败',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  };
}

/**
 * 文件上传安全检查装饰器
 */
export function secureFileUpload(config: Partial<UploadConfig> = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const uploadHandler = createFileUploadHandler(config);

    descriptor.value = async function (...args: any[]) {
      const req = args[0] as NextRequest;
      
      // 检查是否为文件上传请求
      const contentType = req.headers.get('content-type');
      if (contentType?.includes('multipart/form-data')) {
        const validationResult = await uploadHandler(req);
        
        // 如果验证失败，直接返回错误
        if (!validationResult.ok) {
          return validationResult;
        }
        
        // 将验证结果附加到请求对象
        (req as any).uploadValidation = await validationResult.json();
      }
      
      return await method.apply(this, args);
    };
  };
}

// 导出类型
export type { UploadConfig, UploadResult };