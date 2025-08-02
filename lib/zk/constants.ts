/**
 * ZK-Agent Zero-Knowledge Proof System Constants
 * ZK证明系统常量定义
 */

import { ZKSystemConfig } from './types';

// 默认ZK系统配置
export const DEFAULT_ZK_CONFIG: ZKSystemConfig = {
  circuits: [],
  verificationTimeout: 30000, // 30秒
  enableCache: true,
  cacheSize: 100,
};

// ZK电路文件路径
export const ZK_CIRCUITS_PATH = './circuits';
export const ZK_KEYS_PATH = './keys';
export const ZK_WASM_PATH = './wasm';

// ZK性能限制
export const ZK_LIMITS = {
  MAX_PROOF_GENERATION_TIME: 60000, // 60秒
  MAX_VERIFICATION_TIME: 5000, // 5秒
  MAX_INPUT_SIZE: 1024 * 1024, // 1MB
  MAX_CIRCUIT_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_CONCURRENT_PROOFS: 5,
};

// ZK缓存配置
export const ZK_CACHE_CONFIG = {
  DEFAULT_TTL: 3600000, // 1小时
  MAX_CACHE_SIZE: 100,
  CLEANUP_INTERVAL: 300000, // 5分钟
};

// ZK日志级别
export enum ZKLogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

// 默认电路配置
export const DEFAULT_CIRCUITS = {
  IDENTITY: {
    id: 'identity',
    name: 'Identity Proof',
    wasmPath: './circuits/identity.wasm',
    zkeyPath: './keys/identity.zkey',
    vkeyPath: './keys/identity_vkey.json',
    description: '身份证明电路',
  },
  MEMBERSHIP: {
    id: 'membership',
    name: 'Membership Proof',
    wasmPath: './circuits/membership.wasm',
    zkeyPath: './keys/membership.zkey',
    vkeyPath: './keys/membership_vkey.json',
    description: '成员资格证明电路',
  },
  RANGE: {
    id: 'range',
    name: 'Range Proof',
    wasmPath: './circuits/range.wasm',
    zkeyPath: './keys/range.zkey',
    vkeyPath: './keys/range_vkey.json',
    description: '范围证明电路',
  },
};

// ZK系统状态常量
export const ZK_STATUS = {
  UNINITIALIZED: 'uninitialized',
  INITIALIZING: 'initializing',
  READY: 'ready',
  ERROR: 'error',
  MAINTENANCE: 'maintenance',
} as const;

// ZK错误消息
export const ZK_ERROR_MESSAGES = {
  CIRCUIT_NOT_FOUND: '电路未找到',
  INVALID_INPUT: '输入参数无效',
  PROOF_GENERATION_FAILED: '证明生成失败',
  VERIFICATION_FAILED: '证明验证失败',
  CIRCUIT_LOAD_FAILED: '电路加载失败',
  TIMEOUT: '操作超时',
  SYSTEM_ERROR: '系统错误',
};

// ZK性能基准
export const ZK_BENCHMARKS = {
  SMALL_CIRCUIT: {
    constraints: 1000,
    expectedProofTime: 1000, // 1秒
    expectedVerifyTime: 100, // 100毫秒
  },
  MEDIUM_CIRCUIT: {
    constraints: 10000,
    expectedProofTime: 5000, // 5秒
    expectedVerifyTime: 200, // 200毫秒
  },
  LARGE_CIRCUIT: {
    constraints: 100000,
    expectedProofTime: 30000, // 30秒
    expectedVerifyTime: 500, // 500毫秒
  },
};

// ZK安全参数
export const ZK_SECURITY = {
  MIN_ENTROPY: 128, // 最小熵值（位）
  CURVE: 'bn128', // 椭圆曲线
  HASH_FUNCTION: 'poseidon', // 哈希函数
  FIELD_SIZE: '21888242871839275222246405745257275088548364400416034343698204186575808495617',
};

// ZK API端点
export const ZK_ENDPOINTS = {
  GENERATE_PROOF: '/api/zk/proof/generate',
  VERIFY_PROOF: '/api/zk/proof/verify',
  LIST_CIRCUITS: '/api/zk/circuits',
  CIRCUIT_INFO: '/api/zk/circuits/:id',
  SYSTEM_STATUS: '/api/zk/status',
  PERFORMANCE_METRICS: '/api/zk/metrics',
};
