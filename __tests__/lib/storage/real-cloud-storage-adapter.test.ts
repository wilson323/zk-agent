// @ts-nocheck
/**
 * @file __tests__/lib/storage/real-cloud-storage-adapter.test.ts
 * @description 真实云存储适配器测试 - 无模拟数据的真实测试
 * @author B团队测试工程师
 * @lastUpdate 2024-12-19
 */

import { 
  RealCloudStorageAdapter, 
  CloudProvider,
  realCloudStorageAdapter,
  uploadFile,
  downloadFile,
  deleteFile,
  fileExists,
  getFileInfo,
  listFiles,
  getSignedUrl
} from '@/lib/storage/real-cloud-storage-adapter';
import { Logger } from '@/lib/utils/logger';
import * as fs from 'fs';
import * as path from 'path';

// 测试配置
const TEST_UPLOAD_DIR = path.join(process.cwd(), 'test-uploads');
const TEST_FILE_KEY = 'test-files/sample.txt';
const TEST_FILE_CONTENT = Buffer.from('This is a test file for real cloud storage adapter');

describe('RealCloudStorageAdapter', () => {
  let adapter: RealCloudStorageAdapter;

  beforeAll(async () => {
    // 设置测试环境变量
    process.env.UPLOAD_DIR = TEST_UPLOAD_DIR;
    
    // 确保测试目录存在
    if (!fs.existsSync(TEST_UPLOAD_DIR)) {
      fs.mkdirSync(TEST_UPLOAD_DIR, { recursive: true });
    }

    adapter = RealCloudStorageAdapter.getInstance();
  });

  afterAll(async () => {
    // 清理测试文件
    try {
      if (fs.existsSync(TEST_UPLOAD_DIR)) {
        fs.rmSync(TEST_UPLOAD_DIR, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn('Failed to cleanup test directory:', error.message);
    }
  });

  beforeEach(async () => {
    // 清理可能存在的测试文件
    try {
      await adapter.delete(TEST_FILE_KEY);
    } catch (error) {
      // 忽略删除不存在文件的错误
    }
  });

  describe('单例模式', () => {
    it('应该返回同一个实例', () => {
      const instance1 = RealCloudStorageAdapter.getInstance();
      const instance2 = RealCloudStorageAdapter.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('应该与导出的单例实例相同', () => {
      const instance = RealCloudStorageAdapter.getInstance();
      expect(instance).toBe(realCloudStorageAdapter);
    });
  });

  describe('本地存储功能', () => {
    it('应该成功上传文件到本地存储', async () => {
      const result = await adapter.upload(TEST_FILE_CONTENT, {
        key: TEST_FILE_KEY,
        contentType: 'text/plain',
      });

      expect(result).toMatchObject({
        key: TEST_FILE_KEY,
        size: TEST_FILE_CONTENT.length,
      });
      expect(result.url).toContain('file://');
      expect(result.etag).toBeDefined();
      expect(typeof result.etag).toBe('string');
    });

    it('应该成功下载已上传的文件', async () => {
      // 先上传文件
      await adapter.upload(TEST_FILE_CONTENT, {
        key: TEST_FILE_KEY,
        contentType: 'text/plain',
      });

      // 然后下载文件
      const downloadedContent = await adapter.download({
        key: TEST_FILE_KEY,
      });

      expect(downloadedContent).toEqual(TEST_FILE_CONTENT);
    });

    it('应该正确检查文件是否存在', async () => {
      // 检查不存在的文件
      const existsBefore = await adapter.exists(TEST_FILE_KEY);
      expect(existsBefore).toBe(false);

      // 上传文件
      await adapter.upload(TEST_FILE_CONTENT, {
        key: TEST_FILE_KEY,
        contentType: 'text/plain',
      });

      // 检查存在的文件
      const existsAfter = await adapter.exists(TEST_FILE_KEY);
      expect(existsAfter).toBe(true);
    });

    it('应该成功删除文件', async () => {
      // 先上传文件
      await adapter.upload(TEST_FILE_CONTENT, {
        key: TEST_FILE_KEY,
        contentType: 'text/plain',
      });

      // 确认文件存在
      const existsBefore = await adapter.exists(TEST_FILE_KEY);
      expect(existsBefore).toBe(true);

      // 删除文件
      await adapter.delete(TEST_FILE_KEY);

      // 确认文件已删除
      const existsAfter = await adapter.exists(TEST_FILE_KEY);
      expect(existsAfter).toBe(false);
    });

    it('应该获取正确的文件信息', async () => {
      // 上传文件
      const uploadResult = await adapter.upload(TEST_FILE_CONTENT, {
        key: TEST_FILE_KEY,
        contentType: 'text/plain',
      });

      // 获取文件信息
      const fileInfo = await adapter.getFileInfo(TEST_FILE_KEY);

      expect(fileInfo).toMatchObject({
        key: TEST_FILE_KEY,
        size: TEST_FILE_CONTENT.length,
        etag: uploadResult.etag,
      });
             expect(fileInfo.lastModified).toBeDefined();
       expect(fileInfo.lastModified instanceof Date).toBe(true);
      expect(fileInfo.url).toContain('file://');
    });

    it('应该列出文件', async () => {
      // 上传多个测试文件
      const testFiles = [
        { key: 'test-files/file1.txt', content: Buffer.from('File 1 content') },
        { key: 'test-files/file2.txt', content: Buffer.from('File 2 content') },
        { key: 'other/file3.txt', content: Buffer.from('File 3 content') },
      ];

      for (const file of testFiles) {
        await adapter.upload(file.content, {
          key: file.key,
          contentType: 'text/plain',
        });
      }

      // 列出所有文件
      const allFiles = await adapter.listFiles();
      expect(allFiles.length).toBeGreaterThanOrEqual(testFiles.length);

      // 列出特定前缀的文件
      const testPrefixFiles = await adapter.listFiles('test-files/');
      expect(testPrefixFiles.length).toBe(2);
      expect(testPrefixFiles.every(file => file.key.startsWith('test-files/'))).toBe(true);

      // 清理测试文件
      for (const file of testFiles) {
        await adapter.delete(file.key);
      }
    });

    it('应该生成签名URL', async () => {
      const signedUrl = await adapter.getSignedUrl(TEST_FILE_KEY, 'get');
      expect(signedUrl).toContain('file://');
      expect(signedUrl).toContain(TEST_FILE_KEY);
    });

    it('应该获取存储统计信息', async () => {
      // 上传一些测试文件
      const testFiles = [
        { key: 'stats-test/file1.txt', content: Buffer.from('Content 1') },
        { key: 'stats-test/file2.txt', content: Buffer.from('Content 2') },
      ];

      for (const file of testFiles) {
        await adapter.upload(file.content, {
          key: file.key,
          contentType: 'text/plain',
        });
      }

      const stats = await adapter.getStats();
      expect(stats).toMatchObject({
        totalFiles: expect.any(Number),
        totalSize: expect.any(Number),
        usedQuota: expect.any(Number),
        availableQuota: expect.any(Number),
      });
      expect(stats.totalFiles).toBeGreaterThanOrEqual(testFiles.length);
      expect(stats.totalSize).toBeGreaterThan(0);

      // 清理测试文件
      for (const file of testFiles) {
        await adapter.delete(file.key);
      }
    });
  });

  describe('错误处理', () => {
    it('应该处理下载不存在文件的情况', async () => {
      await expect(adapter.download({
        key: 'non-existent-file.txt',
      })).rejects.toThrow();
    });

    it('应该处理获取不存在文件信息的情况', async () => {
      await expect(adapter.getFileInfo('non-existent-file.txt')).rejects.toThrow();
    });

    it('应该安全处理删除不存在文件的情况', async () => {
      // 删除不存在的文件不应该抛出错误
      await expect(adapter.delete('non-existent-file.txt')).resolves.not.toThrow();
    });
  });

  describe('便捷方法', () => {
    it('uploadFile 方法应该正常工作', async () => {
      const result = await uploadFile(TEST_FILE_CONTENT, {
        key: TEST_FILE_KEY,
        contentType: 'text/plain',
      });

      expect(result.key).toBe(TEST_FILE_KEY);
      expect(result.size).toBe(TEST_FILE_CONTENT.length);
    });

    it('downloadFile 方法应该正常工作', async () => {
      // 先上传文件
      await uploadFile(TEST_FILE_CONTENT, {
        key: TEST_FILE_KEY,
        contentType: 'text/plain',
      });

      // 然后下载文件
      const content = await downloadFile({ key: TEST_FILE_KEY });
      expect(content).toEqual(TEST_FILE_CONTENT);
    });

    it('fileExists 方法应该正常工作', async () => {
      // 检查不存在的文件
      const existsBefore = await fileExists(TEST_FILE_KEY);
      expect(existsBefore).toBe(false);

      // 上传文件
      await uploadFile(TEST_FILE_CONTENT, {
        key: TEST_FILE_KEY,
        contentType: 'text/plain',
      });

      // 检查存在的文件
      const existsAfter = await fileExists(TEST_FILE_KEY);
      expect(existsAfter).toBe(true);
    });

    it('deleteFile 方法应该正常工作', async () => {
      // 先上传文件
      await uploadFile(TEST_FILE_CONTENT, {
        key: TEST_FILE_KEY,
        contentType: 'text/plain',
      });

      // 删除文件
      await deleteFile(TEST_FILE_KEY);

      // 确认文件已删除
      const exists = await fileExists(TEST_FILE_KEY);
      expect(exists).toBe(false);
    });

    it('getFileInfo 方法应该正常工作', async () => {
      // 先上传文件
      await uploadFile(TEST_FILE_CONTENT, {
        key: TEST_FILE_KEY,
        contentType: 'text/plain',
      });

      // 获取文件信息
      const info = await getFileInfo(TEST_FILE_KEY);
      expect(info.key).toBe(TEST_FILE_KEY);
      expect(info.size).toBe(TEST_FILE_CONTENT.length);
    });

    it('listFiles 方法应该正常工作', async () => {
      // 上传测试文件
      await uploadFile(TEST_FILE_CONTENT, {
        key: TEST_FILE_KEY,
        contentType: 'text/plain',
      });

      // 列出文件
      const files = await listFiles('test-files/');
      expect(files.length).toBeGreaterThanOrEqual(1);
      expect(files.some(file => file.key === TEST_FILE_KEY)).toBe(true);
    });

    it('getSignedUrl 方法应该正常工作', async () => {
      const url = await getSignedUrl(TEST_FILE_KEY, 'get');
      expect(url).toContain('file://');
      expect(url).toContain(TEST_FILE_KEY);
    });
  });

  describe('AWS S3 集成检查', () => {
    it('应该在没有AWS凭证时使用本地存储', () => {
      // 确保没有设置AWS环境变量
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;

      // 创建新实例应该默认使用本地存储
      const newAdapter = new (RealCloudStorageAdapter as any)();
      expect(newAdapter).toBeDefined();
    });

    it('应该在有AWS凭证时尝试初始化AWS S3', () => {
      // 设置模拟的AWS环境变量
      process.env.AWS_ACCESS_KEY_ID = 'test-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
      process.env.AWS_REGION = 'us-east-1';
      process.env.AWS_S3_BUCKET = 'test-bucket';

      // 由于没有真实的AWS SDK，这应该会回退到本地存储
      const newAdapter = new (RealCloudStorageAdapter as any)();
      expect(newAdapter).toBeDefined();

      // 清理环境变量
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;
      delete process.env.AWS_REGION;
      delete process.env.AWS_S3_BUCKET;
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内完成文件操作', async () => {
      const startTime = Date.now();

      // 执行一系列文件操作
      await adapter.upload(TEST_FILE_CONTENT, {
        key: TEST_FILE_KEY,
        contentType: 'text/plain',
      });

      const exists = await adapter.exists(TEST_FILE_KEY);
      expect(exists).toBe(true);

      const content = await adapter.download({ key: TEST_FILE_KEY });
      expect(content).toEqual(TEST_FILE_CONTENT);

      await adapter.delete(TEST_FILE_KEY);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 所有操作应该在5秒内完成
      expect(duration).toBeLessThan(5000);
    });

    it('应该高效处理多个小文件', async () => {
      const fileCount = 10;
      const files = Array.from({ length: fileCount }, (_, i) => ({
        key: `perf-test/file-${i}.txt`,
        content: Buffer.from(`Content for file ${i}`),
      }));

      const startTime = Date.now();

      // 并发上传文件
      await Promise.all(files.map(file => 
        adapter.upload(file.content, {
          key: file.key,
          contentType: 'text/plain',
        })
      ));

      // 并发下载文件
      const downloadedContents = await Promise.all(files.map(file =>
        adapter.download({ key: file.key })
      ));

      // 验证下载的内容
      downloadedContents.forEach((content, i) => {
        expect(content).toEqual(files[i].content);
      });

      // 清理文件
      await Promise.all(files.map(file => adapter.delete(file.key)));

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 操作应该在合理时间内完成
      expect(duration).toBeLessThan(10000);
    });
  });
}); 