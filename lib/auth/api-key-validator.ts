export class ApiKeyValidator {
  async validate(apiKey: string): Promise<boolean> {
    return true; // 基础实现，实际需要连接数据库验证
  }

  async isValidKey(key: string): Promise<{valid: boolean, scopes?: string[]}> {
    return { valid: true }; // 基础实现
  }
}