/**
 * @file Basic Test
 * @description 基础测试文件，验证测试环境配置
 */

// 基础测试 - 验证测试环境
describe('Test Environment', () => {
  test('should be able to run tests', () => {
    expect(true).toBe(true);
  });
  
  test('should have access to basic JavaScript features', () => {
    expect(Array.isArray([1, 2, 3])).toBe(true);
    expect(typeof 'hello').toBe('string');
    expect(Math.max(1, 2, 3)).toBe(3);
  });
  
  test('should have access to Node.js globals', () => {
    expect(process).toBeDefined();
    expect(process.env.NODE_ENV).toBe('test');
  });
});

// 基础功能测试
describe('Basic Functionality', () => {
  test('should handle arrays correctly', () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
    expect(arr.includes(2)).toBe(true);
    expect(arr.map(x => x * 2)).toEqual([2, 4, 6]);
  });
  
  test('should handle objects correctly', () => {
    const obj = { name: 'test', value: 42 };
    expect(obj.name).toBe('test');
    expect(obj.value).toBe(42);
    expect(Object.keys(obj)).toEqual(['name', 'value']);
  });
  
  test('should handle promises correctly', async () => {
    const promise = Promise.resolve('success');
    const result = await promise;
    expect(result).toBe('success');
  });
});
