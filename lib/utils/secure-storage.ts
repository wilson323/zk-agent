/**
 * 安全存储工具类
 * 提供加密的本地存储解决方案，替代直接使用localStorage
 */

import CryptoJS from 'crypto-js';

// 存储配置
interface StorageConfig {
  encrypt?: boolean;
  expiry?: number; // 过期时间（毫秒）
  prefix?: string;
}

// 存储项结构
interface StorageItem {
  value: any;
  timestamp: number;
  expiry?: number;
  encrypted?: boolean;
}

class SecureStorage {
  private secretKey: string;
  private defaultConfig: StorageConfig;

  constructor(secretKey?: string) {
    this.secretKey = secretKey || this.generateSecretKey();
    this.defaultConfig = {
      encrypt: true,
      prefix: 'zk_agent_'
    };
  }

  /**
   * 生成密钥
   */
  private generateSecretKey(): string {
    return CryptoJS.lib.WordArray.random(256/8).toString();
  }

  /**
   * 加密数据
   */
  private encrypt(data: string): string {
    try {
      return CryptoJS.AES.encrypt(data, this.secretKey).toString();
    } catch (error) {
      console.warn('加密失败，使用原始数据:', error);
      return data;
    }
  }

  /**
   * 解密数据
   */
  private decrypt(encryptedData: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.secretKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.warn('解密失败，返回原始数据:', error);
      return encryptedData;
    }
  }

  /**
   * 生成存储键名
   */
  private getStorageKey(key: string, config?: StorageConfig): string {
    const prefix = config?.prefix || this.defaultConfig.prefix;
    return `${prefix}${key}`;
  }

  /**
   * 检查是否过期
   */
  private isExpired(item: StorageItem): boolean {
    if (!item.expiry) return false;
    return Date.now() > item.timestamp + item.expiry;
  }

  /**
   * 设置存储项
   */
  setItem(key: string, value: any, config?: StorageConfig): boolean {
    try {
      const mergedConfig = { ...this.defaultConfig, ...config };
      const storageKey = this.getStorageKey(key, mergedConfig);
      
      const item: StorageItem = {
        value,
        timestamp: Date.now(),
        expiry: mergedConfig.expiry,
        encrypted: mergedConfig.encrypt
      };

      let serializedData = JSON.stringify(item);
      
      if (mergedConfig.encrypt) {
        serializedData = this.encrypt(serializedData);
      }

      localStorage.setItem(storageKey, serializedData);
      return true;
    } catch (error) {
      console.error('存储设置失败:', error);
      return false;
    }
  }

  /**
   * 获取存储项
   */
  getItem<T = any>(key: string, config?: StorageConfig): T | null {
    try {
      const mergedConfig = { ...this.defaultConfig, ...config };
      const storageKey = this.getStorageKey(key, mergedConfig);
      
      const rawData = localStorage.getItem(storageKey);
      if (!rawData) return null;

      let serializedData = rawData;
      
      // 尝试解密（如果数据是加密的）
      if (mergedConfig.encrypt) {
        serializedData = this.decrypt(rawData);
      }

      const item: StorageItem = JSON.parse(serializedData);
      
      // 检查是否过期
      if (this.isExpired(item)) {
        this.removeItem(key, config);
        return null;
      }

      return item.value;
    } catch (error) {
      console.error('存储获取失败:', error);
      return null;
    }
  }

  /**
   * 移除存储项
   */
  removeItem(key: string, config?: StorageConfig): boolean {
    try {
      const mergedConfig = { ...this.defaultConfig, ...config };
      const storageKey = this.getStorageKey(key, mergedConfig);
      localStorage.removeItem(storageKey);
      return true;
    } catch (error) {
      console.error('存储移除失败:', error);
      return false;
    }
  }

  /**
   * 清空所有相关存储
   */
  clear(config?: StorageConfig): boolean {
    try {
      const mergedConfig = { ...this.defaultConfig, ...config };
      const prefix = mergedConfig.prefix;
      
      const keysToRemove: string[] = [];
      for (let i = 0; i < secureStorage.getAllKeys().length; i++) {
        const key = secureStorage.getAllKeys()[i];
        if (key && key.startsWith(prefix!)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.error('存储清空失败:', error);
      return false;
    }
  }

  /**
   * 获取所有键名
   */
  getAllKeys(config?: StorageConfig): string[] {
    try {
      const mergedConfig = { ...this.defaultConfig, ...config };
      const prefix = mergedConfig.prefix;
      const keys: string[] = [];
      
      for (let i = 0; i < secureStorage.getAllKeys().length; i++) {
        const key = secureStorage.getAllKeys()[i];
        if (key && key.startsWith(prefix!)) {
          keys.push(key.replace(prefix!, ''));
        }
      }
      
      return keys;
    } catch (error) {
      console.error('获取键名失败:', error);
      return [];
    }
  }

  /**
   * 检查存储项是否存在
   */
  hasItem(key: string, config?: StorageConfig): boolean {
    return this.getItem(key, config) !== null;
  }

  /**
   * 获取存储大小（字节）
   */
  getStorageSize(config?: StorageConfig): number {
    try {
      const mergedConfig = { ...this.defaultConfig, ...config };
      const prefix = mergedConfig.prefix;
      let totalSize = 0;
      
      for (let i = 0; i < secureStorage.getAllKeys().length; i++) {
        const key = secureStorage.getAllKeys()[i];
        if (key && key.startsWith(prefix!)) {
          const value = localStorage.getItem(key);
          if (value) {
            totalSize += key.length + value.length;
          }
        }
      }
      
      return totalSize;
    } catch (error) {
      console.error('获取存储大小失败:', error);
      return 0;
    }
  }

  /**
   * 清理过期项
   */
  cleanExpired(config?: StorageConfig): number {
    try {
      const mergedConfig = { ...this.defaultConfig, ...config };
      const keys = this.getAllKeys(mergedConfig);
      let cleanedCount = 0;
      
      keys.forEach(key => {
        const item = this.getItem(key, mergedConfig);
        if (item === null) {
          cleanedCount++;
        }
      });
      
      return cleanedCount;
    } catch (error) {
      console.error('清理过期项失败:', error);
      return 0;
    }
  }
}

// 创建默认实例
export const secureStorage = new SecureStorage();

// 导出类供自定义使用
export { SecureStorage };

// 兼容性接口，用于替换localStorage
export const createSecureStorageAdapter = (config?: StorageConfig) => {
  const storage = new SecureStorage();
  
  return {
    setItem: (key: string, value: string) => {
      return storage.setItem(key, value, { ...config, encrypt: false });
    },
    getItem: (key: string): string | null => {
      return storage.getItem(key, { ...config, encrypt: false });
    },
    removeItem: (key: string) => {
      return storage.removeItem(key, config);
    },
    clear: () => {
      return storage.clear(config);
    },
    get length() {
      return storage.getAllKeys(config).length;
    },
    key: (index: number): string | null => {
      const keys = storage.getAllKeys(config);
      return keys[index] || null;
    }
  };
};

// 类型定义
export type { StorageConfig, StorageItem };