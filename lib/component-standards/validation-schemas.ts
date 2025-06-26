/**
 * 组件验证模式库
 * 基于 Zod 和业界最佳实践的组件属性验证
 */

import { z } from 'zod';

// =============================================================================
// 基础验证模式
// =============================================================================

/**
 * 基础颜色变体验证
 * 遵循 Radix UI 颜色系统标准
 */
export const colorVariantSchema = z.enum([
  'default',
  'primary',
  'secondary',
  'destructive',
  'warning',
  'success',
  'info',
  'muted',
  'accent',
  'outline',
  'ghost',
  'link'
]);

/**
 * 尺寸变体验证
 * 基于 Tailwind CSS 尺寸系统
 */
export const sizeVariantSchema = z.enum([
  'xs',
  'sm',
  'default',
  'lg',
  'xl',
  '2xl'
]);

/**
 * 圆角变体验证
 * 遵循 Tailwind CSS 圆角系统
 */
export const radiusVariantSchema = z.enum([
  'none',
  'sm',
  'default',
  'md',
  'lg',
  'xl',
  'full'
]);

/**
 * 阴影变体验证
 * 基于 Material Design 阴影系统
 */
export const shadowVariantSchema = z.enum([
  'none',
  'sm',
  'default',
  'md',
  'lg',
  'xl',
  '2xl',
  'inner'
]);

// =============================================================================
// 可访问性验证模式
// =============================================================================

/**
 * ARIA 属性验证
 * 遵循 WAI-ARIA 1.2 规范
 */
export const ariaPropsSchema = z.object({
  'aria-label': z.string().optional(),
  'aria-labelledby': z.string().optional(),
  'aria-describedby': z.string().optional(),
  'aria-expanded': z.boolean().optional(),
  'aria-hidden': z.boolean().optional(),
  'aria-disabled': z.boolean().optional(),
  'aria-pressed': z.boolean().optional(),
  'aria-selected': z.boolean().optional(),
  'aria-checked': z.boolean().optional(),
  'aria-current': z.enum(['page', 'step', 'location', 'date', 'time', 'true', 'false']).optional(),
  'aria-live': z.enum(['off', 'polite', 'assertive']).optional(),
  'aria-atomic': z.boolean().optional(),
  'aria-busy': z.boolean().optional(),
  'aria-controls': z.string().optional(),
  'aria-owns': z.string().optional(),
  'aria-flowto': z.string().optional(),
  'aria-haspopup': z.enum(['false', 'true', 'menu', 'listbox', 'tree', 'grid', 'dialog']).optional(),
  'aria-invalid': z.union([z.boolean(), z.enum(['grammar', 'spelling'])]).optional(),
  'aria-required': z.boolean().optional(),
  'aria-readonly': z.boolean().optional(),
  'aria-multiline': z.boolean().optional(),
  'aria-multiselectable': z.boolean().optional(),
  'aria-orientation': z.enum(['horizontal', 'vertical']).optional(),
  'aria-placeholder': z.string().optional(),
  'aria-valuemin': z.number().optional(),
  'aria-valuemax': z.number().optional(),
  'aria-valuenow': z.number().optional(),
  'aria-valuetext': z.string().optional(),
  'aria-level': z.number().optional(),
  'aria-posinset': z.number().optional(),
  'aria-setsize': z.number().optional(),
  'aria-sort': z.enum(['none', 'ascending', 'descending', 'other']).optional(),
  'aria-autocomplete': z.enum(['none', 'inline', 'list', 'both']).optional(),
  'aria-dropeffect': z.enum(['none', 'copy', 'execute', 'link', 'move', 'popup']).optional(),
  'aria-grabbed': z.boolean().optional(),
  'aria-activedescendant': z.string().optional(),
  'aria-colcount': z.number().optional(),
  'aria-colindex': z.number().optional(),
  'aria-colspan': z.number().optional(),
  'aria-rowcount': z.number().optional(),
  'aria-rowindex': z.number().optional(),
  'aria-rowspan': z.number().optional(),
  'aria-details': z.string().optional(),
  'aria-errormessage': z.string().optional(),
  'aria-keyshortcuts': z.string().optional(),
  'aria-modal': z.boolean().optional(),
  'aria-roledescription': z.string().optional()
}).partial();

/**
 * 角色验证
 * 基于 WAI-ARIA 角色模型
 */
export const roleSchema = z.enum([
  // Document structure roles
  'application',
  'article',
  'banner',
  'complementary',
  'contentinfo',
  'form',
  'main',
  'navigation',
  'region',
  'search',
  'none',
  'presentation',
  
  // Landmark roles
  'banner',
  'complementary',
  'contentinfo',
  'form',
  'main',
  'navigation',
  'region',
  'search',
  
  // Widget roles
  'alert',
  'alertdialog',
  'button',
  'checkbox',
  'dialog',
  'gridcell',
  'link',
  'log',
  'marquee',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'progressbar',
  'radio',
  'scrollbar',
  'searchbox',
  'slider',
  'spinbutton',
  'status',
  'switch',
  'tab',
  'tabpanel',
  'textbox',
  'timer',
  'tooltip',
  'treeitem',
  
  // Composite widget roles
  'combobox',
  'grid',
  'listbox',
  'menu',
  'menubar',
  'radiogroup',
  'tablist',
  'tree',
  'treegrid',
  
  // Document structure roles
  'article',
  'columnheader',
  'definition',
  'directory',
  'document',
  'group',
  'heading',
  'img',
  'list',
  'listitem',
  'math',
  'note',
  'presentation',
  'region',
  'row',
  'rowgroup',
  'rowheader',
  'separator',
  'toolbar'
]).optional();

// =============================================================================
// 组件特定验证模式
// =============================================================================

/**
 * 按钮组件验证
 * 基于 HTML button 元素和 ARIA 最佳实践
 */
export const buttonPropsSchema = z.object({
  variant: colorVariantSchema.default('default'),
  size: sizeVariantSchema.default('default'),
  disabled: z.boolean().optional(),
  loading: z.boolean().optional(),
  type: z.enum(['button', 'submit', 'reset']).default('button'),
  children: z.union([z.string(), z.any()]),
  onClick: z.function().optional(),
  onFocus: z.function().optional(),
  onBlur: z.function().optional(),
  className: z.string().optional(),
  id: z.string().optional(),
  tabIndex: z.number().optional(),
  autoFocus: z.boolean().optional(),
  form: z.string().optional(),
  formAction: z.string().optional(),
  formEncType: z.string().optional(),
  formMethod: z.enum(['get', 'post']).optional(),
  formNoValidate: z.boolean().optional(),
  formTarget: z.string().optional(),
  name: z.string().optional(),
  value: z.string().optional()
}).merge(ariaPropsSchema);

/**
 * 输入组件验证
 * 基于 HTML input 元素和表单最佳实践
 */
export const inputPropsSchema = z.object({
  type: z.enum([
    'text', 'password', 'email', 'number', 'tel', 'url', 'search',
    'date', 'datetime-local', 'month', 'time', 'week',
    'color', 'file', 'hidden', 'range'
  ]).default('text'),
  variant: z.enum(['default', 'filled', 'outline', 'ghost']).default('default'),
  size: sizeVariantSchema.default('default'),
  placeholder: z.string().optional(),
  value: z.union([z.string(), z.number()]).optional(),
  defaultValue: z.union([z.string(), z.number()]).optional(),
  disabled: z.boolean().optional(),
  readOnly: z.boolean().optional(),
  required: z.boolean().optional(),
  autoComplete: z.string().optional(),
  autoFocus: z.boolean().optional(),
  maxLength: z.number().optional(),
  minLength: z.number().optional(),
  max: z.union([z.string(), z.number()]).optional(),
  min: z.union([z.string(), z.number()]).optional(),
  step: z.union([z.string(), z.number()]).optional(),
  pattern: z.string().optional(),
  multiple: z.boolean().optional(),
  accept: z.string().optional(),
  capture: z.union([z.boolean(), z.enum(['user', 'environment'])]).optional(),
  onChange: z.function().optional(),
  onInput: z.function().optional(),
  onFocus: z.function().optional(),
  onBlur: z.function().optional(),
  onKeyDown: z.function().optional(),
  onKeyUp: z.function().optional(),
  className: z.string().optional(),
  id: z.string().optional(),
  name: z.string().optional(),
  form: z.string().optional(),
  list: z.string().optional(),
  tabIndex: z.number().optional()
}).merge(ariaPropsSchema);

/**
 * 卡片组件验证
 * 基于 Material Design Card 规范
 */
export const cardPropsSchema = z.object({
  variant: z.enum(['default', 'outlined', 'elevated', 'filled']).default('default'),
  padding: z.enum(['none', 'sm', 'default', 'lg', 'xl']).default('default'),
  radius: radiusVariantSchema.default('default'),
  shadow: shadowVariantSchema.default('default'),
  interactive: z.boolean().optional(),
  disabled: z.boolean().optional(),
  children: z.any(),
  onClick: z.function().optional(),
  onFocus: z.function().optional(),
  onBlur: z.function().optional(),
  onMouseEnter: z.function().optional(),
  onMouseLeave: z.function().optional(),
  className: z.string().optional(),
  id: z.string().optional(),
  tabIndex: z.number().optional()
}).merge(ariaPropsSchema);

/**
 * 对话框组件验证
 * 基于 WAI-ARIA Dialog 模式
 */
export const dialogPropsSchema = z.object({
  open: z.boolean(),
  onOpenChange: z.function().optional(),
  modal: z.boolean().default(true),
  size: z.enum(['sm', 'default', 'lg', 'xl', 'full']).default('default'),
  position: z.enum(['center', 'top', 'bottom']).default('center'),
  closeOnEscape: z.boolean().default(true),
  closeOnOutsideClick: z.boolean().default(true),
  preventScroll: z.boolean().default(true),
  restoreFocus: z.boolean().default(true),
  children: z.any(),
  className: z.string().optional(),
  id: z.string().optional(),
  onEscapeKeyDown: z.function().optional(),
  onPointerDownOutside: z.function().optional(),
  onInteractOutside: z.function().optional()
}).merge(ariaPropsSchema);

/**
 * 表格组件验证
 * 基于 WAI-ARIA Table 模式
 */
export const tablePropsSchema = z.object({
  data: z.array(z.record(z.any())),
  columns: z.array(z.object({
    key: z.string(),
    title: z.string(),
    dataIndex: z.string().optional(),
    render: z.function().optional(),
    sortable: z.boolean().optional(),
    filterable: z.boolean().optional(),
    width: z.union([z.string(), z.number()]).optional(),
    align: z.enum(['left', 'center', 'right']).optional(),
    fixed: z.enum(['left', 'right']).optional()
  })),
  loading: z.boolean().optional(),
  pagination: z.object({
    current: z.number(),
    pageSize: z.number(),
    total: z.number(),
    showSizeChanger: z.boolean().optional(),
    showQuickJumper: z.boolean().optional(),
    showTotal: z.function().optional(),
    onChange: z.function().optional(),
    onShowSizeChange: z.function().optional()
  }).optional(),
  rowSelection: z.object({
    type: z.enum(['checkbox', 'radio']).optional(),
    selectedRowKeys: z.array(z.union([z.string(), z.number()])).optional(),
    onChange: z.function().optional(),
    onSelect: z.function().optional(),
    onSelectAll: z.function().optional(),
    getCheckboxProps: z.function().optional()
  }).optional(),
  expandable: z.object({
    expandedRowKeys: z.array(z.union([z.string(), z.number()])).optional(),
    defaultExpandedRowKeys: z.array(z.union([z.string(), z.number()])).optional(),
    expandedRowRender: z.function().optional(),
    expandRowByClick: z.boolean().optional(),
    onExpand: z.function().optional(),
    onExpandedRowsChange: z.function().optional()
  }).optional(),
  scroll: z.object({
    x: z.union([z.string(), z.number(), z.boolean()]).optional(),
    y: z.union([z.string(), z.number()]).optional()
  }).optional(),
  size: z.enum(['small', 'default', 'large']).default('default'),
  bordered: z.boolean().optional(),
  showHeader: z.boolean().default(true),
  sticky: z.boolean().optional(),
  summary: z.function().optional(),
  className: z.string().optional(),
  id: z.string().optional(),
  onRow: z.function().optional(),
  onHeaderRow: z.function().optional(),
  rowKey: z.union([z.string(), z.function()]).optional(),
  rowClassName: z.union([z.string(), z.function()]).optional()
}).merge(ariaPropsSchema);

// =============================================================================
// 表单验证模式
// =============================================================================

/**
 * 表单字段验证
 * 基于 React Hook Form 和 HTML5 验证
 */
export const formFieldPropsSchema = z.object({
  name: z.string(),
  label: z.string().optional(),
  description: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  disabled: z.boolean().optional(),
  readOnly: z.boolean().optional(),
  error: z.string().optional(),
  success: z.boolean().optional(),
  loading: z.boolean().optional(),
  size: sizeVariantSchema.default('default'),
  variant: z.enum(['default', 'filled', 'outline']).default('default'),
  children: z.any(),
  className: z.string().optional(),
  id: z.string().optional()
}).merge(ariaPropsSchema);

/**
 * 表单验证规则
 * 基于常见验证模式
 */
export const validationRulesSchema = z.object({
  required: z.union([z.boolean(), z.string()]).optional(),
  minLength: z.union([z.number(), z.object({ value: z.number(), message: z.string() })]).optional(),
  maxLength: z.union([z.number(), z.object({ value: z.number(), message: z.string() })]).optional(),
  min: z.union([z.number(), z.object({ value: z.number(), message: z.string() })]).optional(),
  max: z.union([z.number(), z.object({ value: z.number(), message: z.string() })]).optional(),
  pattern: z.union([z.instanceof(RegExp), z.object({ value: z.instanceof(RegExp), message: z.string() })]).optional(),
  validate: z.union([z.function(), z.record(z.function())]).optional(),
  valueAsNumber: z.boolean().optional(),
  valueAsDate: z.boolean().optional(),
  setValueAs: z.function().optional(),
  disabled: z.boolean().optional(),
  onChange: z.function().optional(),
  onBlur: z.function().optional(),
  value: z.any().optional(),
  shouldUnregister: z.boolean().optional(),
  deps: z.array(z.string()).optional()
});

// =============================================================================
// 布局组件验证模式
// =============================================================================

/**
 * 网格系统验证
 * 基于 CSS Grid 和 Flexbox
 */
export const gridPropsSchema = z.object({
  container: z.boolean().optional(),
  item: z.boolean().optional(),
  columns: z.union([z.number(), z.object({
    xs: z.number().optional(),
    sm: z.number().optional(),
    md: z.number().optional(),
    lg: z.number().optional(),
    xl: z.number().optional(),
    '2xl': z.number().optional()
  })]).optional(),
  span: z.union([z.number(), z.object({
    xs: z.number().optional(),
    sm: z.number().optional(),
    md: z.number().optional(),
    lg: z.number().optional(),
    xl: z.number().optional(),
    '2xl': z.number().optional()
  })]).optional(),
  offset: z.union([z.number(), z.object({
    xs: z.number().optional(),
    sm: z.number().optional(),
    md: z.number().optional(),
    lg: z.number().optional(),
    xl: z.number().optional(),
    '2xl': z.number().optional()
  })]).optional(),
  gap: z.union([z.number(), z.string(), z.object({
    xs: z.union([z.number(), z.string()]).optional(),
    sm: z.union([z.number(), z.string()]).optional(),
    md: z.union([z.number(), z.string()]).optional(),
    lg: z.union([z.number(), z.string()]).optional(),
    xl: z.union([z.number(), z.string()]).optional(),
    '2xl': z.union([z.number(), z.string()]).optional()
  })]).optional(),
  direction: z.enum(['row', 'column', 'row-reverse', 'column-reverse']).optional(),
  justify: z.enum(['start', 'end', 'center', 'between', 'around', 'evenly']).optional(),
  align: z.enum(['start', 'end', 'center', 'baseline', 'stretch']).optional(),
  wrap: z.enum(['nowrap', 'wrap', 'wrap-reverse']).optional(),
  children: z.any(),
  className: z.string().optional(),
  id: z.string().optional()
});

/**
 * 堆栈布局验证
 * 基于 Flexbox 垂直布局
 */
export const stackPropsSchema = z.object({
  direction: z.enum(['vertical', 'horizontal']).default('vertical'),
  spacing: z.union([z.number(), z.string(), z.object({
    xs: z.union([z.number(), z.string()]).optional(),
    sm: z.union([z.number(), z.string()]).optional(),
    md: z.union([z.number(), z.string()]).optional(),
    lg: z.union([z.number(), z.string()]).optional(),
    xl: z.union([z.number(), z.string()]).optional(),
    '2xl': z.union([z.number(), z.string()]).optional()
  })]).optional(),
  align: z.enum(['start', 'end', 'center', 'baseline', 'stretch']).optional(),
  justify: z.enum(['start', 'end', 'center', 'between', 'around', 'evenly']).optional(),
  wrap: z.boolean().optional(),
  divider: z.any().optional(),
  children: z.any(),
  className: z.string().optional(),
  id: z.string().optional()
});

// =============================================================================
// 导航组件验证模式
// =============================================================================

/**
 * 导航菜单验证
 * 基于 WAI-ARIA Menu 模式
 */
export const menuPropsSchema = z.object({
  items: z.array(z.object({
    key: z.string(),
    label: z.string(),
    icon: z.any().optional(),
    disabled: z.boolean().optional(),
    danger: z.boolean().optional(),
    children: z.array(z.any()).optional(),
    onClick: z.function().optional(),
    href: z.string().optional(),
    target: z.string().optional()
  })),
  mode: z.enum(['horizontal', 'vertical', 'inline']).default('vertical'),
  theme: z.enum(['light', 'dark']).default('light'),
  selectedKeys: z.array(z.string()).optional(),
  defaultSelectedKeys: z.array(z.string()).optional(),
  openKeys: z.array(z.string()).optional(),
  defaultOpenKeys: z.array(z.string()).optional(),
  multiple: z.boolean().optional(),
  selectable: z.boolean().default(true),
  inlineCollapsed: z.boolean().optional(),
  inlineIndent: z.number().optional(),
  triggerSubMenuAction: z.enum(['hover', 'click']).default('hover'),
  onSelect: z.function().optional(),
  onDeselect: z.function().optional(),
  onOpenChange: z.function().optional(),
  onClick: z.function().optional(),
  className: z.string().optional(),
  id: z.string().optional()
}).merge(ariaPropsSchema);

/**
 * 面包屑导航验证
 * 基于 WAI-ARIA Breadcrumb 模式
 */
export const breadcrumbPropsSchema = z.object({
  items: z.array(z.object({
    title: z.string(),
    href: z.string().optional(),
    onClick: z.function().optional(),
    icon: z.any().optional(),
    menu: z.object({
      items: z.array(z.object({
        key: z.string(),
        label: z.string(),
        href: z.string().optional(),
        onClick: z.function().optional()
      }))
    }).optional()
  })),
  separator: z.union([z.string(), z.any()]).optional(),
  maxItems: z.number().optional(),
  itemRender: z.function().optional(),
  className: z.string().optional(),
  id: z.string().optional()
}).merge(ariaPropsSchema);

// =============================================================================
// 反馈组件验证模式
// =============================================================================

/**
 * 警告提示验证
 * 基于 WAI-ARIA Alert 模式
 */
export const alertPropsSchema = z.object({
  type: z.enum(['success', 'info', 'warning', 'error']).default('info'),
  message: z.string(),
  description: z.string().optional(),
  showIcon: z.boolean().optional(),
  icon: z.any().optional(),
  closable: z.boolean().optional(),
  closeText: z.string().optional(),
  onClose: z.function().optional(),
  afterClose: z.function().optional(),
  banner: z.boolean().optional(),
  action: z.any().optional(),
  className: z.string().optional(),
  id: z.string().optional()
}).merge(ariaPropsSchema);

/**
 * 通知消息验证
 * 基于 Toast 模式
 */
export const notificationPropsSchema = z.object({
  type: z.enum(['success', 'info', 'warning', 'error']).default('info'),
  title: z.string(),
  description: z.string().optional(),
  duration: z.number().optional(),
  placement: z.enum([
    'topLeft', 'topRight', 'bottomLeft', 'bottomRight',
    'top', 'bottom'
  ]).default('topRight'),
  icon: z.any().optional(),
  closeIcon: z.any().optional(),
  onClose: z.function().optional(),
  onClick: z.function().optional(),
  key: z.string().optional(),
  btn: z.any().optional(),
  className: z.string().optional(),
  style: z.record(z.any()).optional()
});

// =============================================================================
// 数据展示组件验证模式
// =============================================================================

/**
 * 标签验证
 * 基于 Material Design Chip 规范
 */
export const tagPropsSchema = z.object({
  color: colorVariantSchema.default('default'),
  size: sizeVariantSchema.default('default'),
  variant: z.enum(['filled', 'outlined', 'soft']).default('filled'),
  closable: z.boolean().optional(),
  closeIcon: z.any().optional(),
  icon: z.any().optional(),
  bordered: z.boolean().optional(),
  children: z.union([z.string(), z.any()]),
  onClose: z.function().optional(),
  onClick: z.function().optional(),
  className: z.string().optional(),
  id: z.string().optional()
}).merge(ariaPropsSchema);

/**
 * 徽章验证
 * 基于 Material Design Badge 规范
 */
export const badgePropsSchema = z.object({
  count: z.union([z.number(), z.string(), z.any()]).optional(),
  showZero: z.boolean().optional(),
  overflowCount: z.number().default(99),
  dot: z.boolean().optional(),
  status: z.enum(['success', 'processing', 'default', 'error', 'warning']).optional(),
  text: z.string().optional(),
  color: z.string().optional(),
  size: z.enum(['default', 'small']).default('default'),
  offset: z.tuple([z.number(), z.number()]).optional(),
  title: z.string().optional(),
  children: z.any().optional(),
  className: z.string().optional(),
  id: z.string().optional()
});

// =============================================================================
// 工具函数
// =============================================================================

/**
 * 创建组件属性验证器
 * @param schema Zod 验证模式
 * @returns 验证函数
 */
export function createPropsValidator<T>(schema: z.ZodSchema<T>) {
  return (props: unknown): T => {
    try {
      return schema.parse(props);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        throw new Error(`组件属性验证失败: ${errorMessages}`);
      }
      throw error;
    }
  };
}

/**
 * 创建运行时属性检查器
 * @param schema Zod 验证模式
 * @param componentName 组件名称
 * @returns 属性检查函数
 */
export function createRuntimePropsChecker<T>(
  schema: z.ZodSchema<T>,
  componentName: string
) {
  return (props: unknown): T => {
    if (process.env.NODE_ENV === 'development') {
      try {
        return schema.parse(props);
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error(
            `[${componentName}] 组件属性验证失败:`,
            error.errors.map(err => ({
              path: err.path.join('.'),
              message: err.message,
              received: err.received
            }))
          );
        }
        throw error;
      }
    }
    return props as T;
  };
}

/**
 * 验证可访问性属性
 * @param props 组件属性
 * @returns 验证结果
 */
export function validateAccessibilityProps(props: Record<string, any>) {
  const warnings: string[] = [];
  
  // 检查必要的可访问性属性
  if (props.role === 'button' && !props['aria-label'] && !props.children) {
    warnings.push('按钮组件应该有 aria-label 或可见文本');
  }
  
  if (props.role === 'img' && !props['aria-label'] && !props.alt) {
    warnings.push('图片组件应该有 aria-label 或 alt 属性');
  }
  
  if (props.disabled && props.tabIndex !== -1) {
    warnings.push('禁用的元素应该设置 tabIndex={-1}');
  }
  
  if (props['aria-expanded'] !== undefined && !props['aria-controls']) {
    warnings.push('使用 aria-expanded 时应该同时设置 aria-controls');
  }
  
  if (process.env.NODE_ENV === 'development' && warnings.length > 0) {
    console.warn('可访问性检查警告:', warnings);
  }
  
  return warnings;
}

/**
 * 验证响应式属性
 * @param props 响应式属性对象
 * @returns 验证结果
 */
export function validateResponsiveProps(props: Record<string, any>) {
  const breakpoints = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  const errors: string[] = [];
  
  Object.entries(props).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      const invalidBreakpoints = Object.keys(value).filter(
        bp => !breakpoints.includes(bp)
      );
      
      if (invalidBreakpoints.length > 0) {
        errors.push(
          `${key} 包含无效的断点: ${invalidBreakpoints.join(', ')}`
        );
      }
    }
  });
  
  if (errors.length > 0) {
    throw new Error(`响应式属性验证失败: ${errors.join(', ')}`);
  }
  
  return true;
}

// =============================================================================
// 导出所有验证模式
// =============================================================================

export const validationSchemas = {
  // 基础模式
  colorVariant: colorVariantSchema,
  sizeVariant: sizeVariantSchema,
  radiusVariant: radiusVariantSchema,
  shadowVariant: shadowVariantSchema,
  
  // 可访问性模式
  ariaProps: ariaPropsSchema,
  role: roleSchema,
  
  // 组件模式
  buttonProps: buttonPropsSchema,
  inputProps: inputPropsSchema,
  cardProps: cardPropsSchema,
  dialogProps: dialogPropsSchema,
  tableProps: tablePropsSchema,
  
  // 表单模式
  formFieldProps: formFieldPropsSchema,
  validationRules: validationRulesSchema,
  
  // 布局模式
  gridProps: gridPropsSchema,
  stackProps: stackPropsSchema,
  
  // 导航模式
  menuProps: menuPropsSchema,
  breadcrumbProps: breadcrumbPropsSchema,
  
  // 反馈模式
  alertProps: alertPropsSchema,
  notificationProps: notificationPropsSchema,
  
  // 数据展示模式
  tagProps: tagPropsSchema,
  badgeProps: badgePropsSchema
} as const;

export type ValidationSchemas = typeof validationSchemas;

// 类型导出
export type ColorVariant = z.infer<typeof colorVariantSchema>;
export type SizeVariant = z.infer<typeof sizeVariantSchema>;
export type RadiusVariant = z.infer<typeof radiusVariantSchema>;
export type ShadowVariant = z.infer<typeof shadowVariantSchema>;
export type AriaProps = z.infer<typeof ariaPropsSchema>;
export type Role = z.infer<typeof roleSchema>;
export type ButtonProps = z.infer<typeof buttonPropsSchema>;
export type InputProps = z.infer<typeof inputPropsSchema>;
export type CardProps = z.infer<typeof cardPropsSchema>;
export type DialogProps = z.infer<typeof dialogPropsSchema>;
export type TableProps = z.infer<typeof tablePropsSchema>;
export type FormFieldProps = z.infer<typeof formFieldPropsSchema>;
export type ValidationRules = z.infer<typeof validationRulesSchema>;
export type GridProps = z.infer<typeof gridPropsSchema>;
export type StackProps = z.infer<typeof stackPropsSchema>;
export type MenuProps = z.infer<typeof menuPropsSchema>;
export type BreadcrumbProps = z.infer<typeof breadcrumbPropsSchema>;
export type AlertProps = z.infer<typeof alertPropsSchema>;
export type NotificationProps = z.infer<typeof notificationPropsSchema>;
export type TagProps = z.infer<typeof tagPropsSchema>;
export type BadgeProps = z.infer<typeof badgePropsSchema>;