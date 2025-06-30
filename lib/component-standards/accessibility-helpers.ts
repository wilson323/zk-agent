/**
 * 可访问性辅助工具库
 * 基于 WCAG 2.1 AA 标准和 WAI-ARIA 最佳实践
 */

import * as React from 'react';

// =============================================================================
// 类型定义
// =============================================================================

/**
 * 焦点管理选项
 */
export interface FocusOptions {
  preventScroll?: boolean;
  restoreFocus?: boolean;
  trapFocus?: boolean;
  autoFocus?: boolean;
}

/**
 * 键盘导航配置
 */
export interface KeyboardNavigationConfig {
  enableArrowKeys?: boolean;
  enableHomeEnd?: boolean;
  enablePageUpDown?: boolean;
  enableTypeAhead?: boolean;
  orientation?: 'horizontal' | 'vertical' | 'both';
  wrap?: boolean;
}

/**
 * 屏幕阅读器公告选项
 */
export interface AnnouncementOptions {
  priority?: 'polite' | 'assertive';
  delay?: number;
  clear?: boolean;
}

/**
 * 颜色对比度检查结果
 */
export interface ContrastResult {
  ratio: number;
  level: 'AA' | 'AAA' | 'fail';
  passes: boolean;
}

// =============================================================================
// 焦点管理工具
// =============================================================================

/**
 * 创建焦点陷阱
 * 基于 focus-trap 库的实现模式
 */
export class FocusTrap {
  private container: HTMLElement;
  private previousActiveElement: Element | null = null;
  private isActive = false;
  private focusableElements: HTMLElement[] = [];
  private firstFocusableElement: HTMLElement | null = null;
  private lastFocusableElement: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.updateFocusableElements();
  }

  /**
   * 获取可聚焦元素的选择器
   * 遵循 WAI-ARIA 可聚焦元素标准
   */
  private getFocusableSelector(): string {
    return [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
      'audio[controls]',
      'video[controls]',
      'details > summary:first-of-type',
      'details[open]'
    ].join(', ');
  }

  /**
   * 更新可聚焦元素列表
   */
  private updateFocusableElements(): void {
    const elements = Array.from(
      this.container.querySelectorAll(this.getFocusableSelector())
    ) as HTMLElement[];

    this.focusableElements = elements.filter(element => {
      return (
        element.offsetWidth > 0 ||
        element.offsetHeight > 0 ||
        element.getClientRects().length > 0
      );
    });

    this.firstFocusableElement = this.focusableElements[0] || null;
    this.lastFocusableElement = 
      this.focusableElements[this.focusableElements.length - 1] || null;
  }

  /**
   * 激活焦点陷阱
   */
  activate(options: FocusOptions = {}): void {
    if (this.isActive) {return;}

    this.previousActiveElement = document.activeElement;
    this.isActive = true;

    // 添加键盘事件监听
    this.container.addEventListener('keydown', this.handleKeyDown);

    // 自动聚焦到第一个可聚焦元素
    if (options.autoFocus && this.firstFocusableElement) {
      this.firstFocusableElement.focus({ preventScroll: options.preventScroll });
    }
  }

  /**
   * 停用焦点陷阱
   */
  deactivate(options: FocusOptions = {}): void {
    if (!this.isActive) {return;}

    this.isActive = false;
    this.container.removeEventListener('keydown', this.handleKeyDown);

    // 恢复之前的焦点
    if (options.restoreFocus && this.previousActiveElement) {
      (this.previousActiveElement as HTMLElement).focus({
        preventScroll: options.preventScroll
      });
    }
  }

  /**
   * 处理键盘事件
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab') {return;}

    this.updateFocusableElements();

    if (this.focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    if (event.shiftKey) {
      // Shift + Tab: 向前导航
      if (document.activeElement === this.firstFocusableElement) {
        event.preventDefault();
        this.lastFocusableElement?.focus();
      }
    } else {
      // Tab: 向后导航
      if (document.activeElement === this.lastFocusableElement) {
        event.preventDefault();
        this.firstFocusableElement?.focus();
      }
    }
  };
}

/**
 * React Hook: 焦点陷阱
 */
export function useFocusTrap(
  isActive: boolean,
  options: FocusOptions = {}
) {
  const containerRef = React.useRef<HTMLElement>(null);
  const focusTrapRef = React.useRef<FocusTrap | null>(null);

  React.useEffect(() => {
    if (!containerRef.current) {return;}

    if (!focusTrapRef.current) {
      focusTrapRef.current = new FocusTrap(containerRef.current);
    }

    if (isActive) {
      focusTrapRef.current.activate(options);
    } else {
      focusTrapRef.current.deactivate(options);
    }

    return () => {
      focusTrapRef.current?.deactivate(options);
    };
  }, [isActive, options]);

  return containerRef;
}

/**
 * React Hook: 自动聚焦
 */
export function useAutoFocus(
  shouldFocus: boolean = true,
  options: FocusOptions = {}
) {
  const elementRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (shouldFocus && elementRef.current) {
      elementRef.current.focus({
        preventScroll: options.preventScroll
      });
    }
  }, [shouldFocus, options.preventScroll]);

  return elementRef;
}

// =============================================================================
// 键盘导航工具
// =============================================================================

/**
 * 键盘导航管理器
 * 基于 WAI-ARIA 键盘导航模式
 */
export class KeyboardNavigationManager {
  private container: HTMLElement;
  private config: KeyboardNavigationConfig;
  private items: HTMLElement[] = [];
  private currentIndex = -1;
  private searchString = '';
  private searchTimeout: NodeJS.Timeout | null = null;

  constructor(container: HTMLElement, config: KeyboardNavigationConfig = {}) {
    this.container = container;
    this.config = {
      enableArrowKeys: true,
      enableHomeEnd: true,
      enablePageUpDown: false,
      enableTypeAhead: true,
      orientation: 'vertical',
      wrap: true,
      ...config
    };
    
    this.updateItems();
    this.container.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * 更新导航项目列表
   */
  updateItems(): void {
    const selector = '[role="menuitem"], [role="option"], [role="tab"], [role="treeitem"], button, a[href]';
    this.items = Array.from(
      this.container.querySelectorAll(selector)
    ) as HTMLElement[];
    
    // 更新当前索引
    const activeElement = document.activeElement as HTMLElement;
    this.currentIndex = this.items.indexOf(activeElement);
  }

  /**
   * 处理键盘事件
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    const { key, ctrlKey, metaKey } = event;
    
    // 忽略修饰键组合（除了 Ctrl/Cmd + Home/End）
    if ((ctrlKey || metaKey) && !['Home', 'End'].includes(key)) {
      return;
    }

    switch (key) {
      case 'ArrowDown':
      case 'ArrowRight':
        if (this.config.enableArrowKeys) {
          event.preventDefault();
          this.moveNext();
        }
        break;

      case 'ArrowUp':
      case 'ArrowLeft':
        if (this.config.enableArrowKeys) {
          event.preventDefault();
          this.movePrevious();
        }
        break;

      case 'Home':
        if (this.config.enableHomeEnd) {
          event.preventDefault();
          this.moveToFirst();
        }
        break;

      case 'End':
        if (this.config.enableHomeEnd) {
          event.preventDefault();
          this.moveToLast();
        }
        break;

      case 'PageDown':
        if (this.config.enablePageUpDown) {
          event.preventDefault();
          this.moveByPage(1);
        }
        break;

      case 'PageUp':
        if (this.config.enablePageUpDown) {
          event.preventDefault();
          this.moveByPage(-1);
        }
        break;

      default:
        if (this.config.enableTypeAhead && key.length === 1) {
          this.handleTypeAhead(key);
        }
        break;
    }
  };

  /**
   * 移动到下一项
   */
  private moveNext(): void {
    this.updateItems();
    if (this.items.length === 0) {return;}

    let nextIndex = this.currentIndex + 1;
    
    if (nextIndex >= this.items.length) {
      nextIndex = this.config.wrap ? 0 : this.items.length - 1;
    }
    
    this.focusItem(nextIndex);
  }

  /**
   * 移动到上一项
   */
  private movePrevious(): void {
    this.updateItems();
    if (this.items.length === 0) {return;}

    let prevIndex = this.currentIndex - 1;
    
    if (prevIndex < 0) {
      prevIndex = this.config.wrap ? this.items.length - 1 : 0;
    }
    
    this.focusItem(prevIndex);
  }

  /**
   * 移动到第一项
   */
  private moveToFirst(): void {
    this.updateItems();
    if (this.items.length > 0) {
      this.focusItem(0);
    }
  }

  /**
   * 移动到最后一项
   */
  private moveToLast(): void {
    this.updateItems();
    if (this.items.length > 0) {
      this.focusItem(this.items.length - 1);
    }
  }

  /**
   * 按页移动
   */
  private moveByPage(direction: number): void {
    this.updateItems();
    if (this.items.length === 0) {return;}

    const pageSize = Math.max(1, Math.floor(this.items.length / 10));
    const newIndex = Math.max(0, Math.min(
      this.items.length - 1,
      this.currentIndex + (direction * pageSize)
    ));
    
    this.focusItem(newIndex);
  }

  /**
   * 处理类型提前搜索
   */
  private handleTypeAhead(char: string): void {
    this.searchString += char.toLowerCase();
    
    // 清除之前的超时
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    // 设置新的超时
    this.searchTimeout = setTimeout(() => {
      this.searchString = '';
    }, 1000);
    
    // 查找匹配项
    const matchingIndex = this.items.findIndex((item, index) => {
      if (index <= this.currentIndex) {return false;}
      
      const text = this.getItemText(item).toLowerCase();
      return text.startsWith(this.searchString);
    });
    
    if (matchingIndex !== -1) {
      this.focusItem(matchingIndex);
    } else {
      // 从头开始搜索
      const firstMatchIndex = this.items.findIndex(item => {
        const text = this.getItemText(item).toLowerCase();
        return text.startsWith(this.searchString);
      });
      
      if (firstMatchIndex !== -1) {
        this.focusItem(firstMatchIndex);
      }
    }
  }

  /**
   * 获取项目文本内容
   */
  private getItemText(item: HTMLElement): string {
    return item.textContent || item.getAttribute('aria-label') || '';
  }

  /**
   * 聚焦到指定项目
   */
  private focusItem(index: number): void {
    if (index >= 0 && index < this.items.length) {
      this.currentIndex = index;
      this.items[index].focus();
    }
  }

  /**
   * 销毁导航管理器
   */
  destroy(): void {
    this.container.removeEventListener('keydown', this.handleKeyDown);
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }
}

/**
 * React Hook: 键盘导航
 */
export function useKeyboardNavigation(
  config: KeyboardNavigationConfig = {}
) {
  const containerRef = React.useRef<HTMLElement>(null);
  const managerRef = React.useRef<KeyboardNavigationManager | null>(null);

  React.useEffect(() => {
    if (!containerRef.current) {return;}

    managerRef.current = new KeyboardNavigationManager(
      containerRef.current,
      config
    );

    return () => {
      managerRef.current?.destroy();
    };
  }, [config]);

  const updateItems = React.useCallback(() => {
    managerRef.current?.updateItems();
  }, []);

  return { containerRef, updateItems };
}

// =============================================================================
// 屏幕阅读器工具
// =============================================================================

/**
 * 屏幕阅读器公告管理器
 * 基于 ARIA Live Regions 标准
 */
class ScreenReaderAnnouncer {
  private politeRegion: HTMLElement;
  private assertiveRegion: HTMLElement;
  private initialized = false;

  constructor() {
    this.politeRegion = this.createLiveRegion('polite');
    this.assertiveRegion = this.createLiveRegion('assertive');
    this.initialize();
  }

  /**
   * 创建 ARIA Live Region
   */
  private createLiveRegion(priority: 'polite' | 'assertive'): HTMLElement {
    const region = document.createElement('div');
    region.setAttribute('aria-live', priority);
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('aria-relevant', 'text');
    region.style.position = 'absolute';
    region.style.left = '-10000px';
    region.style.width = '1px';
    region.style.height = '1px';
    region.style.overflow = 'hidden';
    return region;
  }

  /**
   * 初始化公告器
   */
  private initialize(): void {
    if (this.initialized || typeof document === 'undefined') {return;}

    document.body.appendChild(this.politeRegion);
    document.body.appendChild(this.assertiveRegion);
    this.initialized = true;
  }

  /**
   * 发布公告
   */
  announce(
    message: string,
    options: AnnouncementOptions = {}
  ): void {
    if (!this.initialized) {this.initialize();}

    const {
      priority = 'polite',
      delay = 0,
      clear = false
    } = options;

    const region = priority === 'assertive' 
      ? this.assertiveRegion 
      : this.politeRegion;

    const announce = () => {
      if (clear) {
        region.textContent = '';
        // 强制重新渲染
        region.offsetHeight;
      }
      region.textContent = message;
    };

    if (delay > 0) {
      setTimeout(announce, delay);
    } else {
      announce();
    }
  }

  /**
   * 清除所有公告
   */
  clear(): void {
    this.politeRegion.textContent = '';
    this.assertiveRegion.textContent = '';
  }

  /**
   * 销毁公告器
   */
  destroy(): void {
    if (this.initialized) {
      document.body.removeChild(this.politeRegion);
      document.body.removeChild(this.assertiveRegion);
      this.initialized = false;
    }
  }
}

// 全局公告器实例
let globalAnnouncer: ScreenReaderAnnouncer | null = null;

/**
 * 获取全局屏幕阅读器公告器
 */
export function getScreenReaderAnnouncer(): ScreenReaderAnnouncer {
  if (!globalAnnouncer) {
    globalAnnouncer = new ScreenReaderAnnouncer();
  }
  return globalAnnouncer;
}

/**
 * 发布屏幕阅读器公告
 */
export function announceToScreenReader(
  message: string,
  options?: AnnouncementOptions
): void {
  const announcer = getScreenReaderAnnouncer();
  announcer.announce(message, options);
}

/**
 * React Hook: 屏幕阅读器公告
 */
export function useScreenReaderAnnouncement() {
  const announce = React.useCallback(
    (message: string, options?: AnnouncementOptions) => {
      announceToScreenReader(message, options);
    },
    []
  );

  return announce;
}

// =============================================================================
// 颜色对比度工具
// =============================================================================

/**
 * 计算相对亮度
 * 基于 WCAG 2.1 相对亮度算法
 */
function getRelativeLuminance(color: string): number {
  // 将颜色转换为 RGB 值
  const rgb = hexToRgb(color);
  if (!rgb) {return 0;}

  // 转换为线性 RGB
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
    const normalized = c / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });

  // 计算相对亮度
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * 将十六进制颜色转换为 RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
}

/**
 * 计算颜色对比度
 * 基于 WCAG 2.1 对比度算法
 */
export function calculateContrastRatio(
  foreground: string,
  background: string
): number {
  const l1 = getRelativeLuminance(foreground);
  const l2 = getRelativeLuminance(background);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * 检查颜色对比度是否符合 WCAG 标准
 */
export function checkContrastCompliance(
  foreground: string,
  background: string,
  fontSize: number = 16,
  fontWeight: number = 400
): ContrastResult {
  const ratio = calculateContrastRatio(foreground, background);
  
  // 判断是否为大文本
  const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700);
  
  // WCAG 2.1 标准
  const aaThreshold = isLargeText ? 3 : 4.5;
  const aaaThreshold = isLargeText ? 4.5 : 7;
  
  let level: 'AA' | 'AAA' | 'fail';
  if (ratio >= aaaThreshold) {
    level = 'AAA';
  } else if (ratio >= aaThreshold) {
    level = 'AA';
  } else {
    level = 'fail';
  }
  
  return {
    ratio,
    level,
    passes: level !== 'fail'
  };
}

/**
 * 生成符合对比度要求的颜色建议
 */
export function suggestAccessibleColors(
  baseColor: string,
  targetRatio: number = 4.5
): { lighter: string; darker: string } {
  const baseLuminance = getRelativeLuminance(baseColor);
  
  // 计算目标亮度
  const targetLighterLuminance = Math.min(1, (baseLuminance + 0.05) * targetRatio - 0.05);
  const targetDarkerLuminance = Math.max(0, (baseLuminance + 0.05) / targetRatio - 0.05);
  
  // 这里简化处理，实际应用中需要更复杂的颜色空间转换
  const lighter = luminanceToHex(targetLighterLuminance);
  const darker = luminanceToHex(targetDarkerLuminance);
  
  return { lighter, darker };
}

/**
 * 将亮度值转换为十六进制颜色（简化实现）
 */
function luminanceToHex(luminance: number): string {
  // 简化的线性转换，实际应用中需要更精确的算法
  const value = Math.round(luminance * 255);
  const hex = value.toString(16).padStart(2, '0');
  return `#${hex}${hex}${hex}`;
}

// =============================================================================
// ARIA 属性工具
// =============================================================================

import { generateId } from '../utils';

/**
 * React Hook: 唯一 ID
 */
export function useId(prefix?: string): string {
  const [id] = React.useState(() => generateId(prefix));
  return id;
}

/**
 * 创建 ARIA 描述关系
 */
export function createAriaDescription(
  elementId: string,
  descriptionId: string
): { 'aria-describedby': string } {
  return { 'aria-describedby': descriptionId };
}

/**
 * 创建 ARIA 标签关系
 */
export function createAriaLabel(
  elementId: string,
  labelId: string
): { 'aria-labelledby': string } {
  return { 'aria-labelledby': labelId };
}

/**
 * 创建 ARIA 控制关系
 */
export function createAriaControls(
  controllerId: string,
  controlledId: string
): { 'aria-controls': string } {
  return { 'aria-controls': controlledId };
}

/**
 * React Hook: ARIA 关系管理
 */
export function useAriaRelationships() {
  const relationships = React.useRef(new Map<string, Set<string>>());
  
  const addRelationship = React.useCallback(
    (type: string, sourceId: string, targetId: string) => {
      const key = `${sourceId}-${type}`;
      if (!relationships.current.has(key)) {
        relationships.current.set(key, new Set());
      }
      relationships.current.get(key)!.add(targetId);
    },
    []
  );
  
  const removeRelationship = React.useCallback(
    (type: string, sourceId: string, targetId: string) => {
      const key = `${sourceId}-${type}`;
      const targets = relationships.current.get(key);
      if (targets) {
        targets.delete(targetId);
        if (targets.size === 0) {
          relationships.current.delete(key);
        }
      }
    },
    []
  );
  
  const getRelationshipValue = React.useCallback(
    (type: string, sourceId: string): string => {
      const key = `${sourceId}-${type}`;
      const targets = relationships.current.get(key);
      return targets ? Array.from(targets).join(' ') : '';
    },
    []
  );
  
  return {
    addRelationship,
    removeRelationship,
    getRelationshipValue
  };
}

// =============================================================================
// 可访问性验证工具
// =============================================================================

/**
 * 验证元素的可访问性
 */
export function validateElementAccessibility(
  element: HTMLElement
): string[] {
  const issues: string[] = [];
  
  // 检查是否有可访问的名称
  const accessibleName = getAccessibleName(element);
  if (!accessibleName && needsAccessibleName(element)) {
    issues.push('元素缺少可访问的名称');
  }
  
  // 检查颜色对比度
  const styles = window.getComputedStyle(element);
  const color = styles.color;
  const backgroundColor = styles.backgroundColor;
  
  if (color && backgroundColor && color !== backgroundColor) {
    const contrast = checkContrastCompliance(color, backgroundColor);
    if (!contrast.passes) {
      issues.push(`颜色对比度不足: ${contrast.ratio.toFixed(2)}:1`);
    }
  }
  
  // 检查焦点指示器
  if (isFocusable(element) && !hasFocusIndicator(element)) {
    issues.push('可聚焦元素缺少焦点指示器');
  }
  
  // 检查 ARIA 属性
  const ariaIssues = validateAriaAttributes(element);
  issues.push(...ariaIssues);
  
  return issues;
}

/**
 * 获取元素的可访问名称
 */
function getAccessibleName(element: HTMLElement): string {
  // 按优先级检查各种命名方式
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {return ariaLabel;}
  
  const ariaLabelledby = element.getAttribute('aria-labelledby');
  if (ariaLabelledby) {
    const labelElement = document.getElementById(ariaLabelledby);
    if (labelElement) {return labelElement.textContent || '';}
  }
  
  // 检查关联的 label 元素
  const id = element.id;
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) {return label.textContent || '';}
  }
  
  // 检查父级 label
  const parentLabel = element.closest('label');
  if (parentLabel) {return parentLabel.textContent || '';}
  
  // 检查 alt 属性（图片）
  if (element.tagName === 'IMG') {
    return element.getAttribute('alt') || '';
  }
  
  // 检查 title 属性
  const title = element.getAttribute('title');
  if (title) {return title;}
  
  // 检查文本内容
  return element.textContent || '';
}

/**
 * 检查元素是否需要可访问名称
 */
function needsAccessibleName(element: HTMLElement): boolean {
  const role = element.getAttribute('role') || element.tagName.toLowerCase();
  
  const needsName = [
    'button', 'link', 'menuitem', 'tab', 'option',
    'checkbox', 'radio', 'textbox', 'combobox',
    'img', 'figure'
  ];
  
  return needsName.includes(role);
}

/**
 * 检查元素是否可聚焦
 */
function isFocusable(element: HTMLElement): boolean {
  const tabIndex = element.tabIndex;
  if (tabIndex < 0) {return false;}
  
  const focusableTags = ['a', 'button', 'input', 'select', 'textarea'];
  if (focusableTags.includes(element.tagName.toLowerCase())) {
    return !element.hasAttribute('disabled');
  }
  
  return tabIndex >= 0;
}

/**
 * 检查元素是否有焦点指示器
 */
function hasFocusIndicator(element: HTMLElement): boolean {
  const styles = window.getComputedStyle(element, ':focus');
  
  // 检查 outline
  if (styles.outlineWidth !== '0px' && styles.outlineStyle !== 'none') {
    return true;
  }
  
  // 检查 box-shadow
  if (styles.boxShadow && styles.boxShadow !== 'none') {
    return true;
  }
  
  // 检查 border 变化
  const normalStyles = window.getComputedStyle(element);
  if (styles.borderWidth !== normalStyles.borderWidth ||
      styles.borderColor !== normalStyles.borderColor) {
    return true;
  }
  
  return false;
}

/**
 * 验证 ARIA 属性
 */
function validateAriaAttributes(element: HTMLElement): string[] {
  const issues: string[] = [];
  
  // 检查 aria-expanded 和 aria-controls 的配对
  const ariaExpanded = element.getAttribute('aria-expanded');
  const ariaControls = element.getAttribute('aria-controls');
  
  if (ariaExpanded && !ariaControls) {
    issues.push('使用 aria-expanded 时应该同时设置 aria-controls');
  }
  
  // 检查 aria-describedby 引用的元素是否存在
  const ariaDescribedby = element.getAttribute('aria-describedby');
  if (ariaDescribedby) {
    const ids = ariaDescribedby.split(' ');
    for (const id of ids) {
      if (!document.getElementById(id)) {
        issues.push(`aria-describedby 引用的元素 "${id}" 不存在`);
      }
    }
  }
  
  // 检查 aria-labelledby 引用的元素是否存在
  const ariaLabelledby = element.getAttribute('aria-labelledby');
  if (ariaLabelledby) {
    const ids = ariaLabelledby.split(' ');
    for (const id of ids) {
      if (!document.getElementById(id)) {
        issues.push(`aria-labelledby 引用的元素 "${id}" 不存在`);
      }
    }
  }
  
  return issues;
}

/**
 * React Hook: 可访问性验证
 */
export function useAccessibilityValidation(
  elementRef: React.RefObject<HTMLElement>,
  enabled: boolean = process.env.NODE_ENV === 'development'
) {
  const [issues, setIssues] = React.useState<string[]>([]);
  
  React.useEffect(() => {
    if (!enabled || !elementRef.current) {return;}
    
    const element = elementRef.current;
    const validationIssues = validateElementAccessibility(element);
    setIssues(validationIssues);
    
    if (validationIssues.length > 0) {
      console.warn(
        `可访问性问题 (${element.tagName}):`,
        validationIssues
      );
    }
  }, [elementRef, enabled]);
  
  return issues;
}

// =============================================================================
// 导出所有工具
// =============================================================================

export const accessibilityHelpers = {
  // 焦点管理
  FocusTrap,
  useFocusTrap,
  useAutoFocus,
  
  // 键盘导航
  KeyboardNavigationManager,
  useKeyboardNavigation,
  
  // 屏幕阅读器
  getScreenReaderAnnouncer,
  announceToScreenReader,
  useScreenReaderAnnouncement,
  
  // 颜色对比度
  calculateContrastRatio,
  checkContrastCompliance,
  suggestAccessibleColors,
  
  // ARIA 工具
  generateId,
  useId,
  createAriaDescription,
  createAriaLabel,
  createAriaControls,
  useAriaRelationships,
  
  // 验证工具
  validateElementAccessibility,
  useAccessibilityValidation
} as const;

export type AccessibilityHelpers = typeof accessibilityHelpers;