/**
 * @file 示例页面
 * @description 展示如何在页面组件中使用依赖注入
 * @author ZK-Agent Team
 * @date 2024-12-20
 */

'use client';

import { useState, useEffect } from 'react';
import { TYPES } from '@/lib/di/container';
import { IExampleController } from '@/lib/controllers/example.controller';
import { useDIService, useDIInitialization } from '@/lib/hooks/use-di';

export default function ExamplePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // 使用钩子获取DI初始化状态
  const { isInitialized } = useDIInitialization();
  
  // 使用钩子获取控制器服务
  const { service: exampleController } = useDIService<IExampleController>(TYPES.ExampleController);

  // 当DI系统准备好且控制器可用时，加载数据
  useEffect(() => {
    if (!isInitialized || !exampleController) return;

    const loadData = async () => {
      try {
        setLoading(true);
        // 调用控制器方法获取数据
        const result = await exampleController.getData();
        setData(result);
        setError(null);
      } catch (err) {
        console.error('加载数据失败:', err);
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isInitialized, exampleController]);

  // 创建新数据的处理函数
  const handleCreateData = async () => {
    if (!isInitialized || !exampleController) return;
    
    try {
      setLoading(true);
      await exampleController.createData({
        name: `新数据-${Date.now()}`,
        description: '通过页面组件创建的示例数据'
      });
      
      // 重新加载数据
      const refreshedData = await exampleController.getData();
      setData(refreshedData);
      setError(null);
    } catch (err) {
      console.error('创建数据失败:', err);
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  if (!diReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">依赖注入系统正在初始化...</h1>
          <div className="animate-pulse bg-blue-200 h-2 w-48 rounded-full mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-xl p-6 space-y-6">
        <h1 className="text-3xl font-bold text-center">依赖注入示例页面</h1>
        
        <div className="flex justify-end">
          <button 
            onClick={handleCreateData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '处理中...' : '创建新数据'}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
            <p className="font-bold">错误</p>
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : data ? (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">数据列表</h2>
            {Array.isArray(data) && data.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.map((item: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 bg-white shadow-sm">
                    <h3 className="font-medium text-lg">{item.name}</h3>
                    <p className="text-gray-600">{item.description}</p>
                    <div className="mt-2 text-sm text-gray-500">
                      ID: {item.id}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-4">暂无数据，请点击"创建新数据"按钮</p>
            )}
          </div>
        ) : null}

        <div className="bg-blue-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">关于依赖注入</h2>
          <p className="mb-2">
            本页面展示了如何在客户端组件中使用依赖注入系统。关键点：
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>使用 <code>isDIInitialized()</code> 检查DI系统是否已初始化</li>
            <li>使用 <code>getService()</code> 从容器中获取服务实例</li>
            <li>通过控制器模式封装业务逻辑，保持组件简洁</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
