
/**
 * 全局类型声明
 */

// 扩展 NodeJS 全局类型
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      DATABASE_URL: string;
      JWT_SECRET: string;
      NEXTAUTH_SECRET: string;
      NEXTAUTH_URL: string;
      REDIS_URL?: string;
      ENCRYPTION_KEY?: string;
    }
  }

  // 扩展 Window 对象
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }

  // 模块声明
  declare module '*.svg' {
    const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>;
    export default content;
  }

  declare module '*.png' {
    const content: string;
    export default content;
  }

  declare module '*.jpg' {
    const content: string;
    export default content;
  }

  declare module '*.jpeg' {
    const content: string;
    export default content;
  }

  declare module '*.gif' {
    const content: string;
    export default content;
  }

  declare module '*.webp' {
    const content: string;
    export default content;
  }

  declare module '*.ico' {
    const content: string;
    export default content;
  }

  declare module '*.bmp' {
    const content: string;
    export default content;
  }

  declare module '*.css' {
    const content: { [className: string]: string };
    export default content;
  }

  declare module '*.scss' {
    const content: { [className: string]: string };
    export default content;
  }

  declare module '*.sass' {
    const content: { [className: string]: string };
    export default content;
  }

  declare module '*.less' {
    const content: { [className: string]: string };
    export default content;
  }
}

// 导出空对象以使此文件成为模块
export {};
