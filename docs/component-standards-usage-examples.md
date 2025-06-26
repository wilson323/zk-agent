# 组件标准库使用示例

本文档提供了组件标准库在实际项目中的使用示例，展示如何将现有组件迁移到标准化模式。

## 目录

- [快速开始](#快速开始)
- [基础组件改造](#基础组件改造)
- [复杂组件重构](#复杂组件重构)
- [性能优化示例](#性能优化示例)
- [可访问性增强](#可访问性增强)
- [最佳实践](#最佳实践)

## 快速开始

### 1. 初始化组件标准库

```typescript
// app/layout.tsx 或 _app.tsx
import { initializeComponentStandards } from '@/lib/component-standards';

// 在应用启动时初始化
initializeComponentStandards({
  theme: 'auto',
  accessibility: {
    enableValidation: true,
    enableAnnouncements: true
  },
  performance: {
    enableMonitoring: true,
    enableOptimizations: true
  }
});
```

### 2. 基本导入和使用

```typescript
import {
  componentStandards,
  designTokens,
  accessibilityHelpers
} from '@/lib/component-standards';

// 使用设计令牌
const { colors, spacing, typography } = designTokens;

// 使用组件工厂
const { createStandardComponent } = componentStandards.factory;

// 使用可访问性工具
const { useFocusTrap, announceToScreenReader } = accessibilityHelpers;
```

## 基础组件改造

### 改造前：原始 Button 组件

```typescript
// components/ui/button.tsx (改造前)
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "underline-offset-4 hover:underline text-primary"
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
```

### 改造后：标准化 Button 组件

```typescript
// components/ui/button.tsx (改造后)
import React from 'react';
import {
  componentStandards,
  designTokens,
  validationSchemas,
  accessibilityHelpers,
  performanceOptimizers
} from '@/lib/component-standards';

// 使用标准化组件工厂
const { createStandardComponent, createComponentVariants } = componentStandards.factory;
const { buttonPropsSchema } = validationSchemas;
const { useAccessibilityValidation } = accessibilityHelpers;
const { createOptimizedMemo } = performanceOptimizers;

// 创建按钮变体
const buttonVariants = createComponentVariants({
  base: [
    "inline-flex items-center justify-center",
    "rounded-md text-sm font-medium",
    "transition-all duration-200 ease-in-out",
    "focus-visible:outline-none focus-visible:ring-2",
    "focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:opacity-50 disabled:pointer-events-none",
    "ring-offset-background"
  ],
  variants: {
    variant: {
      default: [
        "bg-primary text-primary-foreground",
        "hover:bg-primary/90 active:bg-primary/95",
        "shadow-sm hover:shadow-md"
      ],
      destructive: [
        "bg-destructive text-destructive-foreground",
        "hover:bg-destructive/90 active:bg-destructive/95",
        "shadow-sm hover:shadow-md"
      ],
      outline: [
        "border border-input bg-background",
        "hover:bg-accent hover:text-accent-foreground",
        "active:bg-accent/80"
      ],
      secondary: [
        "bg-secondary text-secondary-foreground",
        "hover:bg-secondary/80 active:bg-secondary/90",
        "shadow-sm"
      ],
      ghost: [
        "hover:bg-accent hover:text-accent-foreground",
        "active:bg-accent/80"
      ],
      link: [
        "text-primary underline-offset-4",
        "hover:underline focus:underline"
      ]
    },
    size: {
      sm: "h-9 px-3 text-xs",
      default: "h-10 px-4 py-2",
      lg: "h-11 px-8 text-base",
      icon: "h-10 w-10"
    },
    loading: {
      true: "cursor-not-allowed opacity-70"
    }
  },
  defaultVariants: {
    variant: "default",
    size: "default",
    loading: false
  }
});

// 定义组件属性接口
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  asChild?: boolean;
}

// 创建标准化按钮组件
const ButtonComponent = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = 'default',
    size = 'default',
    loading = false,
    loadingText,
    leftIcon,
    rightIcon,
    children,
    disabled,
    onClick,
    ...props
  }, ref) => {
    // 可访问性验证（开发环境）
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    useAccessibilityValidation(buttonRef, process.env.NODE_ENV === 'development');
    
    // 合并 refs
    React.useImperativeHandle(ref, () => buttonRef.current!);
    
    // 处理点击事件
    const handleClick = React.useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        if (loading || disabled) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      },
      [loading, disabled, onClick]
    );
    
    // 渲染内容
    const renderContent = () => {
      if (loading) {
        return (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {loadingText || children}
          </>
        );
      }
      
      return (
        <>
          {leftIcon && (
            <span className="mr-2" aria-hidden="true">
              {leftIcon}
            </span>
          )}
          {children}
          {rightIcon && (
            <span className="ml-2" aria-hidden="true">
              {rightIcon}
            </span>
          )}
        </>
      );
    };
    
    return (
      <button
        ref={buttonRef}
        className={buttonVariants({ variant, size, loading, className })}
        disabled={disabled || loading}
        onClick={handleClick}
        aria-disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {renderContent()}
      </button>
    );
  }
);

ButtonComponent.displayName = "Button";

// 使用性能优化
export const Button = createOptimizedMemo(ButtonComponent);

// 导出变体函数供其他组件使用
export { buttonVariants };

// 导出类型
export type { ButtonProps };
```

## 复杂组件重构

### 用户管理组件重构示例

```typescript
// components/admin/user-management.tsx (重构后)
import React from 'react';
import {
  componentStandards,
  performanceOptimizers,
  accessibilityHelpers
} from '@/lib/component-standards';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

const {
  useVirtualization,
  useDebouncedCallback,
  useMemoryMonitor
} = performanceOptimizers;

const {
  useKeyboardNavigation,
  useScreenReaderAnnouncement,
  useFocusTrap
} = accessibilityHelpers;

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
}

interface UserManagementProps {
  users: User[];
  onUserUpdate: (user: User) => void;
  onUserDelete: (userId: string) => void;
}

export const UserManagement = React.memo<UserManagementProps>((
  { users, onUserUpdate, onUserDelete }
) => {
  // 状态管理
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedUsers, setSelectedUsers] = React.useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  
  // 性能监控
  const { memoryUsage } = useMemoryMonitor({
    threshold: 50,
    onThresholdExceeded: (usage) => {
      console.warn(`用户管理组件内存使用过高: ${usage.toFixed(2)}MB`);
    }
  });
  
  // 屏幕阅读器公告
  const announce = useScreenReaderAnnouncement();
  
  // 防抖搜索
  const debouncedSearch = useDebouncedCallback(
    (term: string) => {
      // 执行搜索逻辑
      announce(`搜索结果已更新，找到 ${filteredUsers.length} 个用户`);
    },
    { delay: 300 }
  );
  
  // 过滤用户
  const filteredUsers = React.useMemo(() => {
    return users.filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);
  
  // 虚拟化配置
  const {
    visibleItems,
    totalHeight,
    handleScroll
  } = useVirtualization(filteredUsers, {
    itemHeight: 80,
    containerHeight: 400,
    overscan: 5
  });
  
  // 键盘导航
  const { containerRef } = useKeyboardNavigation({
    enableArrowKeys: true,
    enableHomeEnd: true,
    orientation: 'vertical'
  });
  
  // 焦点陷阱（删除对话框）
  const dialogRef = useFocusTrap(isDeleteDialogOpen, {
    autoFocus: true,
    restoreFocus: true
  });
  
  // 处理搜索
  const handleSearch = React.useCallback((value: string) => {
    setSearchTerm(value);
    debouncedSearch(value);
  }, [debouncedSearch]);
  
  // 处理用户选择
  const handleUserSelect = React.useCallback((userId: string, selected: boolean) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      
      announce(`${selected ? '选中' : '取消选中'}用户，当前选中 ${newSet.size} 个用户`);
      return newSet;
    });
  }, [announce]);
  
  // 批量删除
  const handleBatchDelete = React.useCallback(() => {
    if (selectedUsers.size === 0) return;
    
    setIsDeleteDialogOpen(true);
    announce(`准备删除 ${selectedUsers.size} 个用户`);
  }, [selectedUsers.size, announce]);
  
  // 确认删除
  const confirmDelete = React.useCallback(() => {
    selectedUsers.forEach(userId => {
      onUserDelete(userId);
    });
    
    announce(`已删除 ${selectedUsers.size} 个用户`);
    setSelectedUsers(new Set());
    setIsDeleteDialogOpen(false);
  }, [selectedUsers, onUserDelete, announce]);
  
  // 渲染用户项
  const renderUserItem = React.useCallback((user: User, index: number, style: React.CSSProperties) => {
    const isSelected = selectedUsers.has(user.id);
    
    return (
      <div
        key={user.id}
        style={style}
        className="flex items-center p-4 border-b hover:bg-gray-50"
        role="row"
        aria-selected={isSelected}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => handleUserSelect(user.id, e.target.checked)}
          className="mr-3"
          aria-label={`选择用户 ${user.name}`}
        />
        
        <div className="flex-1">
          <div className="font-medium">{user.name}</div>
          <div className="text-sm text-gray-500">{user.email}</div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span
            className={`px-2 py-1 rounded text-xs ${
              user.status === 'active' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}
          >
            {user.status === 'active' ? '活跃' : '非活跃'}
          </span>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUserUpdate(user)}
            aria-label={`编辑用户 ${user.name}`}
          >
            编辑
          </Button>
          
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onUserDelete(user.id)}
            aria-label={`删除用户 ${user.name}`}
          >
            删除
          </Button>
        </div>
      </div>
    );
  }, [selectedUsers, handleUserSelect, onUserUpdate, onUserDelete]);
  
  return (
    <Card className="p-6">
      {/* 头部操作区 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">用户管理</h2>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-500">
              内存使用: {memoryUsage.toFixed(2)}MB
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <Input
            placeholder="搜索用户..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="max-w-sm"
            aria-label="搜索用户"
          />
          
          <Button
            variant="destructive"
            onClick={handleBatchDelete}
            disabled={selectedUsers.size === 0}
            aria-label={`批量删除 ${selectedUsers.size} 个选中用户`}
          >
            删除选中 ({selectedUsers.size})
          </Button>
        </div>
      </div>
      
      {/* 用户列表 */}
      <div
        ref={containerRef}
        className="border rounded-lg"
        role="grid"
        aria-label="用户列表"
        aria-rowcount={filteredUsers.length}
      >
        {/* 表头 */}
        <div className="flex items-center p-4 bg-gray-50 border-b font-medium" role="row">
          <input
            type="checkbox"
            checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
                announce(`选中所有 ${filteredUsers.length} 个用户`);
              } else {
                setSelectedUsers(new Set());
                announce('取消选中所有用户');
              }
            }}
            className="mr-3"
            aria-label="全选用户"
          />
          <div className="flex-1">用户信息</div>
          <div>状态</div>
          <div className="w-32">操作</div>
        </div>
        
        {/* 虚拟化列表 */}
        <div
          style={{ height: 400, overflow: 'auto' }}
          onScroll={handleScroll}
        >
          <div style={{ height: totalHeight, position: 'relative' }}>
            {visibleItems.map(({ index, item, offset, height }) => (
              <div
                key={item.id}
                style={{
                  position: 'absolute',
                  top: offset,
                  left: 0,
                  right: 0,
                  height
                }}
              >
                {renderUserItem(item, index, {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* 删除确认对话框 */}
      {isDeleteDialogOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div
            ref={dialogRef}
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
          >
            <h3 id="delete-dialog-title" className="text-lg font-semibold mb-4">
              确认删除
            </h3>
            
            <p className="text-gray-600 mb-6">
              您确定要删除选中的 {selectedUsers.size} 个用户吗？此操作不可撤销。
            </p>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                取消
              </Button>
              
              <Button
                variant="destructive"
                onClick={confirmDelete}
              >
                确认删除
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
});

UserManagement.displayName = 'UserManagement';
```

## 性能优化示例

### 大列表优化

```typescript
// components/optimized-list.tsx
import React from 'react';
import {
  performanceOptimizers,
  accessibilityHelpers
} from '@/lib/component-standards';

const {
  VirtualList,
  useMemoryMonitor,
  useDebouncedCallback
} = performanceOptimizers;

const { announceToScreenReader } = accessibilityHelpers;

interface ListItem {
  id: string;
  title: string;
  description: string;
  category: string;
}

interface OptimizedListProps {
  items: ListItem[];
  onItemClick: (item: ListItem) => void;
}

export const OptimizedList: React.FC<OptimizedListProps> = ({
  items,
  onItemClick
}) => {
  const [filter, setFilter] = React.useState('');
  
  // 内存监控
  useMemoryMonitor({
    threshold: 100,
    interval: 10000,
    onThresholdExceeded: (usage) => {
      console.warn(`列表组件内存使用: ${usage}MB`);
    }
  });
  
  // 防抖过滤
  const debouncedFilter = useDebouncedCallback(
    (value: string) => {
      announceToScreenReader(
        `过滤结果已更新，显示 ${filteredItems.length} 项`
      );
    },
    { delay: 300 }
  );
  
  // 过滤项目
  const filteredItems = React.useMemo(() => {
    if (!filter) return items;
    
    return items.filter(item =>
      item.title.toLowerCase().includes(filter.toLowerCase()) ||
      item.description.toLowerCase().includes(filter.toLowerCase())
    );
  }, [items, filter]);
  
  // 处理过滤
  const handleFilterChange = React.useCallback((value: string) => {
    setFilter(value);
    debouncedFilter(value);
  }, [debouncedFilter]);
  
  // 渲染列表项
  const renderItem = React.useCallback(
    (item: ListItem, index: number, style: React.CSSProperties) => (
      <div
        style={style}
        className="p-4 border-b hover:bg-gray-50 cursor-pointer"
        onClick={() => onItemClick(item)}
        role="button"
        tabIndex={0}
        aria-label={`${item.title} - ${item.description}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onItemClick(item);
          }
        }}
      >
        <h3 className="font-semibold">{item.title}</h3>
        <p className="text-gray-600 text-sm">{item.description}</p>
        <span className="text-xs text-blue-600">{item.category}</span>
      </div>
    ),
    [onItemClick]
  );
  
  return (
    <div className="w-full">
      {/* 过滤器 */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="搜索项目..."
          value={filter}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="w-full p-2 border rounded"
          aria-label="搜索列表项目"
        />
      </div>
      
      {/* 虚拟化列表 */}
      <VirtualList
        items={filteredItems}
        itemHeight={100}
        containerHeight={600}
        renderItem={renderItem}
        className="border rounded"
      />
      
      {/* 统计信息 */}
      <div className="mt-4 text-sm text-gray-500">
        显示 {filteredItems.length} / {items.length} 项
      </div>
    </div>
  );
};
```

## 可访问性增强

### 模态对话框组件

```typescript
// components/ui/dialog.tsx
import React from 'react';
import {
  accessibilityHelpers,
  performanceOptimizers
} from '@/lib/component-standards';

const {
  useFocusTrap,
  useId,
  announceToScreenReader
} = accessibilityHelpers;

const { createOptimizedMemo } = performanceOptimizers;

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const DialogComponent: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md'
}) => {
  // 生成唯一 ID
  const titleId = useId('dialog-title');
  const descriptionId = useId('dialog-description');
  
  // 焦点陷阱
  const dialogRef = useFocusTrap(open, {
    autoFocus: true,
    restoreFocus: true
  });
  
  // 键盘事件处理
  React.useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);
  
  // 屏幕阅读器公告
  React.useEffect(() => {
    if (open) {
      announceToScreenReader(`对话框已打开: ${title}`);
    }
  }, [open, title]);
  
  // 阻止背景滚动
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);
  
  if (!open) return null;
  
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };
  
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* 对话框内容 */}
      <div
        ref={dialogRef}
        className={`
          relative bg-white rounded-lg shadow-xl p-6 w-full mx-4
          ${sizeClasses[size]}
          transform transition-all duration-200 ease-out
          scale-100 opacity-100
        `}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="关闭对话框"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        
        {/* 标题 */}
        <h2 id={titleId} className="text-xl font-semibold mb-4 pr-8">
          {title}
        </h2>
        
        {/* 描述 */}
        {description && (
          <p id={descriptionId} className="text-gray-600 mb-6">
            {description}
          </p>
        )}
        
        {/* 内容 */}
        <div>{children}</div>
      </div>
    </div>
  );
};

export const Dialog = createOptimizedMemo(DialogComponent);
```

## 最佳实践

### 1. 组件开发流程

```typescript
// 1. 定义组件接口和验证模式
import { z } from 'zod';
import { validationSchemas } from '@/lib/component-standards';

const myComponentSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  variant: z.enum(['primary', 'secondary']),
  size: z.enum(['sm', 'md', 'lg']),
  disabled: z.boolean().optional()
});

type MyComponentProps = z.infer<typeof myComponentSchema>;

// 2. 创建组件变体
import { createComponentVariants } from '@/lib/component-standards';

const variants = createComponentVariants({
  base: 'base-styles',
  variants: {
    variant: {
      primary: 'primary-styles',
      secondary: 'secondary-styles'
    },
    size: {
      sm: 'small-styles',
      md: 'medium-styles',
      lg: 'large-styles'
    }
  }
});

// 3. 实现组件逻辑
const MyComponent: React.FC<MyComponentProps> = (props) => {
  // 验证属性（开发环境）
  if (process.env.NODE_ENV === 'development') {
    myComponentSchema.parse(props);
  }
  
  // 组件实现...
};

// 4. 应用性能优化
import { createOptimizedMemo } from '@/lib/component-standards';

export default createOptimizedMemo(MyComponent);
```

### 2. 主题和样式管理

```typescript
// styles/theme.ts
import { designTokens } from '@/lib/component-standards';

// 扩展设计令牌
export const customTheme = {
  ...designTokens,
  colors: {
    ...designTokens.colors,
    brand: {
      50: '#f0f9ff',
      500: '#3b82f6',
      900: '#1e3a8a'
    }
  }
};

// 在 Tailwind 配置中使用
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: customTheme.colors,
      spacing: customTheme.spacing,
      fontSize: customTheme.typography.fontSize
    }
  }
};
```

### 3. 测试策略

```typescript
// __tests__/component.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { MyComponent } from '../MyComponent';

expect.extend(toHaveNoViolations);

describe('MyComponent', () => {
  // 基础渲染测试
  it('renders correctly', () => {
    render(<MyComponent title="Test" variant="primary" size="md" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
  
  // 可访问性测试
  it('has no accessibility violations', async () => {
    const { container } = render(
      <MyComponent title="Test" variant="primary" size="md" />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  
  // 键盘导航测试
  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<MyComponent title="Test" variant="primary" size="md" />);
    
    await user.tab();
    expect(screen.getByRole('button')).toHaveFocus();
    
    await user.keyboard('{Enter}');
    // 验证交互行为
  });
  
  // 性能测试
  it('renders within performance budget', () => {
    const startTime = performance.now();
    render(<MyComponent title="Test" variant="primary" size="md" />);
    const endTime = performance.now();
    
    expect(endTime - startTime).toBeLessThan(16); // 一帧时间
  });
});
```

### 4. 文档和故事书

```typescript
// stories/MyComponent.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { MyComponent } from '../MyComponent';
import { designTokens } from '@/lib/component-standards';

const meta: Meta<typeof MyComponent> = {
  title: 'Components/MyComponent',
  component: MyComponent,
  parameters: {
    docs: {
      description: {
        component: '基于组件标准库构建的示例组件'
      }
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true
          }
        ]
      }
    }
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary']
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg']
    }
  }
};

export default meta;
type Story = StoryObj<typeof MyComponent>;

export const Default: Story = {
  args: {
    title: '默认组件',
    variant: 'primary',
    size: 'md'
  }
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      {(['primary', 'secondary'] as const).map(variant => (
        <div key={variant} className="space-x-4">
          {(['sm', 'md', 'lg'] as const).map(size => (
            <MyComponent
              key={size}
              title={`${variant} ${size}`}
              variant={variant}
              size={size}
            />
          ))}
        </div>
      ))}
    </div>
  )
};
```

## 总结

通过使用组件标准库，我们实现了：

1. **一致性**: 统一的设计令牌和组件变体系统
2. **可访问性**: 内置的 ARIA 支持和键盘导航
3. **性能**: 虚拟化、防抖节流和内存监控
4. **可维护性**: 标准化的组件结构和验证
5. **开发体验**: 类型安全和开发时验证

这些示例展示了如何将现有组件逐步迁移到标准化模式，同时保持向后兼容性和渐进式改进。