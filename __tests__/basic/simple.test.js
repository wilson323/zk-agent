/**
 * @file __tests__/basic/simple.test.js
 * @description 简单的测试文件，用于验证Jest配置是否正常工作
 * @author 修复团队
 * @lastUpdate 2024-12-19
 */

describe('简单测试套件', () => {
  test('基础数学运算', () => {
    expect(1 + 1).toBe(2);
    expect(2 * 3).toBe(6);
    expect(10 / 2).toBe(5);
  });

  test('字符串操作', () => {
    expect('hello'.toUpperCase()).toBe('HELLO');
    expect('world'.length).toBe(5);
    expect('test'.includes('es')).toBe(true);
  });

  test('数组操作', () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
    expect(arr.includes(2)).toBe(true);
    expect(arr.map(x => x * 2)).toEqual([2, 4, 6]);
  });

  test('对象操作', () => {
    const obj = { name: 'test', value: 42 };
    expect(obj.name).toBe('test');
    expect(obj.value).toBe(42);
    expect(Object.keys(obj)).toEqual(['name', 'value']);
  });

  test('异步操作', async () => {
    const promise = Promise.resolve('success');
    const result = await promise;
    expect(result).toBe('success');
  });

  test('Mock函数', () => {
    const mockFn = jest.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test('环境变量', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  test('全局工具函数', () => {
    expect(global.testUtils).toBeDefined();
    expect(typeof global.testUtils.createMockUser).toBe('function');
    
    const mockUser = global.testUtils.createMockUser();
    expect(mockUser.id).toBe('test-user-id');
    expect(mockUser.email).toBe('test@example.com');
  });

  test('性能工具函数', () => {
    expect(global.performanceUtils).toBeDefined();
    expect(typeof global.performanceUtils.measureTime).toBe('function');
  });

  test('TextEncoder/TextDecoder', () => {
    expect(global.TextEncoder).toBeDefined();
    expect(global.TextDecoder).toBeDefined();
    
    const encoder = new global.TextEncoder();
    const decoder = new global.TextDecoder();
    
    const text = 'Hello, World!';
    const encoded = encoder.encode(text);
    const decoded = decoder.decode(encoded);
    
    expect(decoded).toBe(text);
  });
});