/**
 * 海报设计智能体类型定义
 * 严格按照设计文档的数据结构要求
 * 
 * 包含海报生成、模板、导出系统等相关类型定义
 * @author ZK-Agent Team
 * @version 1.0.0
 */

// 海报生成请求
export interface PosterGenerationRequest {
  description: string;
  style?: string;
  size?: string;
  palette?: string;
  referenceImageUrl?: string | null;
  timestamp: Date;
}

// 海报生成结果
export interface PosterGenerationResult {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  metadata: {
    generationTime: number;
    style: string;
    size: string;
    palette: string;
  };
  createdAt: Date;
}

// 海报任务 - 按照设计文档定义
export interface PosterTask {
  id: string;
  userId: string;
  description: string;
  style: string;
  size: string;
  palette: string;
  referenceImageUrl?: string;
  resultImageUrl: string;
  createdAt: Date;
}

// 海报风格定义
export interface PosterStyle {
  id: string;
  name: string;
  description: string;
  category: string;
  previewUrl?: string;
}

// 海报尺寸定义
export interface PosterSize {
  id: string;
  name: string;
  dimensions: string;
  ratio: string;
  width: number;
  height: number;
}

// 配色方案定义
export interface ColorPalette {
  id: string;
  name: string;
  colors: string[];
  description?: string;
}

// ==================== 导出系统类型定义 ====================

/**
 * 位置信息接口
 * 定义元素在画布中的位置和尺寸（百分比）
 */
export interface Position {
  /** X坐标（百分比，0-100） */
  x: number;
  /** Y坐标（百分比，0-100） */
  y: number;
  /** 宽度（百分比，0-100） */
  width: number;
  /** 高度（百分比，0-100） */
  height: number;
}

/**
 * 样式配置接口
 * 定义元素的视觉样式属性
 */
export interface ElementStyle {
  /** 字体大小 */
  fontSize?: number;
  /** 字体粗细 */
  fontWeight?: string | number;
  /** 字体系列 */
  fontFamily?: string;
  /** 文字颜色 */
  color?: string;
  /** 文字对齐方式 */
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  /** 背景颜色 */
  backgroundColor?: string;
  /** 边框颜色 */
  borderColor?: string;
  /** 边框宽度 */
  borderWidth?: number;
  /** 边框样式 */
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  /** 透明度 */
  opacity?: number;
  /** 阴影 */
  boxShadow?: string;
  /** 边框圆角 */
  borderRadius?: number;
  /** 填充颜色 */
  fill?: string;
  /** 描边颜色 */
  stroke?: string;
  /** 描边宽度 */
  strokeWidth?: number;
  /** 渐变背景 */
  background?: string;
  /** 行高 */
  lineHeight?: number;
  /** 字间距 */
  letterSpacing?: number;
}

/**
 * 基础元素接口
 * 所有海报元素的基础结构
 */
export interface BaseElement {
  /** 元素唯一标识 */
  id: string;
  /** 元素类型 */
  type: 'text' | 'image' | 'shape' | 'background';
  /** 位置信息 */
  position: Position;
  /** 样式配置 */
  style: ElementStyle;
  /** 元素内容 */
  content?: string;
  /** 是否可见 */
  visible?: boolean;
  /** 层级 */
  zIndex?: number;
}

/**
 * 文本元素接口
 * 继承基础元素，添加文本特有属性
 */
export interface TextElement extends BaseElement {
  type: 'text';
  /** 文本内容 */
  content: string;
  /** 是否自动换行 */
  autoWrap?: boolean;
  /** 最大行数 */
  maxLines?: number;
}

/**
 * 图片元素接口
 * 继承基础元素，添加图片特有属性
 */
export interface ImageElement extends BaseElement {
  type: 'image';
  /** 图片源地址 */
  src: string;
  /** 替代文本 */
  alt?: string;
  /** 图片适应方式 */
  objectFit?: 'contain' | 'cover' | 'fill' | 'scale-down';
}

/**
 * 形状元素接口
 * 继承基础元素，添加形状特有属性
 */
export interface ShapeElement extends BaseElement {
  type: 'shape';
  /** 形状类型 */
  shapeType: 'rectangle' | 'circle' | 'ellipse' | 'polygon';
  /** 形状特定属性 */
  shapeProps?: Record<string, any>;
}

/**
 * 背景元素接口
 * 继承基础元素，用于背景设置
 */
export interface BackgroundElement extends BaseElement {
  type: 'background';
  /** 背景类型 */
  backgroundType: 'color' | 'image' | 'gradient';
  /** 背景值 */
  backgroundValue: string;
}

/**
 * 海报元素联合类型
 * 包含所有可能的元素类型
 */
export type PosterElement = TextElement | ImageElement | ShapeElement | BackgroundElement;

/**
 * 海报模板接口
 * 定义完整的海报模板结构
 */
export interface PosterTemplate {
  /** 模板唯一标识 */
  id: string;
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description?: string;
  /** 模板版本 */
  version: string;
  /** 画布尺寸 */
  canvas: {
    width: number;
    height: number;
  };
  /** 元素列表 */
  elements: PosterElement[];
  /** 模板变量 */
  variables?: Record<string, any>;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 模板标签 */
  tags?: string[];
  /** 模板分类 */
  category?: string;
}

/**
 * 用户内容接口
 * 定义用户提供的动态内容
 */
export interface UserContent {
  /** 文本内容映射 */
  [key: string]: string | number | boolean | undefined;
}

/**
 * 类型守卫函数
 * 用于运行时类型检查和类型断言
 */

/**
 * 检查是否为有效的位置对象
 * @param obj 待检查的对象
 * @returns 是否为有效位置
 */
export function isValidPosition(obj: any): obj is Position {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.x === 'number' &&
    typeof obj.y === 'number' &&
    typeof obj.width === 'number' &&
    typeof obj.height === 'number' &&
    obj.x >= 0 && obj.x <= 100 &&
    obj.y >= 0 && obj.y <= 100 &&
    obj.width > 0 && obj.width <= 100 &&
    obj.height > 0 && obj.height <= 100
  );
}

/**
 * 检查是否为有效的样式对象
 * @param obj 待检查的对象
 * @returns 是否为有效样式
 */
export function isValidStyle(obj: any): obj is ElementStyle {
  return obj && typeof obj === 'object';
}

/**
 * 检查是否为有效的海报元素
 * @param obj 待检查的对象
 * @returns 是否为有效元素
 */
export function isValidElement(obj: any): obj is PosterElement {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.type === 'string' &&
    ['text', 'image', 'shape', 'background'].includes(obj.type) &&
    isValidPosition(obj.position) &&
    isValidStyle(obj.style)
  );
}

/**
 * 检查是否为有效的海报模板
 * @param obj 待检查的对象
 * @returns 是否为有效模板
 */
export function isValidTemplate(obj: any): obj is PosterTemplate {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.version === 'string' &&
    obj.canvas &&
    typeof obj.canvas.width === 'number' &&
    typeof obj.canvas.height === 'number' &&
    Array.isArray(obj.elements) &&
    obj.elements.every(isValidElement)
  );
}

/**
 * 检查是否为有效的用户内容
 * @param obj 待检查的对象
 * @returns 是否为有效用户内容
 */
export function isValidUserContent(obj: any): obj is UserContent {
  return obj && typeof obj === 'object';
}
