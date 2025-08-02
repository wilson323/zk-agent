/**
 * ZK-Agent Zero-Knowledge Proof System Utilities
 * ZK证明系统工具函数
 */

import { createHash } from 'crypto';
import { ZKError, ZKErrorType, ZKProof, ZKCircuitConfig } from './types';
import { ZK_SECURITY, ZK_LIMITS } from './constants';

export class ZKUtils {
  /**
   * 生成安全随机数
   */
  static generateSecureRandom(bytes: number = 32): string {
    const crypto = require('crypto');
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * 计算Poseidon哈希
   */
  static async poseidonHash(inputs: string[]): Promise<string> {
    try {
      const circomlib = require('circomlib');
      const poseidon = circomlib.poseidon;
      const hash = poseidon(inputs.map(x => BigInt(x)));
      return hash.toString();
    } catch (error) {
      throw new ZKError(ZKErrorType.SYSTEM_ERROR, 'Poseidon哈希计算失败', error);
    }
  }

  /**
   * 验证输入参数格式
   */
  static validateInputs(inputs: Record<string, any>): boolean {
    if (!inputs || typeof inputs !== 'object') {
      return false;
    }

    // 检查输入大小
    const inputSize = JSON.stringify(inputs).length;
    if (inputSize > ZK_LIMITS.MAX_INPUT_SIZE) {
      return false;
    }

    // 验证每个输入值
    for (const [key, value] of Object.entries(inputs)) {
      if (!this.isValidFieldElement(value)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 检查是否为有效的域元素
   */
  static isValidFieldElement(value: any): boolean {
    try {
      const bigIntValue = BigInt(value);
      const fieldSize = BigInt(ZK_SECURITY.FIELD_SIZE);
      return bigIntValue >= 0n && bigIntValue < fieldSize;
    } catch {
      return false;
    }
  }

  /**
   * 格式化证明数据
   */
  static formatProof(proof: any): ZKProof {
    return {
      proof: {
        pi_a: proof.pi_a,
        pi_b: proof.pi_b,
        pi_c: proof.pi_c,
        protocol: proof.protocol || 'groth16',
        curve: proof.curve || 'bn128',
      },
      publicSignals: proof.publicSignals || [],
      circuitId: proof.circuitId || '',
      timestamp: Date.now(),
    };
  }

  /**
   * 验证电路配置
   */
  static validateCircuitConfig(config: ZKCircuitConfig): boolean {
    if (!config.id || !config.name) {
      return false;
    }

    if (!config.wasmPath || !config.zkeyPath || !config.vkeyPath) {
      return false;
    }

    // 验证文件路径格式
    const pathRegex = /^[\w\-\/\.]+$/;
    if (
      !pathRegex.test(config.wasmPath) ||
      !pathRegex.test(config.zkeyPath) ||
      !pathRegex.test(config.vkeyPath)
    ) {
      return false;
    }

    return true;
  }

  /**
   * 计算证明哈希
   */
  static calculateProofHash(proof: ZKProof): string {
    const proofString = JSON.stringify({
      proof: proof.proof,
      publicSignals: proof.publicSignals,
      circuitId: proof.circuitId,
    });
    return createHash('sha256').update(proofString).digest('hex');
  }

  /**
   * 生成电路ID
   */
  static generateCircuitId(name: string, version?: string): string {
    const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const versionSuffix = version ? `_v${version}` : '';
    return `${normalizedName}${versionSuffix}`;
  }

  /**
   * 验证公共信号
   */
  static validatePublicSignals(signals: string[]): boolean {
    if (!Array.isArray(signals)) {
      return false;
    }

    return signals.every(signal => this.isValidFieldElement(signal));
  }

  /**
   * 转换输入为电路格式
   */
  static convertInputsToCircuitFormat(inputs: Record<string, any>): Record<string, string> {
    const converted: Record<string, string> = {};

    for (const [key, value] of Object.entries(inputs)) {
      if (Array.isArray(value)) {
        converted[key] = value.map(v => BigInt(v).toString());
      } else {
        converted[key] = BigInt(value).toString();
      }
    }

    return converted;
  }

  /**
   * 生成测试输入
   */
  static generateTestInputs(circuitId: string): Record<string, any> {
    switch (circuitId) {
      case 'identity':
        return {
          secret: this.generateSecureRandom(16),
          nullifier: this.generateSecureRandom(16),
        };
      case 'membership':
        return {
          secret: this.generateSecureRandom(16),
          merkleRoot: this.generateSecureRandom(32),
          merkleProof: Array(8)
            .fill(0)
            .map(() => this.generateSecureRandom(32)),
        };
      case 'range':
        return {
          value: Math.floor(Math.random() * 1000),
          min: 0,
          max: 1000,
          salt: this.generateSecureRandom(16),
        };
      default:
        return {
          input: this.generateSecureRandom(16),
        };
    }
  }

  /**
   * 估算证明生成时间
   */
  static estimateProofTime(constraints: number): number {
    // 基于约束数量的简单估算（毫秒）
    if (constraints < 1000) {
      return 1000;
    } else if (constraints < 10000) {
      return 5000;
    } else if (constraints < 100000) {
      return 30000;
    } else {
      return 60000;
    }
  }

  /**
   * 格式化性能指标
   */
  static formatPerformanceMetrics(metrics: any) {
    return {
      avgProofGenerationTime: Math.round(metrics.avgProofGenerationTime || 0),
      avgVerificationTime: Math.round(metrics.avgVerificationTime || 0),
      successRate: Math.round((metrics.successRate || 0) * 100) / 100,
      errorRate: Math.round((metrics.errorRate || 0) * 100) / 100,
      cacheHitRate: metrics.cacheHitRate ? Math.round(metrics.cacheHitRate * 100) / 100 : undefined,
    };
  }

  /**
   * 创建错误响应
   */
  static createErrorResponse(error: ZKError | Error) {
    if (error instanceof ZKError) {
      return {
        success: false,
        error: {
          type: error.type,
          message: error.message,
          details: error.details,
        },
      };
    }

    return {
      success: false,
      error: {
        type: ZKErrorType.SYSTEM_ERROR,
        message: error.message,
      },
    };
  }

  /**
   * 创建成功响应
   */
  static createSuccessResponse(data: any) {
    return {
      success: true,
      data,
      timestamp: Date.now(),
    };
  }
}
