import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Send, 
  Bot, 
  User, 
  Settings, 
  Trash2, 
  Plus, 
  MessageSquare,
  Loader2,
  Wifi,
  WifiOff,
  Copy,
  Download,
  Upload
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

// 类型定义
interface Agent {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  status: 'active' | 'inactive' | 'error';
  welcome_message?: string;
  fastgpt_app_id: string;
  global_variables: Record<string, any>;
}

interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant' | 'system';
  timestamp: Date;
  conversation_id: string;
  metadata?: Record<string, any>;
}

interface Conversation {
  id: string;
  agent_id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  message_count: number;
}

interface WebSocketMessage {
  type: string;
  data: any;
}

// WebSocket连接状态
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// FastGPT聊天接口组件
const FastGPTChatInterface: React.FC = () => {
  // 状态管理
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [streamEnabled, setStreamEnabled] = useState(true);
  
  // WebSocket相关
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 加载智能体列表
  const loadAgents = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/fastgpt/agents', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setAgents(result.data || []);
      } else {
        throw new Error('加载智能体列表失败');
      }
    } catch (error) {
      console.error('加载智能体列表错误:', error);
      toast({
        title: '错误',
        description: '加载智能体列表失败',
        variant: 'destructive'
      });
    }
  }, [toast]);

  // 加载对话列表
  const loadConversations = useCallback(async (agentId?: string) => {
    try {
      const url = agentId 
        ? `/api/v1/fastgpt/conversations?agent_id=${agentId}`
        : '/api/v1/fastgpt/conversations';
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setConversations(result.data || []);
      }
    } catch (error) {
      console.error('加载对话列表错误:', error);
    }
  }, []);

  // 建立WebSocket连接
  const connectWebSocket = useCallback((agentId: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    setConnectionStatus('connecting');
    const token = localStorage.getItem('token');
    const wsUrl = `ws://localhost:8000/api/v1/fastgpt/ws/${agentId}?token=${token}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
      toast({
        title: '连接成功',
        description: `已连接到智能体: ${selectedAgent?.name}`,
      });
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        console.error('解析WebSocket消息错误:', error);
      }
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      setIsLoading(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket错误:', error);
      setConnectionStatus('error');
      setIsLoading(false);
      toast({
        title: '连接错误',
        description: 'WebSocket连接失败',
        variant: 'destructive'
      });
    };
  }, [selectedAgent, toast]);

  // 处理WebSocket消息
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'connection':
        console.log('WebSocket连接确认:', message.data);
        break;
        
      case 'chat_response':
        const responseData = message.data;
        
        if (responseData.is_final) {
          setIsLoading(false);
        }
        
        // 更新或添加消息
        setMessages(prev => {
          const existingIndex = prev.findIndex(m => m.id === responseData.message_id);
          const newMessage: Message = {
            id: responseData.message_id,
            content: responseData.content,
            type: 'assistant',
            timestamp: new Date(responseData.timestamp),
            conversation_id: responseData.conversation_id,
            metadata: responseData.metadata
          };
          
          if (existingIndex >= 0) {
            // 更新现有消息（流式响应）
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              content: updated[existingIndex].content + responseData.content
            };
            return updated;
          } else {
            // 添加新消息
            return [...prev, newMessage];
          }
        });
        
        // 更新对话ID
        if (responseData.conversation_id && !currentConversation) {
          setCurrentConversation({
            id: responseData.conversation_id,
            agent_id: selectedAgent?.id || '',
            title: '新对话',
            created_at: new Date(),
            updated_at: new Date(),
            message_count: 1
          });
        }
        break;
        
      case 'pong':
        // 心跳响应
        break;
        
      default:
        console.log('未知WebSocket消息类型:', message.type);
    }
  }, [currentConversation, selectedAgent]);

  // 发送消息
  const sendMessage = useCallback(async () => {
    if (!inputMessage.trim() || !selectedAgent || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      content: inputMessage,
      type: 'user',
      timestamp: new Date(),
      conversation_id: currentConversation?.id || '',
      metadata: {}
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    if (connectionStatus === 'connected' && wsRef.current) {
      // 通过WebSocket发送
      const wsMessage = {
        type: 'chat',
        data: {
          message: inputMessage,
          conversation_id: currentConversation?.id,
          message_type: 'text',
          metadata: {}
        }
      };
      
      wsRef.current.send(JSON.stringify(wsMessage));
    } else {
      // 通过HTTP API发送
      try {
        const response = await fetch(`/api/v1/fastgpt/agents/${selectedAgent.id}/chat`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: inputMessage,
            conversation_id: currentConversation?.id,
            message_type: 'text',
            stream: streamEnabled
          })
        });

        if (streamEnabled && response.body) {
          // 处理流式响应
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let assistantMessageId = `assistant_${Date.now()}`;
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  setIsLoading(false);
                  break;
                }
                
                try {
                  const parsed = JSON.parse(data);
                  
                  setMessages(prev => {
                    const existingIndex = prev.findIndex(m => m.id === assistantMessageId);
                    const newMessage: Message = {
                      id: assistantMessageId,
                      content: parsed.content,
                      type: 'assistant',
                      timestamp: new Date(parsed.timestamp),
                      conversation_id: parsed.conversation_id,
                      metadata: parsed.metadata
                    };
                    
                    if (existingIndex >= 0) {
                      const updated = [...prev];
                      updated[existingIndex] = {
                        ...updated[existingIndex],
                        content: updated[existingIndex].content + parsed.content
                      };
                      return updated;
                    } else {
                      return [...prev, newMessage];
                    }
                  });
                } catch (e) {
                  console.error('解析流式响应错误:', e);
                }
              }
            }
          }
        } else {
          // 处理非流式响应
          const result = await response.json();
          if (result.success) {
            const assistantMessage: Message = {
              id: result.data.message_id,
              content: result.data.content,
              type: 'assistant',
              timestamp: new Date(result.data.timestamp),
              conversation_id: result.data.conversation_id,
              metadata: result.data.metadata
            };
            
            setMessages(prev => [...prev, assistantMessage]);
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('发送消息错误:', error);
        setIsLoading(false);
        toast({
          title: '发送失败',
          description: '消息发送失败，请重试',
          variant: 'destructive'
        });
      }
    }
  }, [inputMessage, selectedAgent, currentConversation, isLoading, connectionStatus, streamEnabled, toast]);

  // 选择智能体
  const selectAgent = useCallback((agent: Agent) => {
    setSelectedAgent(agent);
    setMessages([]);
    setCurrentConversation(null);
    loadConversations(agent.id);
    
    // 建立WebSocket连接
    if (agent.status === 'active') {
      connectWebSocket(agent.id);
    }
  }, [loadConversations, connectWebSocket]);

  // 新建对话
  const startNewConversation = useCallback(() => {
    setMessages([]);
    setCurrentConversation(null);
    
    // 发送欢迎消息
    if (selectedAgent?.welcome_message) {
      const welcomeMessage: Message = {
        id: `welcome_${Date.now()}`,
        content: selectedAgent.welcome_message,
        type: 'assistant',
        timestamp: new Date(),
        conversation_id: '',
        metadata: { type: 'welcome' }
      };
      setMessages([welcomeMessage]);
    }
  }, [selectedAgent]);

  // 删除对话
  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/v1/fastgpt/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        setConversations(prev => prev.filter(c => c.id !== conversationId));
        if (currentConversation?.id === conversationId) {
          startNewConversation();
        }
        toast({
          title: '删除成功',
          description: '对话已删除'
        });
      }
    } catch (error) {
      console.error('删除对话错误:', error);
      toast({
        title: '删除失败',
        description: '删除对话失败',
        variant: 'destructive'
      });
    }
  }, [currentConversation, startNewConversation, toast]);

  // 复制消息
  const copyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: '复制成功',
      description: '消息已复制到剪贴板'
    });
  }, [toast]);

  // 键盘事件处理
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // 组件挂载时加载数据
  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  // 消息变化时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 组件卸载时清理WebSocket
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 左侧边栏 */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* 智能体选择 */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">FastGPT 智能体</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          
          <Select
            value={selectedAgent?.id || ''}
            onValueChange={(value) => {
              const agent = agents.find(a => a.id === value);
              if (agent) selectAgent(agent);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择智能体" />
            </SelectTrigger>
            <SelectContent>
              {agents.map(agent => (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={agent.avatar} />
                      <AvatarFallback>
                        <Bot className="h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                    <span>{agent.name}</span>
                    <Badge 
                      variant={agent.status === 'active' ? 'default' : 'secondary'}
                      className="ml-auto"
                    >
                      {agent.status}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 对话列表 */}
        <div className="flex-1 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">对话历史</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={startNewConversation}
                disabled={!selectedAgent}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {conversations.map(conversation => (
                  <Card 
                    key={conversation.id}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-gray-50",
                      currentConversation?.id === conversation.id && "bg-blue-50 border-blue-200"
                    )}
                    onClick={() => setCurrentConversation(conversation)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {conversation.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {conversation.message_count} 条消息
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conversation.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* 连接状态 */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-2 text-sm">
            {connectionStatus === 'connected' ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-gray-400" />
            )}
            <span className={cn(
              connectionStatus === 'connected' ? 'text-green-600' : 'text-gray-500'
            )}>
              {connectionStatus === 'connected' ? '已连接' : 
               connectionStatus === 'connecting' ? '连接中...' : '未连接'}
            </span>
          </div>
        </div>
      </div>

      {/* 主聊天区域 */}
      <div className="flex-1 flex flex-col">
        {selectedAgent ? (
          <>
            {/* 聊天头部 */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={selectedAgent.avatar} />
                  <AvatarFallback>
                    <Bot className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{selectedAgent.name}</h3>
                  <p className="text-sm text-gray-500">{selectedAgent.description}</p>
                </div>
                <div className="ml-auto">
                  <Badge variant={selectedAgent.status === 'active' ? 'default' : 'secondary'}>
                    {selectedAgent.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* 消息列表 */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.type === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] rounded-lg p-3 relative group",
                        message.type === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white border border-gray-200'
                      )}
                    >
                      <div className="flex items-start space-x-2">
                        {message.type === 'assistant' && (
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={selectedAgent.avatar} />
                            <AvatarFallback>
                              <Bot className="h-3 w-3" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className="flex-1">
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <p className={cn(
                            "text-xs mt-1",
                            message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                          )}>
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                        {message.type === 'user' && (
                          <User className="h-6 w-6 text-blue-100" />
                        )}
                      </div>
                      
                      {/* 消息操作按钮 */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyMessage(message.content)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={selectedAgent.avatar} />
                          <AvatarFallback>
                            <Bot className="h-3 w-3" />
                          </AvatarFallback>
                        </Avatar>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-gray-500">正在思考...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* 输入区域 */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex space-x-2">
                <Textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="输入消息..."
                  className="flex-1 min-h-[40px] max-h-[120px] resize-none"
                  disabled={!selectedAgent || selectedAgent.status !== 'active'}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading || !selectedAgent || selectedAgent.status !== 'active'}
                  className="self-end"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">选择智能体开始对话</h3>
              <p className="text-gray-500">从左侧选择一个智能体来开始对话</p>
            </div>
          </div>
        )}
      </div>

      {/* 设置对话框 */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>聊天设置</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="stream-mode">流式响应</Label>
              <Switch
                id="stream-mode"
                checked={streamEnabled}
                onCheckedChange={setStreamEnabled}
              />
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label>连接状态</Label>
              <div className="flex items-center space-x-2">
                {connectionStatus === 'connected' ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-gray-400" />
                )}
                <span className={cn(
                  "text-sm",
                  connectionStatus === 'connected' ? 'text-green-600' : 'text-gray-500'
                )}>
                  {connectionStatus === 'connected' ? 'WebSocket已连接' : 
                   connectionStatus === 'connecting' ? 'WebSocket连接中...' : 'WebSocket未连接'}
                </span>
              </div>
            </div>
            
            {selectedAgent && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>当前智能体</Label>
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedAgent.avatar} />
                      <AvatarFallback>
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{selectedAgent.name}</p>
                      <p className="text-xs text-gray-500">{selectedAgent.description}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FastGPTChatInterface;