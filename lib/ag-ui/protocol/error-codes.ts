// @ts-nocheck
/**
 * AG-UI协议标准错误码
 */
export enum AgUIErrorCode {
  // 通用错误 (1000-1999)
  UNKNOWN_ERROR = 1000,
  INVALID_REQUEST = 1001,
  MISSING_PARAMETER = 1002,
  INVALID_PARAMETER = 1003,
  UNAUTHORIZED = 1004,
  FORBIDDEN = 1005,
  NOT_FOUND = 1006,
  TIMEOUT = 1007,
  RATE_LIMITED = 1008,

  // 运行时错误 (2000-2999)
  RUNTIME_NOT_INITIALIZED = 2000,
  RUNTIME_ALREADY_RUNNING = 2001,
  RUNTIME_EXECUTION_FAILED = 2002,
  RUNTIME_STATE_INVALID = 2003,
  RUNTIME_MEMORY_EXCEEDED = 2004,

  // 智能体错误 (3000-3999)
  AGENT_NOT_FOUND = 3000,
  AGENT_INVALID_CONFIG = 3001,
  AGENT_INITIALIZATION_FAILED = 3002,
  AGENT_EXECUTION_FAILED = 3003,
  AGENT_TIMEOUT = 3004,

  // 工具错误 (4000-4999)
  TOOL_NOT_FOUND = 4000,
  TOOL_INVALID_ARGS = 4001,
  TOOL_EXECUTION_FAILED = 4002,
  TOOL_TIMEOUT = 4003,
  TOOL_PERMISSION_DENIED = 4004,

  // 消息错误 (5000-5999)
  MESSAGE_INVALID_FORMAT = 5000,
  MESSAGE_TOO_LONG = 5001,
  MESSAGE_EMPTY = 5002,
  MESSAGE_UNSUPPORTED_TYPE = 5003,

  // 状态错误 (6000-6999)
  STATE_INVALID = 6000,
  STATE_CORRUPTION = 6001,
  STATE_SYNC_FAILED = 6002,

  // 网络错误 (7000-7999)
  NETWORK_ERROR = 7000,
  CONNECTION_FAILED = 7001,
  CONNECTION_TIMEOUT = 7002,
  CONNECTION_LOST = 7003,

  // FastGPT集成错误 (8000-8999)
  FASTGPT_API_ERROR = 8000,
  FASTGPT_AUTH_FAILED = 8001,
  FASTGPT_APP_NOT_FOUND = 8002,
  FASTGPT_CHAT_INIT_FAILED = 8003,
  FASTGPT_STREAM_ERROR = 8004,
}

/**
 * AG-UI错误类
 */
export class AgUIError extends Error {
  constructor(
    public code: AgUIErrorCode,
    message: string,
    public details?: any,
    public context?: any,
  ) {
    super(message)
    this.name = "AgUIError"
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      context: this.context,
      stack: this.stack,
    }
  }

  static fromError(error: Error, code: AgUIErrorCode = AgUIErrorCode.UNKNOWN_ERROR): AgUIError {
    if (error instanceof AgUIError) {
      return error
    }
    return new AgUIError(code, error.message, { originalError: error })
  }
}

/**
 * 错误处理工具
 */
export class ErrorHandler {
  private static errorMessages: Record<AgUIErrorCode, string> = {
    [AgUIErrorCode.UNKNOWN_ERROR]: "未知错误",
    [AgUIErrorCode.INVALID_REQUEST]: "无效请求",
    [AgUIErrorCode.MISSING_PARAMETER]: "缺少必需参数",
    [AgUIErrorCode.INVALID_PARAMETER]: "参数无效",
    [AgUIErrorCode.UNAUTHORIZED]: "未授权",
    [AgUIErrorCode.FORBIDDEN]: "禁止访问",
    [AgUIErrorCode.NOT_FOUND]: "资源未找到",
    [AgUIErrorCode.TIMEOUT]: "请求超时",
    [AgUIErrorCode.RATE_LIMITED]: "请求频率超限",

    [AgUIErrorCode.RUNTIME_NOT_INITIALIZED]: "运行时未初始化",
    [AgUIErrorCode.RUNTIME_ALREADY_RUNNING]: "运行时已在运行",
    [AgUIErrorCode.RUNTIME_EXECUTION_FAILED]: "运行时执行失败",
    [AgUIErrorCode.RUNTIME_STATE_INVALID]: "运行时状态无效",
    [AgUIErrorCode.RUNTIME_MEMORY_EXCEEDED]: "运行时内存超限",

    [AgUIErrorCode.AGENT_NOT_FOUND]: "智能体未找到",
    [AgUIErrorCode.AGENT_INVALID_CONFIG]: "智能体配置无效",
    [AgUIErrorCode.AGENT_INITIALIZATION_FAILED]: "智能体初始化失败",
    [AgUIErrorCode.AGENT_EXECUTION_FAILED]: "智能体执行失败",
    [AgUIErrorCode.AGENT_TIMEOUT]: "智能体执行超时",

    [AgUIErrorCode.TOOL_NOT_FOUND]: "工具未找到",
    [AgUIErrorCode.TOOL_INVALID_ARGS]: "工具参数无效",
    [AgUIErrorCode.TOOL_EXECUTION_FAILED]: "工具执行失败",
    [AgUIErrorCode.TOOL_TIMEOUT]: "工具执行超时",
    [AgUIErrorCode.TOOL_PERMISSION_DENIED]: "工具权限不足",

    [AgUIErrorCode.MESSAGE_INVALID_FORMAT]: "消息格式无效",
    [AgUIErrorCode.MESSAGE_TOO_LONG]: "消息过长",
    [AgUIErrorCode.MESSAGE_EMPTY]: "消息为空",
    [AgUIErrorCode.MESSAGE_UNSUPPORTED_TYPE]: "不支持的消息类型",

    [AgUIErrorCode.STATE_INVALID]: "状态无效",
    [AgUIErrorCode.STATE_CORRUPTION]: "状态损坏",
    [AgUIErrorCode.STATE_SYNC_FAILED]: "状态同步失败",

    [AgUIErrorCode.NETWORK_ERROR]: "网络错误",
    [AgUIErrorCode.CONNECTION_FAILED]: "连接失败",
    [AgUIErrorCode.CONNECTION_TIMEOUT]: "连接超时",
    [AgUIErrorCode.CONNECTION_LOST]: "连接丢失",

    [AgUIErrorCode.FASTGPT_API_ERROR]: "FastGPT API错误",
    [AgUIErrorCode.FASTGPT_AUTH_FAILED]: "FastGPT认证失败",
    [AgUIErrorCode.FASTGPT_APP_NOT_FOUND]: "FastGPT应用未找到",
    [AgUIErrorCode.FASTGPT_CHAT_INIT_FAILED]: "FastGPT聊天初始化失败",
    [AgUIErrorCode.FASTGPT_STREAM_ERROR]: "FastGPT流式响应错误",
  }

  static getErrorMessage(code: AgUIErrorCode): string {
    return this.errorMessages[code] || "未知错误"
  }

  static createError(code: AgUIErrorCode, details?: any, context?: any): AgUIError {
    const message = this.getErrorMessage(code)
    return new AgUIError(code, message, details, context)
  }

  static handleError(error: unknown, context?: any): AgUIError {
    if (error instanceof AgUIError) {
      return error
    }

    if (error instanceof Error) {
      return AgUIError.fromError(error, AgUIErrorCode.UNKNOWN_ERROR)
    }

    return new AgUIError(AgUIErrorCode.UNKNOWN_ERROR, String(error), { originalError: error }, context)
  }
}
