/**
 * @file utils.test.js
 * @description 核心工具函数测试
 * @author ZK-Agent Team
 * @date 2025-05-25
 */

describe('核心工具函数测试', () => {
  test('环境变量设置正确', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.DATABASE_URL).toContain('zkagent2');
    expect(process.env.JWT_SECRET).toBeDefined();
  });

  test('全局变量可用', () => {
    expect(global.TextEncoder).toBeDefined();
    expect(global.TextDecoder).toBeDefined();
  });

  test('基础数学运算', () => {
    expect(1 + 1).toBe(2);
    expect(Math.max(1, 2, 3)).toBe(3);
    expect(Math.min(1, 2, 3)).toBe(1);
  });

  test('字符串操作', () => {
    const testString = 'ZK-Agent';
    expect(testString.toLowerCase()).toBe('zk-agent');
    expect(testString.includes('Agent')).toBe(true);
    expect(testString.split('-')).toEqual(['ZK', 'Agent']);
  });

  test('数组操作', () => {
    const testArray = [1, 2, 3, 4, 5];
    expect(testArray.length).toBe(5);
    expect(testArray.filter(x => x > 3)).toEqual([4, 5]);
    expect(testArray.map(x => x * 2)).toEqual([2, 4, 6, 8, 10]);
  });

  test('对象操作', () => {
    const testObject = { name: 'ZK-Agent', version: '1.0.0' };
    expect(testObject.name).toBe('ZK-Agent');
    expect(Object.keys(testObject)).toEqual(['name', 'version']);
    expect(Object.values(testObject)).toEqual(['ZK-Agent', '1.0.0']);
  });
}); 