/**
 * @file 依赖注入容器测试
 * @description 测试依赖注入容器的功能
 * @author ZK-Agent Team
 * @date 2024-12-20
 */

import 'reflect-metadata';
import { Container, ServiceLifetime, container, TYPES, inject, injectable } from '../../../lib/di/container';

// 测试接口和实现
interface ITestService {
  getValue(): string;
}

class TestService implements ITestService {
  getValue(): string {
    return 'test-value';
  }
}

interface ITestDependency {
  getName(): string;
}

class TestDependency implements ITestDependency {
  getName(): string {
    return 'test-dependency';
  }
}

// 带依赖的服务
class ServiceWithDependency {
  constructor(private dependency: ITestDependency) {}
  
  getDependencyName(): string {
    return this.dependency.getName();
  }
}

// 使用装饰器的服务
@injectable()
class DecoratedService {
  constructor(
    @inject(Symbol.for('TestDependency')) private dependency: ITestDependency
  ) {}
  
  getDependencyName(): string {
    return this.dependency.getName();
  }
}

describe('Container', () => {
  let testContainer: Container;
  
  beforeEach(() => {
    // 创建新的容器实例，避免测试间相互影响
    testContainer = new Container();
  });
  
  afterEach(() => {
    // 清理容器
    testContainer.dispose();
  });
  
  test('应该能够注册和解析单例服务', () => {
    // 注册服务
    const serviceToken = Symbol.for('TestService');
    testContainer.registerSingleton(serviceToken, () => new TestService());
    
    // 解析服务
    const service1 = testContainer.resolve<ITestService>(serviceToken);
    const service2 = testContainer.resolve<ITestService>(serviceToken);
    
    // 验证服务实例
    expect(service1).toBeDefined();
    expect(service1.getValue()).toBe('test-value');
    
    // 验证单例行为
    expect(service1).toBe(service2);
  });
  
  test('应该能够注册和解析瞬态服务', () => {
    // 注册服务
    const serviceToken = Symbol.for('TestService');
    testContainer.registerTransient(serviceToken, () => new TestService());
    
    // 解析服务
    const service1 = testContainer.resolve<ITestService>(serviceToken);
    const service2 = testContainer.resolve<ITestService>(serviceToken);
    
    // 验证服务实例
    expect(service1).toBeDefined();
    expect(service1.getValue()).toBe('test-value');
    
    // 验证瞬态行为
    expect(service1).not.toBe(service2);
  });
  
  test('应该能够解析带依赖的服务', () => {
    // 注册依赖
    const dependencyToken = Symbol.for('TestDependency');
    testContainer.registerSingleton(dependencyToken, () => new TestDependency());
    
    // 注册带依赖的服务
    const serviceToken = Symbol.for('ServiceWithDependency');
    testContainer.registerSingleton(serviceToken, (container) => {
      const dependency = container.resolve<ITestDependency>(dependencyToken);
      return new ServiceWithDependency(dependency);
    });
    
    // 解析服务
    const service = testContainer.resolve<ServiceWithDependency>(serviceToken);
    
    // 验证服务实例
    expect(service).toBeDefined();
    expect(service.getDependencyName()).toBe('test-dependency');
  });
  
  test('当服务未注册时应该抛出错误', () => {
    // 尝试解析未注册的服务
    const unknownToken = Symbol.for('UnknownService');
    
    // 验证抛出错误
    expect(() => {
      testContainer.resolve(unknownToken);
    }).toThrow();
  });
  
  test('应该能够检查服务是否已注册', () => {
    // 注册服务
    const serviceToken = Symbol.for('TestService');
    testContainer.registerSingleton(serviceToken, () => new TestService());
    
    // 验证注册状态
    expect(testContainer.isRegistered(serviceToken)).toBe(true);
    expect(testContainer.isRegistered(Symbol.for('UnknownService'))).toBe(false);
  });
  
  test('应该能够使用装饰器注入依赖', () => {
    // 注册依赖
    const dependencyToken = Symbol.for('TestDependency');
    testContainer.registerSingleton(dependencyToken, () => new TestDependency());
    
    // 创建使用装饰器的服务实例
    const decoratedService = new DecoratedService(testContainer.resolve(dependencyToken));
    
    // 验证依赖注入
    expect(decoratedService.getDependencyName()).toBe('test-dependency');
  });
});

describe('全局容器和装饰器', () => {
  // 在测试前备份原始TYPES
  const originalTypes = { ...TYPES };
  
  beforeAll(() => {
    // 添加测试类型
    (TYPES as any).TestDependency = Symbol.for('TestDependency');
    (TYPES as any).DecoratedServiceWithToken = Symbol.for('DecoratedServiceWithToken');
  });
  
  afterAll(() => {
    // 恢复原始TYPES
    Object.keys(TYPES).forEach(key => {
      if (!originalTypes.hasOwnProperty(key)) {
        delete (TYPES as any)[key];
      }
    });
    
    // 清理容器
    container.dispose();
  });
  
  test('应该能够使用全局容器注册和解析服务', () => {
    // 注册服务到全局容器
    container.registerSingleton(TYPES.TestDependency, () => new TestDependency());
    
    // 解析服务
    const dependency = container.resolve<ITestDependency>(TYPES.TestDependency);
    
    // 验证服务实例
    expect(dependency).toBeDefined();
    expect(dependency.getName()).toBe('test-dependency');
  });
  
  test('应该能够使用injectable装饰器自动注册服务', () => {
    // 使用装饰器自动注册的服务
    @injectable(TYPES.DecoratedServiceWithToken)
    class DecoratedServiceWithToken {
      constructor(
        @inject(TYPES.TestDependency) private dependency: ITestDependency
      ) {}
      
      getDependencyName(): string {
        return this.dependency.getName();
      }
    }
    
    // 解析服务
    const service = container.resolve<DecoratedServiceWithToken>(TYPES.DecoratedServiceWithToken);
    
    // 验证服务实例
    expect(service).toBeDefined();
    expect(service.getDependencyName()).toBe('test-dependency');
  });
});
