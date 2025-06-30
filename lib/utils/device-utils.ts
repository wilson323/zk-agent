/**
 * 设备识别和检测工具函数
 * 提供设备类型、浏览器、操作系统等检测功能
 * @author ZK-Agent Team
 * @version 1.0.0
 */

// ============================================================================
// 设备信息接口定义
// ============================================================================

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  os: string;
  osVersion: string;
  browser: string;
  browserVersion: string;
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  touchSupport: boolean;
  orientation?: 'portrait' | 'landscape';
}

export interface BrowserCapabilities {
  webGL: boolean;
  webGL2: boolean;
  webRTC: boolean;
  serviceWorker: boolean;
  webAssembly: boolean;
  indexedDB: boolean;
  localStorage: boolean;
  sessionStorage: boolean;
  geolocation: boolean;
  camera: boolean;
  microphone: boolean;
  notifications: boolean;
  clipboard: boolean;
}

// ============================================================================
// 设备类型检测
// ============================================================================

/**
 * 检测设备类型
 * @param userAgent - 用户代理字符串，默认使用当前浏览器的
 * @returns 设备类型
 */
export function detectDeviceType(userAgent?: string): 'mobile' | 'tablet' | 'desktop' {
  const ua = userAgent || navigator.userAgent;
  
  // 移动设备检测
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  if (mobileRegex.test(ua)) {
    // 平板检测
    const tabletRegex = /iPad|Android(?=.*\bMobile\b)(?!.*\bMobile\b)|Android.*Tablet|KFAPWI|LG-V909|SM-T.*|Galaxy.*Tab|GT-P.*|SAMSUNG.*Tablet/i;
    if (tabletRegex.test(ua) || (ua.includes('Android') && !ua.includes('Mobile'))) {
      return 'tablet';
    }
    return 'mobile';
  }
  
  return 'desktop';
}

/**
 * 检测是否为移动设备
 * @returns 是否为移动设备
 */
export function isMobile(): boolean {
  return detectDeviceType() === 'mobile';
}

/**
 * 检测是否为平板设备
 * @returns 是否为平板设备
 */
export function isTablet(): boolean {
  return detectDeviceType() === 'tablet';
}

/**
 * 检测是否为桌面设备
 * @returns 是否为桌面设备
 */
export function isDesktop(): boolean {
  return detectDeviceType() === 'desktop';
}

/**
 * 检测是否支持触摸
 * @returns 是否支持触摸
 */
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// ============================================================================
// 操作系统检测
// ============================================================================

/**
 * 检测操作系统
 * @param userAgent - 用户代理字符串
 * @returns 操作系统信息
 */
export function detectOS(userAgent?: string): { name: string; version: string } {
  const ua = userAgent || navigator.userAgent;
  
  // Windows
  if (ua.includes('Windows NT')) {
    const version = ua.match(/Windows NT ([\d.]+)/);
    const versionMap: Record<string, string> = {
      '10.0': '10',
      '6.3': '8.1',
      '6.2': '8',
      '6.1': '7',
      '6.0': 'Vista',
      '5.1': 'XP'
    };
    return {
      name: 'Windows',
      version: versionMap[version?.[1] || ''] || version?.[1] || 'Unknown'
    };
  }
  
  // macOS
  if (ua.includes('Mac OS X')) {
    const version = ua.match(/Mac OS X ([\d_]+)/);
    return {
      name: 'macOS',
      version: version?.[1]?.replace(/_/g, '.') || 'Unknown'
    };
  }
  
  // iOS
  if (ua.includes('iPhone OS') || ua.includes('OS ')) {
    const version = ua.match(/OS ([\d_]+)/);
    return {
      name: 'iOS',
      version: version?.[1]?.replace(/_/g, '.') || 'Unknown'
    };
  }
  
  // Android
  if (ua.includes('Android')) {
    const version = ua.match(/Android ([\d.]+)/);
    return {
      name: 'Android',
      version: version?.[1] || 'Unknown'
    };
  }
  
  // Linux
  if (ua.includes('Linux')) {
    return {
      name: 'Linux',
      version: 'Unknown'
    };
  }
  
  return {
    name: 'Unknown',
    version: 'Unknown'
  };
}

// ============================================================================
// 浏览器检测
// ============================================================================

/**
 * 检测浏览器
 * @param userAgent - 用户代理字符串
 * @returns 浏览器信息
 */
export function detectBrowser(userAgent?: string): { name: string; version: string } {
  const ua = userAgent || navigator.userAgent;
  
  // Chrome
  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    const version = ua.match(/Chrome\/([\d.]+)/);
    return {
      name: 'Chrome',
      version: version?.[1] || 'Unknown'
    };
  }
  
  // Edge
  if (ua.includes('Edg')) {
    const version = ua.match(/Edg\/([\d.]+)/);
    return {
      name: 'Edge',
      version: version?.[1] || 'Unknown'
    };
  }
  
  // Firefox
  if (ua.includes('Firefox')) {
    const version = ua.match(/Firefox\/([\d.]+)/);
    return {
      name: 'Firefox',
      version: version?.[1] || 'Unknown'
    };
  }
  
  // Safari
  if (ua.includes('Safari') && !ua.includes('Chrome')) {
    const version = ua.match(/Version\/([\d.]+)/);
    return {
      name: 'Safari',
      version: version?.[1] || 'Unknown'
    };
  }
  
  // Internet Explorer
  if (ua.includes('MSIE') || ua.includes('Trident')) {
    const version = ua.match(/(?:MSIE |rv:)([\d.]+)/);
    return {
      name: 'Internet Explorer',
      version: version?.[1] || 'Unknown'
    };
  }
  
  return {
    name: 'Unknown',
    version: 'Unknown'
  };
}

// ============================================================================
// 屏幕信息检测
// ============================================================================

/**
 * 获取屏幕信息
 * @returns 屏幕信息
 */
export function getScreenInfo() {
  return {
    width: screen.width,
    height: screen.height,
    availWidth: screen.availWidth,
    availHeight: screen.availHeight,
    pixelRatio: window.devicePixelRatio || 1,
    colorDepth: screen.colorDepth,
    orientation: screen.orientation?.type || 'unknown'
  };
}

/**
 * 获取视口信息
 * @returns 视口信息
 */
export function getViewportInfo() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    scrollX: window.scrollX || window.pageXOffset,
    scrollY: window.scrollY || window.pageYOffset
  };
}

/**
 * 检测屏幕方向
 * @returns 屏幕方向
 */
export function getOrientation(): 'portrait' | 'landscape' {
  if (screen.orientation) {
    return screen.orientation.type.includes('portrait') ? 'portrait' : 'landscape';
  }
  
  // 回退方法
  return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
}

// ============================================================================
// 浏览器能力检测
// ============================================================================

/**
 * 检测浏览器能力
 * @returns 浏览器能力对象
 */
export function detectBrowserCapabilities(): BrowserCapabilities {
  return {
    webGL: !!window.WebGLRenderingContext,
    webGL2: !!window.WebGL2RenderingContext,
    webRTC: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    serviceWorker: 'serviceWorker' in navigator,
    webAssembly: 'WebAssembly' in window,
    indexedDB: 'indexedDB' in window,
    localStorage: 'localStorage' in window,
    sessionStorage: 'sessionStorage' in window,
    geolocation: 'geolocation' in navigator,
    camera: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    microphone: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    notifications: 'Notification' in window,
    clipboard: !!(navigator.clipboard && navigator.clipboard.writeText)
  };
}

/**
 * 检测是否支持WebGL
 * @returns 是否支持WebGL
 */
export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch (e) {
    return false;
  }
}

/**
 * 检测是否支持WebGL2
 * @returns 是否支持WebGL2
 */
export function supportsWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  } catch (e) {
    return false;
  }
}

/**
 * 检测是否支持WebRTC
 * @returns 是否支持WebRTC
 */
export function supportsWebRTC(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// ============================================================================
// 网络信息检测
// ============================================================================

/**
 * 获取网络信息
 * @returns 网络信息
 */
export function getNetworkInfo() {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  if (!connection) {
    return {
      type: 'unknown',
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0,
      saveData: false
    };
  }
  
  return {
    type: connection.type || 'unknown',
    effectiveType: connection.effectiveType || 'unknown',
    downlink: connection.downlink || 0,
    rtt: connection.rtt || 0,
    saveData: connection.saveData || false
  };
}

/**
 * 检测是否在线
 * @returns 是否在线
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

// ============================================================================
// 设备指纹生成
// ============================================================================

/**
 * 生成设备指纹
 * @returns Promise<string> - 设备指纹
 */
export async function generateDeviceFingerprint(): Promise<string> {
  const components = [];
  
  // 用户代理
  components.push(navigator.userAgent);
  
  // 屏幕信息
  const screen = getScreenInfo();
  components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
  
  // 时区
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
  
  // 语言
  components.push(navigator.language);
  
  // 平台
  components.push(navigator.platform);
  
  // Canvas指纹
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
      components.push(canvas.toDataURL());
    }
  } catch (e) {
    // Canvas可能被禁用
  }
  
  // WebGL指纹
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (gl) {
      const renderer = gl.getParameter(gl.RENDERER);
      const vendor = gl.getParameter(gl.VENDOR);
      components.push(`${vendor}~${renderer}`);
    }
  } catch (e) {
    // WebGL可能被禁用
  }
  
  // 音频指纹
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const analyser = audioContext.createAnalyser();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    
    oscillator.connect(analyser);
    analyser.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start(0);
    
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(frequencyData);
    
    components.push(Array.from(frequencyData).join(','));
    
    oscillator.stop();
    audioContext.close();
  } catch (e) {
    // 音频可能被禁用
  }
  
  // 生成哈希
  const fingerprint = components.join('|');
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// 完整设备信息获取
// ============================================================================

/**
 * 获取完整设备信息
 * @returns 设备信息对象
 */
export function getDeviceInfo(): DeviceInfo {
  const os = detectOS();
  const browser = detectBrowser();
  const screen = getScreenInfo();
  
  return {
    type: detectDeviceType(),
    os: os.name,
    osVersion: os.version,
    browser: browser.name,
    browserVersion: browser.version,
    userAgent: navigator.userAgent,
    screenWidth: screen.width,
    screenHeight: screen.height,
    pixelRatio: screen.pixelRatio,
    touchSupport: isTouchDevice(),
    orientation: getOrientation()
  };
}

// ============================================================================
// 设备性能检测
// ============================================================================

/**
 * 检测设备性能等级
 * @returns Promise<'low' | 'medium' | 'high'> - 性能等级
 */
export async function detectPerformanceLevel(): Promise<'low' | 'medium' | 'high'> {
  const deviceInfo = getDeviceInfo();
  let score = 0;
  
  // 设备类型评分
  if (deviceInfo.type === 'desktop') score += 3;
  else if (deviceInfo.type === 'tablet') score += 2;
  else score += 1;
  
  // 屏幕分辨率评分
  const totalPixels = deviceInfo.screenWidth * deviceInfo.screenHeight;
  if (totalPixels > 2073600) score += 3; // > 1920x1080
  else if (totalPixels > 921600) score += 2; // > 1280x720
  else score += 1;
  
  // 像素比评分
  if (deviceInfo.pixelRatio >= 2) score += 2;
  else score += 1;
  
  // 内存评分（如果可用）
  const memory = (navigator as any).deviceMemory;
  if (memory) {
    if (memory >= 8) score += 3;
    else if (memory >= 4) score += 2;
    else score += 1;
  }
  
  // CPU核心数评分（如果可用）
  const cores = navigator.hardwareConcurrency;
  if (cores) {
    if (cores >= 8) score += 3;
    else if (cores >= 4) score += 2;
    else score += 1;
  }
  
  // 简单性能测试
  const start = performance.now();
  let result = 0;
  for (let i = 0; i < 100000; i++) {
    result += Math.random();
  }
  const duration = performance.now() - start;
  
  if (duration < 10) score += 3;
  else if (duration < 20) score += 2;
  else score += 1;
  
  // 根据总分判断性能等级
  if (score >= 15) return 'high';
  else if (score >= 10) return 'medium';
  else return 'low';
}

// ============================================================================
// 设备兼容性检测
// ============================================================================

/**
 * 检测设备是否支持特定功能
 * @param feature - 功能名称
 * @returns 是否支持
 */
export function supportsFeature(feature: string): boolean {
  const capabilities = detectBrowserCapabilities();
  
  switch (feature.toLowerCase()) {
    case 'webgl':
      return capabilities.webGL;
    case 'webgl2':
      return capabilities.webGL2;
    case 'webrtc':
      return capabilities.webRTC;
    case 'serviceworker':
      return capabilities.serviceWorker;
    case 'webassembly':
      return capabilities.webAssembly;
    case 'indexeddb':
      return capabilities.indexedDB;
    case 'localstorage':
      return capabilities.localStorage;
    case 'sessionstorage':
      return capabilities.sessionStorage;
    case 'geolocation':
      return capabilities.geolocation;
    case 'camera':
      return capabilities.camera;
    case 'microphone':
      return capabilities.microphone;
    case 'notifications':
      return capabilities.notifications;
    case 'clipboard':
      return capabilities.clipboard;
    default:
      return false;
  }
}

/**
 * 获取不支持的功能列表
 * @param requiredFeatures - 必需功能列表
 * @returns 不支持的功能列表
 */
export function getUnsupportedFeatures(requiredFeatures: string[]): string[] {
  return requiredFeatures.filter(feature => !supportsFeature(feature));
}