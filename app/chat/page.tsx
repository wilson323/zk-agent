// @ts-nocheck
/**
 * @file 用户端聊天页面
 * @description 用户端智能体对话界面
 * @author ZK-Agent Team
 * @date 2024-12-19
 */

'use client';

import { useState } from 'react';
import { UserLayout } from '@/components/layout/user-layout';
import { AgentCard } from '@/components/chat/agent-card';
import { useAgents } from '@/hooks/use-fastgpt';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { StandardChatInterface } from '@/components/ag-ui/standard-chat-interface';
import { Bot, MessageSquare, Sparkles } from 'lucide-react';
import MascotAnimation from '@/components/common/mascot-animation';

const ChatPage = () => {
  const { applications: agents, isLoading } = useAgents();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  return (
    <UserLayout>
      <div className='h-[calc(100vh-4rem)] flex bg-gradient-to-br from-primary/5 via-white to-primary/10 dark:from-gray-900 dark:via-gray-800 dark:to-primary/20'>
        <div className="absolute inset-0 particles-bg opacity-20"></div>
        {/* 智能体列表侧边栏 */}
        <div className='relative w-80 border-r border-gray-200/50 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex-shrink-0'>
          <div className='p-6 border-b border-gray-200/50 dark:border-gray-800/50'>
            <div className='flex items-center gap-3 mb-2 animate-fade-in'>
              <div className='flex items-center justify-center w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg shadow-lg animate-pulse'>
                <Bot className='h-4 w-4 text-white' />
              </div>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>智能体</h2>
            </div>
            <p className='text-sm text-gray-600 dark:text-gray-400 animate-slide-up'>选择一个智能体开始对话</p>
          </div>
          
          <div className='p-4 space-y-3 overflow-y-auto h-[calc(100%-120px)]'>
            {isLoading ? (
              <>
                <Skeleton className='h-16 w-full rounded-lg' />
                <Skeleton className='h-16 w-full rounded-lg' />
                <Skeleton className='h-16 w-full rounded-lg' />
              </>
            ) : agents && agents.length > 0 ? (
              agents.map(agent => (
                <div
                  key={agent.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg animate-fade-in ${
                    selectedAgent === agent.id
                      ? 'border-primary bg-gradient-to-r from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30 shadow-md'
                      : 'border-gray-200/50 dark:border-gray-700/50 hover:border-primary/50 dark:hover:border-primary/60 bg-white/80 dark:bg-gray-800/80'
                  }`}
                  onClick={() => setSelectedAgent(agent.id)}
                >
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center shadow-md animate-pulse'>
                      <Bot className='h-5 w-5 text-white' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <h3 className='font-medium text-gray-900 dark:text-white truncate'>
                        {agent.name || `智能体 ${agent.id}`}
                      </h3>
                      <p className='text-xs text-gray-500 dark:text-gray-400 truncate'>
                        {agent.intro || '智能对话助手'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className='text-center py-8'>
                <Bot className='h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3' />
                <p className='text-sm text-gray-500 dark:text-gray-400'>暂无可用智能体</p>
              </div>
            )}
          </div>
        </div>

        {/* 聊天界面 */}
        <div className='relative flex-1 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md'>
          {selectedAgent ? (
            <StandardChatInterface agentId={selectedAgent} />
          ) : (
            <div className='h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 dark:from-gray-900 dark:to-gray-800'>
              <div className='text-center animate-fade-in'>
                <div className='mb-6'>
                  <div className='w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4 glow-primary animate-pulse'>
                    <MessageSquare className='h-10 w-10 text-white' />
                  </div>
                </div>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-2 animate-slide-up'>
                  选择智能体开始对话
                </h3>
                <p className='text-gray-600 dark:text-gray-400 mb-4 animate-slide-up' style={{animationDelay: '0.1s'}}>
                  从左侧列表中选择一个智能体，开始您的AI对话之旅
                </p>
                <div className='flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 animate-slide-up' style={{animationDelay: '0.2s'}}>
                  <Sparkles className='h-4 w-4 animate-pulse text-primary' />
                  <span>AI 助手随时为您服务</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
};

export default ChatPage;
