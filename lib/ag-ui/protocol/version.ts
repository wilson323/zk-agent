// @ts-nocheck
/**
 * AG-UI协议版本管理
 */
export const AG_UI_VERSION = "1.0.0"

export interface VersionInfo {
  version: string
  protocolVersion: string
  features: string[]
  deprecated?: string[]
  breaking?: string[]
}

/**
 * 版本兼容性检查器
 */
export class VersionCompatibility {
  private static supportedVersions = ["1.0.0"]
  private static currentVersion = AG_UI_VERSION

  /**
   * 检查版本兼容性
   */
  static isCompatible(version: string): boolean {
    return this.supportedVersions.includes(version)
  }

  /**
   * 获取当前版本信息
   */
  static getCurrentVersionInfo(): VersionInfo {
    return {
      version: this.currentVersion,
      protocolVersion: "1.0.0",
      features: [
        "event-driven-architecture",
        "streaming-responses",
        "tool-calling",
        "state-management",
        "middleware-support",
        "error-handling",
        "fastgpt-integration",
      ],
      deprecated: [],
      breaking: [],
    }
  }

  /**
   * 比较版本
   */
  static compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split(".").map(Number)
    const parts2 = v2.split(".").map(Number)

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0
      const part2 = parts2[i] || 0

      if (part1 > part2) {return 1}
      if (part1 < part2) {return -1}
    }

    return 0
  }

  /**
   * 检查是否需要升级
   */
  static needsUpgrade(version: string): boolean {
    return this.compareVersions(version, this.currentVersion) < 0
  }
}
