#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FastGPT智能体对话服务

独立的智能体对话模块，集成FastGPT API接口。
管理员可以配置各个智能体，系统只作转发，不存储对话数据
（除了智能体的基础信息和全局变量信息）。

核心功能：
- FastGPT API集成
- 智能体配置管理
- 流式对话转发
- 全局变量管理
- 符合AG-UI协议标准
"""

import asyncio
import json
import uuid
from typing import Dict, List, Optional, Any, AsyncGenerator
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum

import aiohttp
from fastapi import HTTPException
from pydantic import BaseModel, Field

from app.services.base import (
    BaseService, ServiceContext, ServiceResult, ServiceError,
    BusinessError, ValidationError, ResourceError, service_method
)
from app.core.config import get_settings
from app.core.database import get_db
from app.utils.logger import get_logger

logger = get_logger()
settings = get_settings()


class AgentStatus(Enum):
    """智能体状态"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"
    ERROR = "error"


class MessageType(Enum):
    """消息类型"""
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"
    AUDIO = "audio"
    VIDEO = "video"


@dataclass
class AgentConfig:
    """智能体配置"""
    id: str
    name: str
    description: str
    fastgpt_app_id: str
    fastgpt_api_key: str
    fastgpt_base_url: str = "https://api.fastgpt.in"
    avatar: Optional[str] = None
    welcome_message: Optional[str] = None
    system_prompt: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 2000
    status: AgentStatus = AgentStatus.ACTIVE
    global_variables: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


@dataclass
class ChatMessage:
    """聊天消息"""
    id: str
    conversation_id: str
    agent_id: str
    user_id: str
    message_type: MessageType
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)
    is_user: bool = True


@dataclass
class ChatSession:
    """聊天会话（仅基础信息）"""
    id: str
    agent_id: str
    user_id: str
    title: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    last_message_at: Optional[datetime] = None
    message_count: int = 0
    is_active: bool = True


class FastGPTRequest(BaseModel):
    """FastGPT API请求模型"""
    chatId: Optional[str] = None
    stream: bool = True
    detail: bool = False
    messages: List[Dict[str, Any]]
    variables: Optional[Dict[str, Any]] = None


class FastGPTResponse(BaseModel):
    """FastGPT API响应模型"""
    id: str
    object: str
    created: int
    model: str
    choices: List[Dict[str, Any]]
    usage: Optional[Dict[str, Any]] = None


class ChatRequest(BaseModel):
    """聊天请求模型"""
    agent_id: str
    user_id: str
    message: str
    conversation_id: Optional[str] = None
    message_type: MessageType = MessageType.TEXT
    metadata: Optional[Dict[str, Any]] = None
    stream: bool = True


class ChatResponse(BaseModel):
    """聊天响应模型"""
    conversation_id: str
    message_id: str
    agent_id: str
    content: str
    message_type: MessageType
    metadata: Optional[Dict[str, Any]] = None
    timestamp: datetime
    is_final: bool = True


class FastGPTAgentService(BaseService):
    """FastGPT智能体对话服务"""
    
    def __init__(self):
        super().__init__()
        self.agents: Dict[str, AgentConfig] = {}
        self.sessions: Dict[str, ChatSession] = {}
        self.http_session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        """异步上下文管理器入口"""
        self.http_session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30)
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """异步上下文管理器出口"""
        if self.http_session:
            await self.http_session.close()
    
    @service_method
    async def create_agent(self, agent_data: Dict[str, Any], context: ServiceContext) -> ServiceResult:
        """创建智能体配置"""
        try:
            agent_id = str(uuid.uuid4())
            
            # 验证必需字段
            required_fields = ['name', 'fastgpt_app_id', 'fastgpt_api_key']
            for field in required_fields:
                if not agent_data.get(field):
                    return ServiceResult.error(f"缺少必需字段: {field}")
            
            # 验证FastGPT连接
            test_result = await self._test_fastgpt_connection(
                agent_data['fastgpt_app_id'],
                agent_data['fastgpt_api_key'],
                agent_data.get('fastgpt_base_url', 'https://api.fastgpt.in')
            )
            
            if not test_result['success']:
                return ServiceResult.error(f"FastGPT连接测试失败: {test_result['error']}")
            
            agent = AgentConfig(
                id=agent_id,
                name=agent_data['name'],
                description=agent_data.get('description', ''),
                fastgpt_app_id=agent_data['fastgpt_app_id'],
                fastgpt_api_key=agent_data['fastgpt_api_key'],
                fastgpt_base_url=agent_data.get('fastgpt_base_url', 'https://api.fastgpt.in'),
                avatar=agent_data.get('avatar'),
                welcome_message=agent_data.get('welcome_message'),
                system_prompt=agent_data.get('system_prompt'),
                temperature=agent_data.get('temperature', 0.7),
                max_tokens=agent_data.get('max_tokens', 2000),
                global_variables=agent_data.get('global_variables', {}),
                created_by=context.user_id
            )
            
            self.agents[agent_id] = agent
            
            # 保存到数据库（仅基础信息）
            await self._save_agent_to_db(agent)
            
            logger.info(f"创建智能体成功: {agent_id}")
            return ServiceResult.success({
                "agent_id": agent_id,
                "name": agent.name,
                "status": agent.status.value
            })
            
        except Exception as e:
            logger.error(f"创建智能体失败: {e}")
            return ServiceResult.error(f"创建智能体失败: {str(e)}")
    
    @service_method
    async def update_agent(self, agent_id: str, agent_data: Dict[str, Any], context: ServiceContext) -> ServiceResult:
        """更新智能体配置"""
        try:
            if agent_id not in self.agents:
                return ServiceResult.error("智能体不存在")
            
            agent = self.agents[agent_id]
            
            # 更新字段
            updatable_fields = [
                'name', 'description', 'avatar', 'welcome_message', 'system_prompt',
                'temperature', 'max_tokens', 'global_variables', 'status'
            ]
            
            for field in updatable_fields:
                if field in agent_data:
                    if field == 'status':
                        agent.status = AgentStatus(agent_data[field])
                    else:
                        setattr(agent, field, agent_data[field])
            
            # 如果更新了FastGPT配置，重新测试连接
            if any(field in agent_data for field in ['fastgpt_app_id', 'fastgpt_api_key', 'fastgpt_base_url']):
                for field in ['fastgpt_app_id', 'fastgpt_api_key', 'fastgpt_base_url']:
                    if field in agent_data:
                        setattr(agent, field, agent_data[field])
                
                test_result = await self._test_fastgpt_connection(
                    agent.fastgpt_app_id,
                    agent.fastgpt_api_key,
                    agent.fastgpt_base_url
                )
                
                if not test_result['success']:
                    return ServiceResult.error(f"FastGPT连接测试失败: {test_result['error']}")
            
            agent.updated_at = datetime.now()
            agent.updated_by = context.user_id
            
            # 更新数据库
            await self._save_agent_to_db(agent)
            
            logger.info(f"更新智能体成功: {agent_id}")
            return ServiceResult.success({
                "agent_id": agent_id,
                "name": agent.name,
                "status": agent.status.value
            })
            
        except Exception as e:
            logger.error(f"更新智能体失败: {e}")
            return ServiceResult.error(f"更新智能体失败: {str(e)}")
    
    @service_method
    async def delete_agent(self, agent_id: str, context: ServiceContext) -> ServiceResult:
        """删除智能体"""
        try:
            if agent_id not in self.agents:
                return ServiceResult.error("智能体不存在")
            
            # 删除相关会话
            sessions_to_delete = [sid for sid, session in self.sessions.items() if session.agent_id == agent_id]
            for session_id in sessions_to_delete:
                del self.sessions[session_id]
            
            # 删除智能体
            del self.agents[agent_id]
            
            # 从数据库删除
            await self._delete_agent_from_db(agent_id)
            
            logger.info(f"删除智能体成功: {agent_id}")
            return ServiceResult.success({"agent_id": agent_id})
            
        except Exception as e:
            logger.error(f"删除智能体失败: {e}")
            return ServiceResult.error(f"删除智能体失败: {str(e)}")
    
    @service_method
    async def list_agents(self, context: ServiceContext) -> ServiceResult:
        """获取智能体列表"""
        try:
            agents_list = [
                {
                    "id": agent.id,
                    "name": agent.name,
                    "description": agent.description,
                    "avatar": agent.avatar,
                    "status": agent.status.value,
                    "created_at": agent.created_at.isoformat(),
                    "updated_at": agent.updated_at.isoformat()
                }
                for agent in self.agents.values()
            ]
            
            return ServiceResult.success({"agents": agents_list})
            
        except Exception as e:
            logger.error(f"获取智能体列表失败: {e}")
            return ServiceResult.error(f"获取智能体列表失败: {str(e)}")
    
    @service_method
    async def get_agent(self, agent_id: str, context: ServiceContext) -> ServiceResult:
        """获取智能体详情"""
        try:
            if agent_id not in self.agents:
                return ServiceResult.error("智能体不存在")
            
            agent = self.agents[agent_id]
            
            return ServiceResult.success({
                "id": agent.id,
                "name": agent.name,
                "description": agent.description,
                "avatar": agent.avatar,
                "welcome_message": agent.welcome_message,
                "status": agent.status.value,
                "global_variables": agent.global_variables,
                "created_at": agent.created_at.isoformat(),
                "updated_at": agent.updated_at.isoformat()
            })
            
        except Exception as e:
            logger.error(f"获取智能体详情失败: {e}")
            return ServiceResult.error(f"获取智能体详情失败: {str(e)}")
    
    async def chat_stream(self, request: ChatRequest) -> AsyncGenerator[ChatResponse, None]:
        """流式聊天对话"""
        try:
            # 验证智能体
            if request.agent_id not in self.agents:
                raise HTTPException(status_code=404, detail="智能体不存在")
            
            agent = self.agents[request.agent_id]
            
            if agent.status != AgentStatus.ACTIVE:
                raise HTTPException(status_code=400, detail="智能体不可用")
            
            # 创建或获取会话
            conversation_id = request.conversation_id or str(uuid.uuid4())
            
            if conversation_id not in self.sessions:
                self.sessions[conversation_id] = ChatSession(
                    id=conversation_id,
                    agent_id=request.agent_id,
                    user_id=request.user_id
                )
            
            session = self.sessions[conversation_id]
            session.last_message_at = datetime.now()
            session.message_count += 1
            
            # 准备FastGPT请求
            fastgpt_request = FastGPTRequest(
                chatId=conversation_id,
                stream=request.stream,
                messages=[
                    {
                        "role": "user",
                        "content": request.message
                    }
                ],
                variables=agent.global_variables
            )
            
            # 调用FastGPT API
            async for chunk in self._call_fastgpt_stream(agent, fastgpt_request):
                if chunk:
                    response = ChatResponse(
                        conversation_id=conversation_id,
                        message_id=str(uuid.uuid4()),
                        agent_id=request.agent_id,
                        content=chunk.get('content', ''),
                        message_type=MessageType.TEXT,
                        metadata=chunk.get('metadata', {}),
                        timestamp=datetime.now(),
                        is_final=chunk.get('is_final', False)
                    )
                    yield response
            
        except Exception as e:
            logger.error(f"流式聊天失败: {e}")
            error_response = ChatResponse(
                conversation_id=request.conversation_id or str(uuid.uuid4()),
                message_id=str(uuid.uuid4()),
                agent_id=request.agent_id,
                content=f"对话失败: {str(e)}",
                message_type=MessageType.TEXT,
                timestamp=datetime.now(),
                is_final=True
            )
            yield error_response
    
    async def _call_fastgpt_stream(self, agent: AgentConfig, request: FastGPTRequest) -> AsyncGenerator[Dict[str, Any], None]:
        """调用FastGPT流式API"""
        if not self.http_session:
            self.http_session = aiohttp.ClientSession()
        
        url = f"{agent.fastgpt_base_url}/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {agent.fastgpt_api_key}",
            "Content-Type": "application/json"
        }
        
        # 添加系统提示
        messages = request.messages.copy()
        if agent.system_prompt:
            messages.insert(0, {
                "role": "system",
                "content": agent.system_prompt
            })
        
        payload = {
            "appId": agent.fastgpt_app_id,
            "chatId": request.chatId,
            "stream": request.stream,
            "detail": request.detail,
            "messages": messages,
            "variables": request.variables or {},
            "temperature": agent.temperature,
            "max_tokens": agent.max_tokens
        }
        
        try:
            async with self.http_session.post(url, headers=headers, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"FastGPT API错误: {response.status} - {error_text}")
                    yield {
                        "content": f"API调用失败: {response.status}",
                        "is_final": True,
                        "error": True
                    }
                    return
                
                if request.stream:
                    # 处理流式响应
                    async for line in response.content:
                        line = line.decode('utf-8').strip()
                        if line.startswith('data: '):
                            data = line[6:]
                            if data == '[DONE]':
                                yield {
                                    "content": "",
                                    "is_final": True
                                }
                                break
                            
                            try:
                                chunk_data = json.loads(data)
                                if 'choices' in chunk_data and chunk_data['choices']:
                                    choice = chunk_data['choices'][0]
                                    if 'delta' in choice and 'content' in choice['delta']:
                                        content = choice['delta']['content']
                                        yield {
                                            "content": content,
                                            "is_final": False,
                                            "metadata": {
                                                "usage": chunk_data.get('usage', {}),
                                                "model": chunk_data.get('model', '')
                                            }
                                        }
                            except json.JSONDecodeError:
                                continue
                else:
                    # 处理非流式响应
                    data = await response.json()
                    if 'choices' in data and data['choices']:
                        choice = data['choices'][0]
                        content = choice.get('message', {}).get('content', '')
                        yield {
                            "content": content,
                            "is_final": True,
                            "metadata": {
                                "usage": data.get('usage', {}),
                                "model": data.get('model', '')
                            }
                        }
        
        except Exception as e:
            logger.error(f"FastGPT API调用异常: {e}")
            yield {
                "content": f"API调用异常: {str(e)}",
                "is_final": True,
                "error": True
            }
    
    async def _test_fastgpt_connection(self, app_id: str, api_key: str, base_url: str) -> Dict[str, Any]:
        """测试FastGPT连接"""
        if not self.http_session:
            self.http_session = aiohttp.ClientSession()
        
        url = f"{base_url}/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "appId": app_id,
            "stream": False,
            "messages": [
                {
                    "role": "user",
                    "content": "测试连接"
                }
            ]
        }
        
        try:
            async with self.http_session.post(url, headers=headers, json=payload, timeout=10) as response:
                if response.status == 200:
                    return {"success": True}
                else:
                    error_text = await response.text()
                    return {
                        "success": False,
                        "error": f"HTTP {response.status}: {error_text}"
                    }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _save_agent_to_db(self, agent: AgentConfig):
        """保存智能体到数据库（仅基础信息）"""
        # TODO: 实现数据库保存逻辑
        # 只保存基础信息，不保存API密钥等敏感信息
        pass
    
    async def _delete_agent_from_db(self, agent_id: str):
        """从数据库删除智能体"""
        # TODO: 实现数据库删除逻辑
        pass
    
    @service_method
    async def get_conversation_list(self, user_id: str, agent_id: Optional[str] = None, context: ServiceContext = None) -> ServiceResult:
        """获取用户的对话列表"""
        try:
            conversations = []
            for session in self.sessions.values():
                if session.user_id == user_id and (not agent_id or session.agent_id == agent_id):
                    agent = self.agents.get(session.agent_id)
                    conversations.append({
                        "id": session.id,
                        "agent_id": session.agent_id,
                        "agent_name": agent.name if agent else "未知智能体",
                        "agent_avatar": agent.avatar if agent else None,
                        "title": session.title or "新对话",
                        "created_at": session.created_at.isoformat(),
                        "last_message_at": session.last_message_at.isoformat() if session.last_message_at else None,
                        "message_count": session.message_count,
                        "is_active": session.is_active
                    })
            
            # 按最后消息时间排序
            conversations.sort(key=lambda x: x['last_message_at'] or x['created_at'], reverse=True)
            
            return ServiceResult.success({"conversations": conversations})
            
        except Exception as e:
            logger.error(f"获取对话列表失败: {e}")
            return ServiceResult.error(f"获取对话列表失败: {str(e)}")
    
    @service_method
    async def delete_conversation(self, conversation_id: str, user_id: str, context: ServiceContext) -> ServiceResult:
        """删除对话"""
        try:
            if conversation_id not in self.sessions:
                return ServiceResult.error("对话不存在")
            
            session = self.sessions[conversation_id]
            if session.user_id != user_id:
                return ServiceResult.error("无权限删除此对话")
            
            del self.sessions[conversation_id]
            
            logger.info(f"删除对话成功: {conversation_id}")
            return ServiceResult.success({"conversation_id": conversation_id})
            
        except Exception as e:
            logger.error(f"删除对话失败: {e}")
            return ServiceResult.error(f"删除对话失败: {str(e)}")