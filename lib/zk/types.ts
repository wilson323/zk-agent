/**
 * ZK-Agent Zero-Knowledge Proof System Types
 * ZK证明系统类型定义
 */

import { Groth16Proof } from 'snarkjs';

// 基础ZK证明类型
export interface ZKProof {
  proof: Groth16Proof;
  publicSignals: string[];
  verificationKey?: any;
  circuitId: string;
  timestamp: number;
}

// ZK电路配置
export interface ZKCircuitConfig {
  id: string;
  name: string;
  wasmPath: string;
  zkeyPath: string;
  vkeyPath: string;
  description?: string;
  constraints?: number;
  variables?: number;
}

// ZK证明生成输入
export interface ZKProofInput {
  circuitId: string;
  inputs: Record<string, any>;
  metadata?: Record<string, any>;
}

// ZK验证结果
export interface ZKVerificationResult {
  isValid: boolean;
  circuitId: string;
  verifiedAt: number;
  error?: string;
  metadata?: Record<string, any>;
}

// ZK系统配置
export interface ZKSystemConfig {
  circuits: ZKCircuitConfig[];
  defaultCircuit?: string;
  verificationTimeout?: number;
  enableCache?: boolean;
  cacheSize?: number;
}

// ZK证明生成选项
export interface ZKProofOptions {
  enableLogging?: boolean;
  timeout?: number;
  useCache?: boolean;
  metadata?: Record<string, any>;
}

// ZK电路管理器接口
export interface IZKCircuitManager {
  loadCircuit(config: ZKCircuitConfig): Promise<void>;
  getCircuit(id: string): ZKCircuitConfig | null;
  listCircuits(): ZKCircuitConfig[];
  removeCircuit(id: string): boolean;
}

// ZK证明生成器接口
export interface IZKProofGenerator {
  generateProof(input: ZKProofInput, options?: ZKProofOptions): Promise<ZKProof>;
  validateInput(circuitId: string, inputs: Record<string, any>): boolean;
}

// ZK验证器接口
export interface IZKVerifier {
  verifyProof(proof: ZKProof): Promise<ZKVerificationResult>;
  verifyProofWithKey(proof: Groth16Proof, publicSignals: string[], vKey: any): Promise<boolean>;
}

// ZK系统状态
export interface ZKSystemStatus {
  isInitialized: boolean;
  circuitsLoaded: number;
  totalProofsGenerated: number;
  totalProofsVerified: number;
  lastActivity: number;
  errors: string[];
}

// ZK性能指标
export interface ZKPerformanceMetrics {
  avgProofGenerationTime: number;
  avgVerificationTime: number;
  successRate: number;
  errorRate: number;
  cacheHitRate?: number;
}

// ZK错误类型
export enum ZKErrorType {
  CIRCUIT_NOT_FOUND = 'CIRCUIT_NOT_FOUND',
  INVALID_INPUT = 'INVALID_INPUT',
  PROOF_GENERATION_FAILED = 'PROOF_GENERATION_FAILED',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  CIRCUIT_LOAD_FAILED = 'CIRCUIT_LOAD_FAILED',
  TIMEOUT = 'TIMEOUT',
  SYSTEM_ERROR = 'SYSTEM_ERROR'
}

// ZK自定义错误类
export class ZKError extends Error {
  constructor(
    public type: ZKErrorType,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ZKError';
  }
}

// ZK事件类型
export enum ZKEventType {
  CIRCUIT_LOADED = 'circuit_loaded',
  PROOF_GENERATED = 'proof_generated',
  PROOF_VERIFIED = 'proof_verified',
  ERROR_OCCURRED = 'error_occurred',
  SYSTEM_INITIALIZED = 'system_initialized'
}

// ZK事件数据
export interface ZKEvent {
  type: ZKEventType;
  timestamp: number;
  data: any;
  circuitId?: string;
}

// ZK事件监听器
export type ZKEventListener = (event: ZKEvent) => void;