#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FastGPT智能体对话API路由

提供FastGPT智能体对话的RESTful接口和WebSocket支持。
符合AG-UI协议标准，支持流式对话。
"""

import asyncio
import json
from typing import Dict, List, Optional, Any
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.services.fastgpt_agent_service import (
    FastGPTAgentService, ChatRequest, ChatResponse, MessageType, AgentStatus
)
from app.core.auth import get_current_user, get_current_admin_user
from app.core.database import get_db
from app.utils.logger import get_logger

logger = get_logger()
router = APIRouter(prefix="/fastgpt", tags=["FastGPT智能体对话"])

# 全局服务实例
fastgpt_service = FastGPTAgentService()


# 请求模型
class CreateAgentRequest(BaseModel):
    """创建智能体请求"""
    name: str = Field(..., description="智能体名称")
    description: str = Field("", description="智能体描述")
    fastgpt_app_id: str = Field(..., description="FastGPT应用ID")
    fastgpt_api_key: str = Field(..., description="FastGPT API密钥")
    fastgpt_base_url: str = Field("https://api.fastgpt.in", description="FastGPT API基础URL")
    avatar: Optional[str] = Field(None, description="智能体头像URL")
    welcome_message: Optional[str] = Field(None, description="欢迎消息")
    system_prompt: Optional[str] = Field(None, description="系统提示词")
    temperature: float = Field(0.7, ge=0.0, le=2.0, description="温度参数")
    max_tokens: int = Field(2000, ge=1, le=8000, description="最大令牌数")
    global_variables: Dict[str, Any] = Field(default_factory=dict, description="全局变量")


class UpdateAgentRequest(BaseModel):
    """更新智能体请求"""
    name: Optional[str] = Field(None, description="智能体名称")
    description: Optional[str] = Field(None, description="智能体描述")
    fastgpt_app_id: Optional[str] = Field(None, description="FastGPT应用ID")
    fastgpt_api_key: Optional[str] = Field(None, description="FastGPT API密钥")
    fastgpt_base_url: Optional[str] = Field(None, description="FastGPT API基础URL")
    avatar: Optional[str] = Field(None, description="智能体头像URL")
    welcome_message: Optional[str] = Field(None, description="欢迎消息")
    system_prompt: Optional[str] = Field(None, description="系统提示词")
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0, description="温度参数")
    max_tokens: Optional[int] = Field(None, ge=1, le=8000, description="最大令牌数")
    global_variables: Optional[Dict[str, Any]] = Field(None, description="全局变量")
    status: Optional[str] = Field(None, description="智能体状态")


class ChatMessageRequest(BaseModel):
    """聊天消息请求"""
    message: str = Field(..., description="用户消息")
    conversation_id: Optional[str] = Field(None, description="对话ID")
    message_type: MessageType = Field(MessageType.TEXT, description="消息类型")
    metadata: Optional[Dict[str, Any]] = Field(None, description="消息元数据")
    stream: bool = Field(True, description="是否流式响应")


class WebSocketMessage(BaseModel):
    """WebSocket消息"""
    type: str = Field(..., description="消息类型")
    data: Dict[str, Any] = Field(..., description="消息数据")


# 智能体管理API（管理员权限）
@router.post("/agents", summary="创建智能体")
async def create_agent(
    request: CreateAgentRequest,
    current_user = Depends(get_current_admin_user)
):
    """创建新的智能体配置"""
    try:
        async with fastgpt_service as service:
            result = await service.create_agent(
                agent_data=request.dict(),
                context=current_user
            )
            
            if result.success:
                return {
                    "success": True,
                    "data": result.data,
                    "message": "智能体创建成功"
                }
            else:
                raise HTTPException(status_code=400, detail=result.error)
                
    except Exception as e:
        logger.error(f"创建智能体API错误: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/agents/{agent_id}", summary="更新智能体")
async def update_agent(
    agent_id: str,
    request: UpdateAgentRequest,
    current_user = Depends(get_current_admin_user)
):
    """更新智能体配置"""
    try:
        async with fastgpt_service as service:
            # 过滤None值
            update_data = {k: v for k, v in request.dict().items() if v is not None}
            
            result = await service.update_agent(
                agent_id=agent_id,
                agent_data=update_data,
                context=current_user
            )
            
            if result.success:
                return {
                    "success": True,
                    "data": result.data,
                    "message": "智能体更新成功"
                }
            else:
                raise HTTPException(status_code=400, detail=result.error)
                
    except Exception as e:
        logger.error(f"更新智能体API错误: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/agents/{agent_id}", summary="删除智能体")
async def delete_agent(
    agent_id: str,
    current_user = Depends(get_current_admin_user)
):
    """删除智能体"""
    try:
        async with fastgpt_service as service:
            result = await service.delete_agent(
                agent_id=agent_id,
                context=current_user
            )
            
            if result.success:
                return {
                    "success": True,
                    "data": result.data,
                    "message": "智能体删除成功"
                }
            else:
                raise HTTPException(status_code=400, detail=result.error)
                
    except Exception as e:
        logger.error(f"删除智能体API错误: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agents", summary="获取智能体列表")
async def list_agents(
    current_user = Depends(get_current_user)
):
    """获取所有智能体列表"""
    try:
        async with fastgpt_service as service:
            result = await service.list_agents(context=current_user)
            
            if result.success:
                return {
                    "success": True,
                    "data": result.data,
                    "message": "获取智能体列表成功"
                }
            else:
                raise HTTPException(status_code=400, detail=result.error)
                
    except Exception as e:
        logger.error(f"获取智能体列表API错误: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agents/{agent_id}", summary="获取智能体详情")
async def get_agent(
    agent_id: str,
    current_user = Depends(get_current_user)
):
    """获取智能体详细信息"""
    try:
        async with fastgpt_service as service:
            result = await service.get_agent(
                agent_id=agent_id,
                context=current_user
            )
            
            if result.success:
                return {
                    "success": True,
                    "data": result.data,
                    "message": "获取智能体详情成功"
                }
            else:
                raise HTTPException(status_code=404, detail=result.error)
                
    except Exception as e:
        logger.error(f"获取智能体详情API错误: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# 对话API（用户权限）
@router.post("/agents/{agent_id}/chat", summary="发送聊天消息")
async def chat_with_agent(
    agent_id: str,
    request: ChatMessageRequest,
    current_user = Depends(get_current_user)
):
    """与智能体进行对话"""
    try:
        chat_request = ChatRequest(
            agent_id=agent_id,
            user_id=current_user.user_id,
            message=request.message,
            conversation_id=request.conversation_id,
            message_type=request.message_type,
            metadata=request.metadata,
            stream=request.stream
        )
        
        if request.stream:
            # 流式响应
            async def generate_stream():
                async with fastgpt_service as service:
                    async for response in service.chat_stream(chat_request):
                        # 转换为SSE格式
                        data = {
                            "conversation_id": response.conversation_id,
                            "message_id": response.message_id,
                            "content": response.content,
                            "message_type": response.message_type.value,
                            "metadata": response.metadata,
                            "timestamp": response.timestamp.isoformat(),
                            "is_final": response.is_final
                        }
                        yield f"data: {json.dumps(data)}\n\n"
                        
                        if response.is_final:
                            yield "data: [DONE]\n\n"
                            break
            
            return StreamingResponse(
                generate_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        else:
            # 非流式响应
            responses = []
            async with fastgpt_service as service:
                async for response in service.chat_stream(chat_request):
                    responses.append(response)
                    if response.is_final:
                        break
            
            if responses:
                final_response = responses[-1]
                full_content = "".join([r.content for r in responses])
                
                return {
                    "success": True,
                    "data": {
                        "conversation_id": final_response.conversation_id,
                        "message_id": final_response.message_id,
                        "content": full_content,
                        "message_type": final_response.message_type.value,
                        "metadata": final_response.metadata,
                        "timestamp": final_response.timestamp.isoformat()
                    },
                    "message": "对话成功"
                }
            else:
                raise HTTPException(status_code=500, detail="对话失败")
                
    except Exception as e:
        logger.error(f"聊天API错误: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations", summary="获取对话列表")
async def get_conversations(
    agent_id: Optional[str] = Query(None, description="智能体ID过滤"),
    current_user = Depends(get_current_user)
):
    """获取用户的对话列表"""
    try:
        async with fastgpt_service as service:
            result = await service.get_conversation_list(
                user_id=current_user.user_id,
                agent_id=agent_id,
                context=current_user
            )
            
            if result.success:
                return {
                    "success": True,
                    "data": result.data,
                    "message": "获取对话列表成功"
                }
            else:
                raise HTTPException(status_code=400, detail=result.error)
                
    except Exception as e:
        logger.error(f"获取对话列表API错误: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/conversations/{conversation_id}", summary="删除对话")
async def delete_conversation(
    conversation_id: str,
    current_user = Depends(get_current_user)
):
    """删除指定对话"""
    try:
        async with fastgpt_service as service:
            result = await service.delete_conversation(
                conversation_id=conversation_id,
                user_id=current_user.user_id,
                context=current_user
            )
            
            if result.success:
                return {
                    "success": True,
                    "data": result.data,
                    "message": "删除对话成功"
                }
            else:
                raise HTTPException(status_code=400, detail=result.error)
                
    except Exception as e:
        logger.error(f"删除对话API错误: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# WebSocket连接管理
class ConnectionManager:
    """WebSocket连接管理器"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_connections: Dict[str, List[str]] = {}
    
    async def connect(self, websocket: WebSocket, connection_id: str, user_id: str):
        """建立连接"""
        await websocket.accept()
        self.active_connections[connection_id] = websocket
        
        if user_id not in self.user_connections:
            self.user_connections[user_id] = []
        self.user_connections[user_id].append(connection_id)
        
        logger.info(f"WebSocket连接建立: {connection_id} (用户: {user_id})")
    
    def disconnect(self, connection_id: str, user_id: str):
        """断开连接"""
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
        
        if user_id in self.user_connections:
            self.user_connections[user_id] = [
                cid for cid in self.user_connections[user_id] if cid != connection_id
            ]
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        
        logger.info(f"WebSocket连接断开: {connection_id} (用户: {user_id})")
    
    async def send_personal_message(self, message: dict, connection_id: str):
        """发送个人消息"""
        if connection_id in self.active_connections:
            websocket = self.active_connections[connection_id]
            try:
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"发送WebSocket消息失败: {e}")
                # 连接可能已断开，清理连接
                if connection_id in self.active_connections:
                    del self.active_connections[connection_id]


manager = ConnectionManager()


@router.websocket("/ws/{agent_id}")
async def websocket_chat(
    websocket: WebSocket,
    agent_id: str,
    token: str = Query(..., description="认证令牌")
):
    """WebSocket聊天连接"""
    connection_id = f"ws_{datetime.now().timestamp()}_{agent_id}"
    user_id = None
    
    try:
        # TODO: 验证token并获取用户信息
        # current_user = await verify_websocket_token(token)
        # user_id = current_user.user_id
        user_id = "test_user"  # 临时用户ID
        
        await manager.connect(websocket, connection_id, user_id)
        
        # 发送连接成功消息
        await manager.send_personal_message({
            "type": "connection",
            "data": {
                "status": "connected",
                "connection_id": connection_id,
                "agent_id": agent_id
            }
        }, connection_id)
        
        while True:
            # 接收客户端消息
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data.get("type") == "chat":
                # 处理聊天消息
                chat_data = message_data.get("data", {})
                
                chat_request = ChatRequest(
                    agent_id=agent_id,
                    user_id=user_id,
                    message=chat_data.get("message", ""),
                    conversation_id=chat_data.get("conversation_id"),
                    message_type=MessageType(chat_data.get("message_type", "text")),
                    metadata=chat_data.get("metadata"),
                    stream=True
                )
                
                # 流式响应
                async with fastgpt_service as service:
                    async for response in service.chat_stream(chat_request):
                        await manager.send_personal_message({
                            "type": "chat_response",
                            "data": {
                                "conversation_id": response.conversation_id,
                                "message_id": response.message_id,
                                "content": response.content,
                                "message_type": response.message_type.value,
                                "metadata": response.metadata,
                                "timestamp": response.timestamp.isoformat(),
                                "is_final": response.is_final
                            }
                        }, connection_id)
                        
                        if response.is_final:
                            break
            
            elif message_data.get("type") == "ping":
                # 心跳检测
                await manager.send_personal_message({
                    "type": "pong",
                    "data": {"timestamp": datetime.now().isoformat()}
                }, connection_id)
    
    except WebSocketDisconnect:
        manager.disconnect(connection_id, user_id or "unknown")
    except Exception as e:
        logger.error(f"WebSocket错误: {e}")
        manager.disconnect(connection_id, user_id or "unknown")
        try:
            await websocket.close(code=1000)
        except:
            pass


# 健康检查
@router.get("/health", summary="健康检查")
async def health_check():
    """FastGPT服务健康检查"""
    return {
        "status": "healthy",
        "service": "FastGPT Agent Service",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }