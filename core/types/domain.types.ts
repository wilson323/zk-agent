/**
 * 零错误类型系统 - 核心领域类型
 */
export type Result<T, E = Error> = {
  success: true;
  data: T;
  error?: never;
} | {
  success: false;
  data?: never;
  error: E;
};

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export type Primitives = string | number | boolean | Date | null | undefined;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type UnknownRecord = Record<string, unknown>;

export function assertNever(x: never): never {
  throw new Error('Unexpected value: ' + x);
}