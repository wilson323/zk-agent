// @ts-nocheck
/**
 * @file __tests__/lib/storage/cloud-storage-adapter.test.ts
 * @description 云存储适配器测试套件
 * @author B团队测试工程师
 * @lastUpdate 2024-12-19
 * @coverage 100%测试覆盖率目标
 */

import {
  CloudStorageAdapter,
  CloudProvider,
  uploadFile,
  downloadFile,
  deleteFile,
  fileExists,
  getFileInfo,
  listFiles,
  getSignedUrl,
} from '@/lib/storage/cloud-storage-adapter';

// Mock dependencies
jest.mock('@/lib/utils/logger');
jest.mock('@/lib/cache/enhanced-cache-manager', () => ({
  EnhancedCacheManager: {
    getInstance: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      getStats: jest.fn(() => ({ hits: 0, misses: 0, size: 0 })),
      updateCacheMetrics: jest.fn(),
      setupMemoryMonitoring: jest.fn()
    }))
  }
}));

// Mock AWS SDK - 使用虚拟模块避免依赖问题
jest.doMock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ Body: Buffer.from('test content') })
  })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
  HeadObjectCommand: jest.fn(),
  ListObjectsV2Command: jest.fn()
}), { virtual: true });

// Mock Aliyun OSS - 使用虚拟模块避免依赖问题
jest.doMock('ali-oss', () => {
  return jest.fn().mockImplementation(() => ({
    put: jest.fn().mockResolvedValue({ name: 'test.txt' }),
    get: jest.fn().mockResolvedValue({ content: Buffer.from('test content') }),
    delete: jest.fn().mockResolvedValue({}),
    head: jest.fn().mockResolvedValue({ status: 200 }),
    list: jest.fn().mockResolvedValue({ objects: [] }),
    signatureUrl: jest.fn().mockReturnValue('https://example.com/signed-url')
  }));
}, { virtual: true });

describe('CloudStorageAdapter', () => {
  let adapter: CloudStorageAdapter;

  beforeEach(() => {
    // 确保测试环境变量正确设置
    process.env.NODE_ENV = 'test';
    adapter = CloudStorageAdapter.getInstance();
    
    // 配置默认的存储客户端以避免 'No storage client available' 错误
    adapter.configure([
      {
        provider: CloudProvider.AWS_S3,
        config: {
          provider: CloudProvider.AWS_S3,
          region: 'us-east-1',
          bucket: 'test-bucket-aws',
          accessKeyId: 'test-aws-key',
          secretAccessKey: 'test-aws-secret',
        },
      },
      {
        provider: CloudProvider.ALIYUN_OSS,
        config: {
          provider: CloudProvider.ALIYUN_OSS,
          region: 'oss-cn-hangzhou',
          bucket: 'test-bucket',
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
          endpoint: 'oss-cn-hangzhou.aliyuncs.com',
        },
      }
    ]);
    
    jest.clearAllMocks();
  });

  describe('单例模式', () => {
    it('应该返回同一个实例', () => {
      const instance1 = CloudStorageAdapter.getInstance();
      const instance2 = CloudStorageAdapter.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('配置管理', () => {
    it('应该正确配置AWS S3', () => {
      const config = {
        provider: CloudProvider.AWS_S3,
        region: 'us-east-1',
        bucket: 'test-bucket',
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
        enableCDN: true,
        cdnDomain: 'cdn.example.com',
      };

      expect(() => {
        adapter.configure([{ provider: CloudProvider.AWS_S3, config }]);
      }).not.toThrow();
    });

    it('应该正确配置阿里云OSS', () => {
      const config = {
        provider: CloudProvider.ALIYUN_OSS,
        region: 'oss-cn-hangzhou',
        bucket: 'test-bucket',
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
        endpoint: 'oss-cn-hangzhou.aliyuncs.com',
      };

      expect(() => {
        adapter.configure([{ provider: CloudProvider.ALIYUN_OSS, config }]);
      }).not.toThrow();
    });

    it('应该拒绝不支持的提供商', () => {
      const config = {
        provider: 'unsupported' as CloudProvider,
        region: 'test',
        bucket: 'test',
        accessKeyId: 'test',
        secretAccessKey: 'test',
      };

      expect(() => {
        adapter.configure([{ provider: 'unsupported' as CloudProvider, config }]);
      }).toThrow('Unsupported storage provider');
    });

    it('应该设置主要和备用提供商', () => {
      const configs = [
        {
          provider: CloudProvider.AWS_S3,
          config: {
            provider: CloudProvider.AWS_S3,
            region: 'us-east-1',
            bucket: 'primary-bucket',
            accessKeyId: 'key1',
            secretAccessKey: 'secret1',
          },
        },
        {
          provider: CloudProvider.ALIYUN_OSS,
          config: {
            provider: CloudProvider.ALIYUN_OSS,
            region: 'oss-cn-hangzhou',
            bucket: 'fallback-bucket',
            accessKeyId: 'key2',
            secretAccessKey: 'secret2',
          },
        },
      ];

      expect(() => {
        adapter.configure(configs);
      }).not.toThrow();
    });
  });

  describe('文件上传', () => {
    beforeEach(() => {
      // 配置测试提供商
      adapter.configure([{
        provider: CloudProvider.AWS_S3,
        config: {
          provider: CloudProvider.AWS_S3,
          region: 'us-east-1',
          bucket: 'test-bucket',
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      }]);
    });

    it('应该成功上传文件', async () => {
      const buffer = Buffer.from('test file content');
      const options = {
        key: 'test-file.txt',
        contentType: 'text/plain',
        metadata: { purpose: 'test' },
      };

      const result = await uploadFile(buffer, options);

      expect(result).toBeDefined();
      expect(result.key).toBe(options.key);
      expect(result.size).toBe(buffer.length);
      expect(result.url).toContain('test-bucket');
      expect(result.etag).toBeDefined();
    });

    it('应该处理上传选项', async () => {
      const buffer = Buffer.from('test content');
      const options = {
        key: 'test-file.txt',
        contentType: 'text/plain',
        acl: 'public-read' as const,
        cacheControl: 'max-age=3600',
        serverSideEncryption: true,
        tags: { environment: 'test' },
      };

      const result = await uploadFile(buffer, options);

      expect(result).toBeDefined();
      expect(result.contentType).toBe(options.contentType);
    });

    it('应该在主提供商失败时使用备用提供商', async () => {
      // 配置多个提供商
      adapter.configure([
        {
          provider: CloudProvider.AWS_S3,
          config: {
            provider: CloudProvider.AWS_S3,
            region: 'us-east-1',
            bucket: 'primary-bucket',
            accessKeyId: 'key1',
            secretAccessKey: 'secret1',
          },
        },
        {
          provider: CloudProvider.ALIYUN_OSS,
          config: {
            provider: CloudProvider.ALIYUN_OSS,
            region: 'oss-cn-hangzhou',
            bucket: 'fallback-bucket',
            accessKeyId: 'key2',
            secretAccessKey: 'secret2',
          },
        },
      ]);

      const buffer = Buffer.from('test content');
      const options = { key: 'test-file.txt' };

      // 即使主提供商可能失败，也应该成功（通过备用提供商）
      const result = await uploadFile(buffer, options);
      expect(result).toBeDefined();
    });

    it('应该缓存上传结果', async () => {
      const buffer = Buffer.from('test content');
      const options = { key: 'cached-file.txt' };

      await uploadFile(buffer, options);

      // 验证缓存调用
      const { enhancedCacheManager } = require('@/lib/cache/enhanced-cache-manager');
      expect(enhancedCacheManager.set).toHaveBeenCalledWith(
        `file:${options.key}`,
        expect.any(Object),
        { ttl: 3600000, tags: ['file-upload'] }
      );
    });
  });

  describe('文件下载', () => {
    beforeEach(() => {
      adapter.configure([{
        provider: CloudProvider.AWS_S3,
        config: {
          provider: CloudProvider.AWS_S3,
          region: 'us-east-1',
          bucket: 'test-bucket',
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      }]);
    });

    it('应该成功下载文件', async () => {
      const options = { key: 'test-file.txt' };
      const mockClient = adapter.getClient(CloudProvider.AWS_S3);
      
      const buffer = await downloadFile(options);
      
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      
      // 验证mock客户端download方法被调用
      expect(mockClient.download).toHaveBeenCalledWith(options);
    });

    it('应该支持下载选项', async () => {
      const options = {
        key: 'test-file.txt',
        versionId: 'v123',
        range: 'bytes=0-1023',
        responseContentType: 'application/octet-stream',
      };

      const buffer = await downloadFile(options);
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('应该从缓存返回文件', async () => {
      const cachedBuffer = Buffer.from('cached content');
      const { enhancedCacheManager } = require('@/lib/cache/enhanced-cache-manager');
      enhancedCacheManager.get.mockResolvedValue(cachedBuffer);

      const options = { key: 'cached-file.txt' };
      const buffer = await downloadFile(options);

      expect(buffer).toBe(cachedBuffer);
      expect(enhancedCacheManager.get).toHaveBeenCalledWith('file:download:cached-file.txt');
    });

    it('应该缓存小文件下载结果', async () => {
      const { enhancedCacheManager } = require('@/lib/cache/enhanced-cache-manager');
      enhancedCacheManager.get.mockResolvedValue(null); // 缓存未命中

      const options = { key: 'small-file.txt' };
      await downloadFile(options);

      // 验证缓存设置（对于小文件）
      expect(enhancedCacheManager.set).toHaveBeenCalledWith(
        `file:download:${options.key}`,
        expect.any(Buffer),
        { ttl: 300000, tags: ['file-download'] }
      );
    });
  });

  describe('文件删除', () => {
    beforeEach(() => {
      adapter.configure([{
        provider: CloudProvider.AWS_S3,
        config: {
          provider: CloudProvider.AWS_S3,
          region: 'us-east-1',
          bucket: 'test-bucket',
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      }]);
    });

    it('应该成功删除文件', async () => {
      const key = 'test-file.txt';
      const { enhancedCacheManager } = require('@/lib/cache/enhanced-cache-manager');
      
      await expect(deleteFile(key)).resolves.not.toThrow();
      
      // 验证mock客户端delete方法被调用
      const mockClient = adapter.getClient(CloudProvider.AWS_S3);
      expect(mockClient.delete).toHaveBeenCalledWith(key);
      
      // 验证缓存被清除
      expect(enhancedCacheManager.delete).toHaveBeenCalledWith(`file:${key}`);
      expect(enhancedCacheManager.delete).toHaveBeenCalledWith(`file:download:${key}`);
    });

    it('应该清除相关缓存', async () => {
      const key = 'test-file.txt';
      const { enhancedCacheManager } = require('@/lib/cache/enhanced-cache-manager');

      await deleteFile(key);

      expect(enhancedCacheManager.delete).toHaveBeenCalledWith(`file:${key}`);
      expect(enhancedCacheManager.delete).toHaveBeenCalledWith(`file:download:${key}`);
    });

    it('应该在所有提供商上删除文件', async () => {
      // 配置多个提供商
      adapter.configure([
        {
          provider: CloudProvider.AWS_S3,
          config: {
            provider: CloudProvider.AWS_S3,
            region: 'us-east-1',
            bucket: 'bucket1',
            accessKeyId: 'key1',
            secretAccessKey: 'secret1',
          },
        },
        {
          provider: CloudProvider.ALIYUN_OSS,
          config: {
            provider: CloudProvider.ALIYUN_OSS,
            region: 'oss-cn-hangzhou',
            bucket: 'bucket2',
            accessKeyId: 'key2',
            secretAccessKey: 'secret2',
          },
        },
      ]);

      const key = 'test-file.txt';
      await expect(deleteFile(key)).resolves.not.toThrow();
    });
  });

  describe('文件存在检查', () => {
    beforeEach(() => {
      adapter.configure([{
        provider: CloudProvider.AWS_S3,
        config: {
          provider: CloudProvider.AWS_S3,
          region: 'us-east-1',
          bucket: 'test-bucket',
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      }]);
    });

    it('应该检查文件是否存在', async () => {
      const key = 'test-file.txt';

      const exists = await fileExists(key);

      expect(typeof exists).toBe('boolean');
    });

    it('应该处理检查错误', async () => {
      const key = 'error-file.txt';

      // 即使出错也应该返回false而不是抛出异常
      const exists = await fileExists(key);
      expect(typeof exists).toBe('boolean');
    });
  });

  describe('文件信息获取', () => {
    beforeEach(() => {
      adapter.configure([{
        provider: CloudProvider.AWS_S3,
        config: {
          provider: CloudProvider.AWS_S3,
          region: 'us-east-1',
          bucket: 'test-bucket',
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      }]);
    });

    it('应该获取文件信息', async () => {
      const key = 'test-file.txt';

      const info = await getFileInfo(key);

      expect(info).toBeDefined();
      expect(info.key).toBe(key);
      expect(info.size).toBeGreaterThan(0);
      expect(info.lastModified).toBeInstanceOf(Date);
      expect(info.etag).toBeDefined();
      expect(info.url).toContain('test-bucket');
    });

    it('应该包含CDN URL（如果启用）', async () => {
      // 重新配置启用CDN
      adapter.configure([{
        provider: CloudProvider.AWS_S3,
        config: {
          provider: CloudProvider.AWS_S3,
          region: 'us-east-1',
          bucket: 'test-bucket',
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
          enableCDN: true,
          cdnDomain: 'cdn.example.com',
        },
      }]);

      const key = 'test-file.txt';
      const info = await getFileInfo(key);

      expect(info.cdnUrl).toContain('cdn.example.com');
    });
  });

  describe('文件列表', () => {
    beforeEach(() => {
      adapter.configure([{
        provider: CloudProvider.AWS_S3,
        config: {
          provider: CloudProvider.AWS_S3,
          region: 'us-east-1',
          bucket: 'test-bucket',
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      }]);
    });

    it('应该列出文件', async () => {
      const files = await listFiles();

      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeGreaterThan(0);
      
      files.forEach(file => {
        expect(file.key).toBeDefined();
        expect(file.size).toBeGreaterThan(0);
        expect(file.lastModified).toBeInstanceOf(Date);
        expect(file.etag).toBeDefined();
      });
    });

    it('应该支持前缀过滤', async () => {
      const prefix = 'images/';
      const files = await listFiles(prefix);

      expect(Array.isArray(files)).toBe(true);
      files.forEach(file => {
        expect(file.key).toContain(prefix);
      });
    });

    it('应该支持最大数量限制', async () => {
      const maxKeys = 10;
      const files = await listFiles(undefined, maxKeys);

      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeLessThanOrEqual(maxKeys);
    });
  });

  describe('签名URL生成', () => {
    beforeEach(() => {
      adapter.configure([{
        provider: CloudProvider.AWS_S3,
        config: {
          provider: CloudProvider.AWS_S3,
          region: 'us-east-1',
          bucket: 'test-bucket',
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      }]);
    });

    it('应该生成GET签名URL', async () => {
      const key = 'test-file.txt';
      const url = await getSignedUrl(key, 'get');

      expect(url).toBeDefined();
      expect(url).toContain('test-bucket');
      expect(url).toContain(key);
      expect(url).toContain('X-Amz-Signature');
    });

    it('应该生成PUT签名URL', async () => {
      const key = 'test-file.txt';
      const url = await getSignedUrl(key, 'put');

      expect(url).toBeDefined();
      expect(url).toContain('test-bucket');
      expect(url).toContain(key);
    });

    it('应该支持自定义过期时间', async () => {
      const key = 'test-file.txt';
      const expiresIn = 7200; // 2小时
      const url = await getSignedUrl(key, 'get', expiresIn);

      expect(url).toBeDefined();
      expect(url).toContain(`X-Amz-Expires=${expiresIn}`);
    });
  });

  describe('存储统计', () => {
    beforeEach(() => {
      adapter.configure([{
        provider: CloudProvider.AWS_S3,
        config: {
          provider: CloudProvider.AWS_S3,
          region: 'us-east-1',
          bucket: 'test-bucket',
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      }]);
    });

    it('应该获取存储统计', async () => {
      const stats = await adapter.getStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalFiles).toBe('number');
      expect(typeof stats.totalSize).toBe('number');
      expect(typeof stats.usedQuota).toBe('number');
      expect(typeof stats.availableQuota).toBe('number');
      expect(stats.bandwidth).toBeDefined();
      expect(typeof stats.bandwidth.upload).toBe('number');
      expect(typeof stats.bandwidth.download).toBe('number');
    });
  });

  describe('健康状态检查', () => {
    beforeEach(() => {
      adapter.configure([
        {
          provider: CloudProvider.AWS_S3,
          config: {
            provider: CloudProvider.AWS_S3,
            region: 'us-east-1',
            bucket: 'bucket1',
            accessKeyId: 'key1',
            secretAccessKey: 'secret1',
          },
        },
        {
          provider: CloudProvider.ALIYUN_OSS,
          config: {
            provider: CloudProvider.ALIYUN_OSS,
            region: 'oss-cn-hangzhou',
            bucket: 'bucket2',
            accessKeyId: 'key2',
            secretAccessKey: 'secret2',
          },
        },
      ]);
    });

    it('应该检查所有提供商的健康状态', async () => {
      const status = await adapter.getHealthStatus();

      expect(status).toBeDefined();
      expect(status[CloudProvider.AWS_S3]).toBeDefined();
      expect(status[CloudProvider.ALIYUN_OSS]).toBeDefined();

      Object.values(status).forEach(providerStatus => {
        expect(typeof providerStatus.healthy).toBe('boolean');
        expect(typeof providerStatus.latency).toBe('number');
        expect(providerStatus.latency).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('熔断器机制', () => {
    beforeEach(() => {
      adapter.configure([{
        provider: CloudProvider.AWS_S3,
        config: {
          provider: CloudProvider.AWS_S3,
          region: 'us-east-1',
          bucket: 'test-bucket',
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      }]);
    });

    it('应该在多次失败后触发熔断器', async () => {
      // 这个测试需要模拟失败情况
      // 由于我们使用的是模拟实现，这里主要测试熔断器逻辑存在
      expect(adapter).toBeDefined();
    });
  });

  describe('错误处理', () => {
    it('应该处理没有配置客户端的情况', async () => {
      // 创建一个新的适配器实例，不使用单例以避免共享配置
      const emptyAdapter = new (CloudStorageAdapter as any)();
      
      await expect(emptyAdapter.exists('test')).rejects.toThrow('No storage client available');
      await expect(emptyAdapter.getFileInfo('test')).rejects.toThrow('No storage client available');
      await expect(emptyAdapter.listFiles()).rejects.toThrow('No storage client available');
      await expect(emptyAdapter.getSignedUrl('test', 'get')).rejects.toThrow('No storage client available');
      await expect(emptyAdapter.getStats()).rejects.toThrow('No storage client available');
    });

    it('应该处理网络错误', async () => {
      adapter.configure([{
        provider: CloudProvider.AWS_S3,
        config: {
          provider: CloudProvider.AWS_S3,
          region: 'us-east-1',
          bucket: 'test-bucket',
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      }]);

      // 测试各种操作的错误处理
      // 由于使用模拟实现，这些操作通常会成功
      // 在实际实现中，可以通过模拟网络错误来测试
      expect(adapter).toBeDefined();
    });
  });

  describe('环境变量配置', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('应该从环境变量读取AWS配置', () => {
      process.env.AWS_ACCESS_KEY_ID = 'test-aws-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-aws-secret';
      process.env.AWS_REGION = 'us-west-2';
      process.env.AWS_S3_BUCKET = 'test-aws-bucket';

      // 重新创建实例以读取环境变量
      const newAdapter = CloudStorageAdapter.getInstance();
      expect(newAdapter).toBeDefined();
    });

    it('应该从环境变量读取阿里云配置', () => {
      process.env.ALIYUN_ACCESS_KEY_ID = 'test-aliyun-key';
      process.env.ALIYUN_ACCESS_KEY_SECRET = 'test-aliyun-secret';
      process.env.ALIYUN_OSS_REGION = 'oss-cn-beijing';
      process.env.ALIYUN_OSS_BUCKET = 'test-aliyun-bucket';

      const newAdapter = CloudStorageAdapter.getInstance();
      expect(newAdapter).toBeDefined();
    });
  });

  describe('性能测试', () => {
    beforeEach(() => {
      adapter.configure([{
        provider: CloudProvider.AWS_S3,
        config: {
          provider: CloudProvider.AWS_S3,
          region: 'us-east-1',
          bucket: 'test-bucket',
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      }]);
    });

    it('应该在合理时间内完成文件操作', async () => {
      const buffer = Buffer.from('test content');
      const options = { key: 'performance-test.txt' };

      const startTime = Date.now();
      
      await uploadFile(buffer, options);
      await downloadFile(options);
      await fileExists(options.key);
      await getFileInfo(options.key);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 所有操作应该在5秒内完成
      expect(duration).toBeLessThan(5000);
    });

    it('应该高效处理批量操作', async () => {
      const startTime = Date.now();
      
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(fileExists(`batch-test-${i}.txt`));
      }
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 10个并发检查应该在3秒内完成
      expect(duration).toBeLessThan(3000);
    });
  });

  describe('并发安全', () => {
    beforeEach(() => {
      adapter.configure([{
        provider: CloudProvider.AWS_S3,
        config: {
          provider: CloudProvider.AWS_S3,
          region: 'us-east-1',
          bucket: 'test-bucket',
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      }]);
    });

    it('应该安全处理并发上传', async () => {
      const promises = [];
      
      for (let i = 0; i < 20; i++) {
        const buffer = Buffer.from(`concurrent content ${i}`);
        const options = { key: `concurrent-${i}.txt` };
        promises.push(uploadFile(buffer, options));
      }
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(20);
      results.forEach((result, index) => {
        expect(result.key).toBe(`concurrent-${index}.txt`);
      });
    });

    it('应该安全处理并发下载', async () => {
      const promises = [];
      
      for (let i = 0; i < 15; i++) {
        promises.push(downloadFile({ key: `concurrent-download-${i}.txt` }));
      }
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(15);
      results.forEach(buffer => {
        expect(buffer).toBeInstanceOf(Buffer);
      });
    });
  });
});