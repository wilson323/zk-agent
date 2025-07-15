/**
 * ZK-Agent Circuit Manager
 * ZK电路管理器 - 负责电路的加载、管理和维护
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { ZKCircuitConfig, IZKCircuitManager, ZKError, ZKErrorType, ZKEvent, ZKEventType } from './types';
import { DEFAULT_CIRCUITS, ZK_LIMITS } from './constants';
import { ZKUtils } from './utils';
import { EventEmitter } from 'events';
import { logger } from '@/lib/utils/logger';

export class ZKCircuitManager extends EventEmitter implements IZKCircuitManager {
  private circuits: Map<string, ZKCircuitConfig> = new Map();
  private loadedCircuits: Map<string, any> = new Map();
  private circuitCache: Map<string, { wasm: Buffer; zkey: Buffer; vkey: any }> = new Map();

  constructor() {
    super();
    this.initializeDefaultCircuits();
  }

  /**
   * 初始化默认电路
   */
  private async initializeDefaultCircuits(): Promise<void> {
    try {
      for (const [key, config] of Object.entries(DEFAULT_CIRCUITS)) {
        await this.loadCircuit(config);
      }
      this.emitEvent(ZKEventType.SYSTEM_INITIALIZED, { circuitsLoaded: this.circuits.size });
    } catch (error) {
      logger.warn('默认电路初始化失败:', error);
    }
  }

  /**
   * 加载电路
   */
  async loadCircuit(config: ZKCircuitConfig): Promise<void> {
    try {
      // 验证配置
      if (!ZKUtils.validateCircuitConfig(config)) {
        throw new ZKError(
          ZKErrorType.INVALID_INPUT,
          '电路配置无效',
          config
        );
      }

      // 检查文件是否存在
      await this.validateCircuitFiles(config);

      // 加载电路文件
      const circuitData = await this.loadCircuitFiles(config);

      // 验证电路大小
      this.validateCircuitSize(circuitData);

      // 存储电路配置和数据
      this.circuits.set(config.id, config);
      this.circuitCache.set(config.id, circuitData);

      this.emitEvent(ZKEventType.CIRCUIT_LOADED, {
        circuitId: config.id,
        name: config.name,
        constraints: config.constraints
      });

    } catch (error) {
      const zkError = error instanceof ZKError ? error : new ZKError(
        ZKErrorType.CIRCUIT_LOAD_FAILED,
        `电路 ${config.id} 加载失败: ${error.message}`,
        error
      );

      this.emitEvent(ZKEventType.ERROR_OCCURRED, {
        error: zkError,
        circuitId: config.id
      });

      throw zkError;
    }
  }

  /**
   * 验证电路文件
   */
  private async validateCircuitFiles(config: ZKCircuitConfig): Promise<void> {
    const files = [config.wasmPath, config.zkeyPath, config.vkeyPath];

    for (const filePath of files) {
      try {
        await fs.access(filePath);
      } catch {
        throw new ZKError(
          ZKErrorType.CIRCUIT_LOAD_FAILED,
          `电路文件不存在: ${filePath}`
        );
      }
    }
  }

  /**
   * 加载电路文件
   */
  private async loadCircuitFiles(config: ZKCircuitConfig): Promise<{ wasm: Buffer; zkey: Buffer; vkey: any }> {
    try {
      const [wasm, zkey, vkeyContent] = await Promise.all([
        fs.readFile(config.wasmPath),
        fs.readFile(config.zkeyPath),
        fs.readFile(config.vkeyPath, 'utf8')
      ]);

      const vkey = JSON.parse(vkeyContent);

      return { wasm, zkey, vkey };
    } catch (error) {
      throw new ZKError(
        ZKErrorType.CIRCUIT_LOAD_FAILED,
        `电路文件读取失败: ${error.message}`,
        error
      );
    }
  }

  /**
   * 验证电路大小
   */
  private validateCircuitSize(circuitData: { wasm: Buffer; zkey: Buffer; vkey: any }): void {
    const totalSize = circuitData.wasm.length + circuitData.zkey.length;

    if (totalSize > ZK_LIMITS.MAX_CIRCUIT_SIZE) {
      throw new ZKError(
        ZKErrorType.CIRCUIT_LOAD_FAILED,
        `电路文件过大: ${totalSize} bytes (最大: ${ZK_LIMITS.MAX_CIRCUIT_SIZE} bytes)`
      );
    }
  }

  /**
   * 获取电路配置
   */
  getCircuit(id: string): ZKCircuitConfig | null {
    return this.circuits.get(id) || null;
  }

  /**
   * 获取电路数据
   */
  getCircuitData(id: string): { wasm: Buffer; zkey: Buffer; vkey: any } | null {
    return this.circuitCache.get(id) || null;
  }

  /**
   * 列出所有电路
   */
  listCircuits(): ZKCircuitConfig[] {
    return Array.from(this.circuits.values());
  }

  /**
   * 移除电路
   */
  removeCircuit(id: string): boolean {
    const removed = this.circuits.delete(id);
    if (removed) {
      this.circuitCache.delete(id);
      this.loadedCircuits.delete(id);

    }
    return removed;
  }

  /**
   * 检查电路是否存在
   */
  hasCircuit(id: string): boolean {
    return this.circuits.has(id);
  }

  /**
   * 获取电路统计信息
   */
  getCircuitStats(id: string): any {
    const config = this.circuits.get(id);
    const data = this.circuitCache.get(id);

    if (!config || !data) {
      return null;
    }

    return {
      id: config.id,
      name: config.name,
      constraints: config.constraints,
      variables: config.variables,
      wasmSize: data.wasm.length,
      zkeySize: data.zkey.length,
      estimatedProofTime: ZKUtils.estimateProofTime(config.constraints || 1000)
    };
  }

  /**
   * 重新加载电路
   */
  async reloadCircuit(id: string): Promise<void> {
    const config = this.circuits.get(id);
    if (!config) {
      throw new ZKError(
        ZKErrorType.CIRCUIT_NOT_FOUND,
        `电路 ${id} 不存在`
      );
    }

    // 移除旧的电路数据
    this.circuitCache.delete(id);
    this.loadedCircuits.delete(id);

    // 重新加载
    await this.loadCircuit(config);
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.circuitCache.clear();
    this.loadedCircuits.clear();

  }

  /**
   * 获取系统状态
   */
  getSystemStatus(): any {
    return {
      totalCircuits: this.circuits.size,
      loadedCircuits: this.circuitCache.size,
      cacheSize: this.circuitCache.size,
      availableCircuits: Array.from(this.circuits.keys())
    };
  }

  /**
   * 验证电路完整性
   */
  async validateCircuitIntegrity(id: string): Promise<boolean> {
    try {
      const config = this.circuits.get(id);
      const data = this.circuitCache.get(id);

      if (!config || !data) {
        return false;
      }

      // 验证文件是否仍然存在
      await this.validateCircuitFiles(config);

      // 验证vkey格式
      if (!data.vkey || !data.vkey.protocol) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 发出事件
   */
  private emitEvent(type: ZKEventType, data: any): void {
    const event: ZKEvent = {
      type,
      timestamp: Date.now(),
      data
    };
    this.emit('zkEvent', event);
  }

  /**
   * 批量加载电路
   */
  async loadCircuits(configs: ZKCircuitConfig[]): Promise<void> {
    const results = await Promise.allSettled(
      configs.map(config => this.loadCircuit(config))
    );

    const failures = results
      .map((result, index) => ({ result, config: configs[index] }))
      .filter(({ result }) => result.status === 'rejected')
      .map(({ config, result }) => ({
        circuitId: config.id,
        error: (result as PromiseRejectedResult).reason
      }));

    if (failures.length > 0) {
      logger.warn('部分电路加载失败:', failures);
    }

  }

  /**
   * 导出电路配置
   */
  exportConfigs(): ZKCircuitConfig[] {
    return this.listCircuits();
  }

  /**
   * 导入电路配置
   */
  async importConfigs(configs: ZKCircuitConfig[]): Promise<void> {
    await this.loadCircuits(configs);
  }
}