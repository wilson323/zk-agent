/**
 * 加密和安全工具函数
 * 提供哈希、加密、签名等安全相关功能
 * @author ZK-Agent Team
 * @version 1.0.0
 */

// ============================================================================
// 哈希工具函数
// ============================================================================

/**
 * 生成SHA-256哈希
 * @param data - 要哈希的数据
 * @returns Promise<string> - 十六进制哈希字符串
 */
export async function sha256(data: string | ArrayBuffer): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = typeof data === 'string' ? encoder.encode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  return bufferToHex(hashBuffer);
}

/**
 * 生成SHA-1哈希
 * @param data - 要哈希的数据
 * @returns Promise<string> - 十六进制哈希字符串
 */
export async function sha1(data: string | ArrayBuffer): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = typeof data === 'string' ? encoder.encode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-1', dataBuffer);
  return bufferToHex(hashBuffer);
}

/**
 * 生成MD5哈希（简单实现，不推荐用于安全场景）
 * @param data - 要哈希的数据
 * @returns string - 十六进制哈希字符串
 */
export function md5(data: string): string {
  // 注意：这是一个简化的MD5实现，仅用于非安全场景
  // 在生产环境中，建议使用专门的加密库
  function rotateLeft(value: number, amount: number): number {
    return (value << amount) | (value >>> (32 - amount));
  }
  
  function addUnsigned(x: number, y: number): number {
    const x4 = x & 0x40000000;
    const y4 = y & 0x40000000;
    const x8 = x & 0x80000000;
    const y8 = y & 0x80000000;
    const result = (x & 0x3fffffff) + (y & 0x3fffffff);
    
    if (x4 & y4) {
      return result ^ 0x80000000 ^ x8 ^ y8;
    }
    if (x4 | y4) {
      if (result & 0x40000000) {
        return result ^ 0xc0000000 ^ x8 ^ y8;
      } else {
        return result ^ 0x40000000 ^ x8 ^ y8;
      }
    } else {
      return result ^ x8 ^ y8;
    }
  }
  
  function f(x: number, y: number, z: number): number {
    return (x & y) | (~x & z);
  }
  
  function g(x: number, y: number, z: number): number {
    return (x & z) | (y & ~z);
  }
  
  function h(x: number, y: number, z: number): number {
    return x ^ y ^ z;
  }
  
  function i(x: number, y: number, z: number): number {
    return y ^ (x | ~z);
  }
  
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(f(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(g(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(h(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(i(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  
  function convertToWordArray(str: string): number[] {
    const wordArray: number[] = [];
    const messageLength = str.length;
    const numberOfWords = (((messageLength + 8) - ((messageLength + 8) % 64)) / 64 + 1) * 16;
    
    for (let i = 0; i < numberOfWords; i++) {
      wordArray[i] = 0;
    }
    
    for (let i = 0; i < messageLength; i++) {
      const bytePosition = (i - (i % 4)) / 4;
      const byteOffset = (i % 4) * 8;
      wordArray[bytePosition] = wordArray[bytePosition] | (str.charCodeAt(i) << byteOffset);
    }
    
    const bytePosition = (messageLength - (messageLength % 4)) / 4;
    const byteOffset = (messageLength % 4) * 8;
    wordArray[bytePosition] = wordArray[bytePosition] | (0x80 << byteOffset);
    wordArray[numberOfWords - 2] = messageLength << 3;
    wordArray[numberOfWords - 1] = messageLength >>> 29;
    
    return wordArray;
  }
  
  function wordToHex(value: number): string {
    let result = '';
    for (let i = 0; i <= 3; i++) {
      const byte = (value >>> (i * 8)) & 255;
      result += ('0' + byte.toString(16)).slice(-2);
    }
    return result;
  }
  
  const x = convertToWordArray(data);
  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;
  
  for (let k = 0; k < x.length; k += 16) {
    const aa = a;
    const bb = b;
    const cc = c;
    const dd = d;
    
    a = ff(a, b, c, d, x[k], 7, 0xd76aa478);
    d = ff(d, a, b, c, x[k + 1], 12, 0xe8c7b756);
    c = ff(c, d, a, b, x[k + 2], 17, 0x242070db);
    b = ff(b, c, d, a, x[k + 3], 22, 0xc1bdceee);
    a = ff(a, b, c, d, x[k + 4], 7, 0xf57c0faf);
    d = ff(d, a, b, c, x[k + 5], 12, 0x4787c62a);
    c = ff(c, d, a, b, x[k + 6], 17, 0xa8304613);
    b = ff(b, c, d, a, x[k + 7], 22, 0xfd469501);
    a = ff(a, b, c, d, x[k + 8], 7, 0x698098d8);
    d = ff(d, a, b, c, x[k + 9], 12, 0x8b44f7af);
    c = ff(c, d, a, b, x[k + 10], 17, 0xffff5bb1);
    b = ff(b, c, d, a, x[k + 11], 22, 0x895cd7be);
    a = ff(a, b, c, d, x[k + 12], 7, 0x6b901122);
    d = ff(d, a, b, c, x[k + 13], 12, 0xfd987193);
    c = ff(c, d, a, b, x[k + 14], 17, 0xa679438e);
    b = ff(b, c, d, a, x[k + 15], 22, 0x49b40821);
    
    a = gg(a, b, c, d, x[k + 1], 5, 0xf61e2562);
    d = gg(d, a, b, c, x[k + 6], 9, 0xc040b340);
    c = gg(c, d, a, b, x[k + 11], 14, 0x265e5a51);
    b = gg(b, c, d, a, x[k], 20, 0xe9b6c7aa);
    a = gg(a, b, c, d, x[k + 5], 5, 0xd62f105d);
    d = gg(d, a, b, c, x[k + 10], 9, 0x2441453);
    c = gg(c, d, a, b, x[k + 15], 14, 0xd8a1e681);
    b = gg(b, c, d, a, x[k + 4], 20, 0xe7d3fbc8);
    a = gg(a, b, c, d, x[k + 9], 5, 0x21e1cde6);
    d = gg(d, a, b, c, x[k + 14], 9, 0xc33707d6);
    c = gg(c, d, a, b, x[k + 3], 14, 0xf4d50d87);
    b = gg(b, c, d, a, x[k + 8], 20, 0x455a14ed);
    a = gg(a, b, c, d, x[k + 13], 5, 0xa9e3e905);
    d = gg(d, a, b, c, x[k + 2], 9, 0xfcefa3f8);
    c = gg(c, d, a, b, x[k + 7], 14, 0x676f02d9);
    b = gg(b, c, d, a, x[k + 12], 20, 0x8d2a4c8a);
    
    a = hh(a, b, c, d, x[k + 5], 4, 0xfffa3942);
    d = hh(d, a, b, c, x[k + 8], 11, 0x8771f681);
    c = hh(c, d, a, b, x[k + 11], 16, 0x6d9d6122);
    b = hh(b, c, d, a, x[k + 14], 23, 0xfde5380c);
    a = hh(a, b, c, d, x[k + 1], 4, 0xa4beea44);
    d = hh(d, a, b, c, x[k + 4], 11, 0x4bdecfa9);
    c = hh(c, d, a, b, x[k + 7], 16, 0xf6bb4b60);
    b = hh(b, c, d, a, x[k + 10], 23, 0xbebfbc70);
    a = hh(a, b, c, d, x[k + 13], 4, 0x289b7ec6);
    d = hh(d, a, b, c, x[k], 11, 0xeaa127fa);
    c = hh(c, d, a, b, x[k + 3], 16, 0xd4ef3085);
    b = hh(b, c, d, a, x[k + 6], 23, 0x4881d05);
    a = hh(a, b, c, d, x[k + 9], 4, 0xd9d4d039);
    d = hh(d, a, b, c, x[k + 12], 11, 0xe6db99e5);
    c = hh(c, d, a, b, x[k + 15], 16, 0x1fa27cf8);
    b = hh(b, c, d, a, x[k + 2], 23, 0xc4ac5665);
    
    a = ii(a, b, c, d, x[k], 6, 0xf4292244);
    d = ii(d, a, b, c, x[k + 7], 10, 0x432aff97);
    c = ii(c, d, a, b, x[k + 14], 15, 0xab9423a7);
    b = ii(b, c, d, a, x[k + 5], 21, 0xfc93a039);
    a = ii(a, b, c, d, x[k + 12], 6, 0x655b59c3);
    d = ii(d, a, b, c, x[k + 3], 10, 0x8f0ccc92);
    c = ii(c, d, a, b, x[k + 10], 15, 0xffeff47d);
    b = ii(b, c, d, a, x[k + 1], 21, 0x85845dd1);
    a = ii(a, b, c, d, x[k + 8], 6, 0x6fa87e4f);
    d = ii(d, a, b, c, x[k + 15], 10, 0xfe2ce6e0);
    c = ii(c, d, a, b, x[k + 6], 15, 0xa3014314);
    b = ii(b, c, d, a, x[k + 13], 21, 0x4e0811a1);
    a = ii(a, b, c, d, x[k + 4], 6, 0xf7537e82);
    d = ii(d, a, b, c, x[k + 11], 10, 0xbd3af235);
    c = ii(c, d, a, b, x[k + 2], 15, 0x2ad7d2bb);
    b = ii(b, c, d, a, x[k + 9], 21, 0xeb86d391);
    
    a = addUnsigned(a, aa);
    b = addUnsigned(b, bb);
    c = addUnsigned(c, cc);
    d = addUnsigned(d, dd);
  }
  
  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}

// ============================================================================
// 编码解码工具函数
// ============================================================================

/**
 * Base64编码
 * @param data - 要编码的数据
 * @returns Base64编码字符串
 */
export function base64Encode(data: string | ArrayBuffer): string {
  if (typeof data === 'string') {
    return btoa(unescape(encodeURIComponent(data)));
  } else {
    const bytes = new Uint8Array(data);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

/**
 * Base64解码
 * @param data - Base64编码字符串
 * @returns 解码后的字符串
 */
export function base64Decode(data: string): string {
  return decodeURIComponent(escape(atob(data)));
}

/**
 * URL安全的Base64编码
 * @param data - 要编码的数据
 * @returns URL安全的Base64编码字符串
 */
export function base64UrlEncode(data: string | ArrayBuffer): string {
  return base64Encode(data)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * URL安全的Base64解码
 * @param data - URL安全的Base64编码字符串
 * @returns 解码后的字符串
 */
export function base64UrlDecode(data: string): string {
  let base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return base64Decode(base64);
}

/**
 * 十六进制编码
 * @param data - 要编码的数据
 * @returns 十六进制字符串
 */
export function hexEncode(data: string | ArrayBuffer): string {
  if (typeof data === 'string') {
    const encoder = new TextEncoder();
    return bufferToHex(encoder.encode(data));
  } else {
    return bufferToHex(data);
  }
}

/**
 * 十六进制解码
 * @param hex - 十六进制字符串
 * @returns 解码后的字符串
 */
export function hexDecode(hex: string): string {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

// ============================================================================
// 随机数生成工具函数
// ============================================================================

/**
 * 生成加密安全的随机字节
 * @param length - 字节长度
 * @returns Uint8Array
 */
export function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * 生成随机UUID
 * @returns UUID字符串
 */
export function generateUUID(): string {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // 回退实现
  const bytes = generateRandomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // 版本4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // 变体
  
  const hex = bufferToHex(bytes);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join('-');
}

/**
 * 生成随机密钥
 * @param length - 密钥长度（字节）
 * @param format - 输出格式：'hex' | 'base64' | 'bytes'
 * @returns 随机密钥
 */
export function generateRandomKey(
  length = 32,
  format: 'hex' | 'base64' | 'bytes' = 'hex'
): string | Uint8Array {
  const bytes = generateRandomBytes(length);
  
  switch (format) {
    case 'hex':
      return bufferToHex(bytes);
    case 'base64':
      return base64Encode(bytes);
    case 'bytes':
      return bytes;
    default:
      return bufferToHex(bytes);
  }
}

/**
 * 生成随机盐值
 * @param length - 盐值长度（字节）
 * @returns 十六进制盐值字符串
 */
export function generateSalt(length = 16): string {
  return generateRandomKey(length, 'hex') as string;
}

// ============================================================================
// 密码处理工具函数
// ============================================================================

/**
 * 简单密码哈希（使用PBKDF2）
 * @param password - 密码
 * @param salt - 盐值
 * @param iterations - 迭代次数
 * @returns Promise<string> - 哈希后的密码
 */
export async function hashPassword(
  password: string,
  salt?: string,
  iterations = 100000
): Promise<{ hash: string; salt: string }> {
  const actualSalt = salt || generateSalt();
  const encoder = new TextEncoder();
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(actualSalt),
      iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  return {
    hash: bufferToHex(derivedBits),
    salt: actualSalt
  };
}

/**
 * 验证密码
 * @param password - 输入的密码
 * @param hash - 存储的哈希值
 * @param salt - 盐值
 * @param iterations - 迭代次数
 * @returns Promise<boolean> - 验证结果
 */
export async function verifyPassword(
  password: string,
  hash: string,
  salt: string,
  iterations = 100000
): Promise<boolean> {
  const { hash: computedHash } = await hashPassword(password, salt, iterations);
  return computedHash === hash;
}

/**
 * 生成强密码
 * @param length - 密码长度
 * @param options - 密码选项
 * @returns 生成的密码
 */
export function generateStrongPassword(
  length = 16,
  options: {
    includeUppercase?: boolean;
    includeLowercase?: boolean;
    includeNumbers?: boolean;
    includeSymbols?: boolean;
    excludeSimilar?: boolean;
  } = {}
): string {
  const {
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true,
    excludeSimilar = false
  } = options;
  
  let charset = '';
  
  if (includeUppercase) {
    charset += excludeSimilar ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  }
  
  if (includeLowercase) {
    charset += excludeSimilar ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
  }
  
  if (includeNumbers) {
    charset += excludeSimilar ? '23456789' : '0123456789';
  }
  
  if (includeSymbols) {
    charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  }
  
  if (!charset) {
    throw new Error('At least one character type must be included');
  }
  
  const randomBytes = generateRandomBytes(length);
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  
  return password;
}

// ============================================================================
// JWT工具函数（简单实现）
// ============================================================================

/**
 * 创建JWT头部
 * @param algorithm - 算法
 * @returns Base64编码的头部
 */
function createJWTHeader(algorithm = 'HS256'): string {
  const header = {
    alg: algorithm,
    typ: 'JWT'
  };
  return base64UrlEncode(JSON.stringify(header));
}

/**
 * 创建JWT载荷
 * @param payload - 载荷数据
 * @param expiresIn - 过期时间（秒）
 * @returns Base64编码的载荷
 */
function createJWTPayload(payload: any, expiresIn?: number): string {
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = {
    ...payload,
    iat: now,
    ...(expiresIn && { exp: now + expiresIn })
  };
  return base64UrlEncode(JSON.stringify(jwtPayload));
}

/**
 * 简单JWT签名（仅用于演示，生产环境请使用专业库）
 * @param data - 要签名的数据
 * @param secret - 密钥
 * @returns Promise<string> - 签名
 */
async function signJWT(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );
  
  return base64UrlEncode(signature);
}

/**
 * 创建简单JWT（仅用于演示）
 * @param payload - 载荷数据
 * @param secret - 密钥
 * @param expiresIn - 过期时间（秒）
 * @returns Promise<string> - JWT字符串
 */
export async function createSimpleJWT(
  payload: any,
  secret: string,
  expiresIn?: number
): Promise<string> {
  const header = createJWTHeader();
  const jwtPayload = createJWTPayload(payload, expiresIn);
  const data = `${header}.${jwtPayload}`;
  const signature = await signJWT(data, secret);
  
  return `${data}.${signature}`;
}

/**
 * 验证简单JWT（仅用于演示）
 * @param token - JWT字符串
 * @param secret - 密钥
 * @returns Promise<any> - 解码后的载荷或null
 */
export async function verifySimpleJWT(token: string, secret: string): Promise<any> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const [header, payload, signature] = parts;
    const data = `${header}.${payload}`;
    const expectedSignature = await signJWT(data, secret);
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    const decodedPayload = JSON.parse(base64UrlDecode(payload));
    
    // 检查过期时间
    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return decodedPayload;
  } catch (error) {
    return null;
  }
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 将ArrayBuffer转换为十六进制字符串
 * @param buffer - ArrayBuffer
 * @returns 十六进制字符串
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 安全比较两个字符串（防止时序攻击）
 * @param a - 字符串A
 * @param b - 字符串B
 * @returns 是否相等
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * 清理敏感数据（用零填充）
 * @param data - 要清理的数据
 */
export function secureClear(data: string | Uint8Array): void {
  if (typeof data === 'string') {
    // 注意：JavaScript字符串是不可变的，这里只是演示
    // 实际应用中应该避免在内存中存储敏感字符串
    console.warn('Cannot securely clear immutable string in JavaScript');
  } else {
    data.fill(0);
  }
}