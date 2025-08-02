# -*- coding: utf-8 -*-
"""
多模态模型API路由
提供统一的多模态模型调用接口
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import io
import base64
from datetime import datetime

from ...core.multimodal_config import (
    MultimodalModelConfig,
    AgentModelConfig,
    ModelType,
    ModelProvider,
    ModelCallResult,
    ModelMetrics,
    multimodal_manager
)
from ...services.multimodal_api_service import multimodal_api_service
from ...core.deps import get_current_user
from ...core.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/multimodal", tags=["多模态模型"])


# ==================== 请求/响应模型 ====================

class TextGenerationRequest(BaseModel):
    """文本生成请求"""
    model_id: str = Field(..., description="模型ID")
    messages: List[Dict[str, str]] = Field(..., description="对话消息")
    temperature: Optional[float] = Field(None, description="温度参数")
    max_tokens: Optional[int] = Field(None, description="最大token数")
    stream: bool = Field(False, description="是否流式输出")


class ImageGenerationRequest(BaseModel):
    """图像生成请求"""
    model_id: str = Field(..., description="模型ID")
    prompt: str = Field(..., description="提示词")
    n: int = Field(1, description="生成图片数量")
    size: str = Field("1024x1024", description="图片尺寸")
    quality: str = Field("standard", description="图片质量")


class ImageUnderstandingRequest(BaseModel):
    """图像理解请求"""
    model_id: str = Field(..., description="模型ID")
    messages: List[Dict[str, Any]] = Field(..., description="包含图像的对话消息")
    max_tokens: Optional[int] = Field(None, description="最大token数")


class TextToSpeechRequest(BaseModel):
    """语音合成请求"""
    model_id: str = Field(..., description="模型ID")
    text: str = Field(..., description="要合成的文本")
    voice: str = Field("alloy", description="语音类型")
    response_format: str = Field("mp3", description="音频格式")


class ModelConfigRequest(BaseModel):
    """模型配置请求"""
    name: str = Field(..., description="模型名称")
    provider: ModelProvider = Field(..., description="模型厂商")
    type: ModelType = Field(..., description="模型类型")
    model_id: str = Field(..., description="厂商模型ID")
    api_key: str = Field(..., description="API密钥")
    base_url: Optional[str] = Field(None, description="API基础URL")
    api_version: Optional[str] = Field(None, description="API版本")
    max_tokens: Optional[int] = Field(None, description="最大token数")
    temperature: Optional[float] = Field(0.7, description="温度参数")
    timeout: int = Field(60, description="请求超时时间")
    custom_headers: Optional[Dict[str, str]] = Field(None, description="自定义请求头")
    custom_params: Optional[Dict[str, Any]] = Field(None, description="自定义参数")


class ModelConfigResponse(BaseModel):
    """模型配置响应"""
    id: str
    name: str
    provider: ModelProvider
    type: ModelType
    model_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    metadata: Optional[Dict[str, Any]] = None


class ModelListResponse(BaseModel):
    """模型列表响应"""
    models: List[ModelConfigResponse]
    total: int


class ModelCallResponse(BaseModel):
    """模型调用响应"""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    usage: Optional[Dict[str, Any]] = None
    latency: Optional[float] = None
    model_id: str
    provider: ModelProvider
    timestamp: datetime


# ==================== 模型调用接口 ====================

@router.post("/text/generate", response_model=ModelCallResponse, summary="文本生成")
async def generate_text(
    request: TextGenerationRequest,
    current_user = Depends(get_current_user)
):
    """文本生成接口"""
    try:
        async with multimodal_api_service as service:
            result = await service.text_generation(
                model_id=request.model_id,
                messages=request.messages,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                stream=request.stream
            )
        
        return ModelCallResponse(
            success=result.success,
            data=result.data,
            error=result.error,
            usage=result.usage,
            latency=result.latency,
            model_id=result.model_id,
            provider=result.provider,
            timestamp=result.timestamp
        )
    
    except Exception as e:
        logger.error(f"文本生成失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/image/generate", response_model=ModelCallResponse, summary="图像生成")
async def generate_image(
    request: ImageGenerationRequest,
    current_user = Depends(get_current_user)
):
    """图像生成接口"""
    try:
        async with multimodal_api_service as service:
            result = await service.image_generation(
                model_id=request.model_id,
                prompt=request.prompt,
                n=request.n,
                size=request.size,
                quality=request.quality
            )
        
        return ModelCallResponse(
            success=result.success,
            data=result.data,
            error=result.error,
            usage=result.usage,
            latency=result.latency,
            model_id=result.model_id,
            provider=result.provider,
            timestamp=result.timestamp
        )
    
    except Exception as e:
        logger.error(f"图像生成失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/image/understand", response_model=ModelCallResponse, summary="图像理解")
async def understand_image(
    model_id: str = Form(...),
    messages: str = Form(...),  # JSON字符串
    image: UploadFile = File(...),
    max_tokens: Optional[int] = Form(None),
    current_user = Depends(get_current_user)
):
    """图像理解接口"""
    try:
        import json
        messages_data = json.loads(messages)
        
        # 读取图像文件
        image_content = await image.read()
        image_file = io.BytesIO(image_content)
        
        async with multimodal_api_service as service:
            result = await service.image_understanding(
                model_id=model_id,
                messages=messages_data,
                image_file=image_file,
                max_tokens=max_tokens
            )
        
        return ModelCallResponse(
            success=result.success,
            data=result.data,
            error=result.error,
            usage=result.usage,
            latency=result.latency,
            model_id=result.model_id,
            provider=result.provider,
            timestamp=result.timestamp
        )
    
    except Exception as e:
        logger.error(f"图像理解失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/audio/transcribe", response_model=ModelCallResponse, summary="语音识别")
async def transcribe_audio(
    model_id: str = Form(...),
    audio: UploadFile = File(...),
    language: Optional[str] = Form(None),
    current_user = Depends(get_current_user)
):
    """语音识别接口"""
    try:
        # 读取音频文件
        audio_content = await audio.read()
        audio_file = io.BytesIO(audio_content)
        
        async with multimodal_api_service as service:
            result = await service.speech_to_text(
                model_id=model_id,
                audio_file=audio_file,
                language=language
            )
        
        return ModelCallResponse(
            success=result.success,
            data=result.data,
            error=result.error,
            usage=result.usage,
            latency=result.latency,
            model_id=result.model_id,
            provider=result.provider,
            timestamp=result.timestamp
        )
    
    except Exception as e:
        logger.error(f"语音识别失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/audio/synthesize", summary="语音合成")
async def synthesize_speech(
    request: TextToSpeechRequest,
    current_user = Depends(get_current_user)
):
    """语音合成接口"""
    try:
        async with multimodal_api_service as service:
            result = await service.text_to_speech(
                model_id=request.model_id,
                text=request.text,
                voice=request.voice,
                format=request.response_format
            )
        
        if result.success and result.data and "audio" in result.data:
            # 返回音频文件流
            audio_data = base64.b64decode(result.data["audio"])
            
            def generate():
                yield audio_data
            
            media_type = f"audio/{request.response_format}"
            return StreamingResponse(
                generate(),
                media_type=media_type,
                headers={"Content-Disposition": f"attachment; filename=speech.{request.response_format}"}
            )
        else:
            raise HTTPException(status_code=500, detail=result.error or "语音合成失败")
    
    except Exception as e:
        logger.error(f"语音合成失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 模型管理接口 ====================

@router.get("/models", response_model=ModelListResponse, summary="获取模型列表")
async def get_models(
    model_type: Optional[ModelType] = None,
    provider: Optional[ModelProvider] = None,
    active_only: bool = True,
    current_user = Depends(get_current_user)
):
    """获取模型列表"""
    try:
        async with multimodal_api_service as service:
            models = await service.get_model_list(model_type, provider)
        
        if active_only:
            models = [m for m in models if m.is_active]
        
        model_responses = [
            ModelConfigResponse(
                id=model.id,
                name=model.name,
                provider=model.provider,
                type=model.type,
                model_id=model.model_id,
                is_active=model.is_active,
                created_at=model.created_at,
                updated_at=model.updated_at,
                metadata=model.metadata.dict() if model.metadata else None
            )
            for model in models
        ]
        
        return ModelListResponse(
            models=model_responses,
            total=len(model_responses)
        )
    
    except Exception as e:
        logger.error(f"获取模型列表失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models/{model_id}", response_model=ModelConfigResponse, summary="获取模型详情")
async def get_model(
    model_id: str,
    current_user = Depends(get_current_user)
):
    """获取模型详情"""
    model = multimodal_manager.get_model(model_id)
    if not model:
        raise HTTPException(status_code=404, detail="模型不存在")
    
    return ModelConfigResponse(
        id=model.id,
        name=model.name,
        provider=model.provider,
        type=model.type,
        model_id=model.model_id,
        is_active=model.is_active,
        created_at=model.created_at,
        updated_at=model.updated_at,
        metadata=model.metadata.dict() if model.metadata else None
    )


@router.post("/models", response_model=ModelConfigResponse, summary="添加模型配置")
async def create_model(
    request: ModelConfigRequest,
    current_user = Depends(get_current_user)
):
    """添加模型配置"""
    try:
        # 生成模型ID
        import uuid
        model_id = str(uuid.uuid4())
        
        # 创建模型配置
        config = MultimodalModelConfig(
            id=model_id,
            name=request.name,
            provider=request.provider,
            type=request.type,
            model_id=request.model_id,
            api_key=request.api_key,
            base_url=request.base_url,
            api_version=request.api_version,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            timeout=request.timeout,
            custom_headers=request.custom_headers,
            custom_params=request.custom_params
        )
        
        # 添加到管理器
        success = multimodal_manager.add_model(config)
        if not success:
            raise HTTPException(status_code=500, detail="添加模型配置失败")
        
        return ModelConfigResponse(
            id=config.id,
            name=config.name,
            provider=config.provider,
            type=config.type,
            model_id=config.model_id,
            is_active=config.is_active,
            created_at=config.created_at,
            updated_at=config.updated_at,
            metadata=config.metadata.dict() if config.metadata else None
        )
    
    except Exception as e:
        logger.error(f"添加模型配置失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/models/{model_id}", response_model=ModelConfigResponse, summary="更新模型配置")
async def update_model(
    model_id: str,
    request: ModelConfigRequest,
    current_user = Depends(get_current_user)
):
    """更新模型配置"""
    try:
        # 检查模型是否存在
        existing_model = multimodal_manager.get_model(model_id)
        if not existing_model:
            raise HTTPException(status_code=404, detail="模型不存在")
        
        # 更新配置
        updates = {
            "name": request.name,
            "provider": request.provider,
            "type": request.type,
            "model_id": request.model_id,
            "api_key": request.api_key,
            "base_url": request.base_url,
            "api_version": request.api_version,
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
            "timeout": request.timeout,
            "custom_headers": request.custom_headers,
            "custom_params": request.custom_params
        }
        
        success = multimodal_manager.update_model(model_id, updates)
        if not success:
            raise HTTPException(status_code=500, detail="更新模型配置失败")
        
        # 获取更新后的模型
        updated_model = multimodal_manager.get_model(model_id)
        
        return ModelConfigResponse(
            id=updated_model.id,
            name=updated_model.name,
            provider=updated_model.provider,
            type=updated_model.type,
            model_id=updated_model.model_id,
            is_active=updated_model.is_active,
            created_at=updated_model.created_at,
            updated_at=updated_model.updated_at,
            metadata=updated_model.metadata.dict() if updated_model.metadata else None
        )
    
    except Exception as e:
        logger.error(f"更新模型配置失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/models/{model_id}", summary="删除模型配置")
async def delete_model(
    model_id: str,
    current_user = Depends(get_current_user)
):
    """删除模型配置"""
    try:
        success = multimodal_manager.remove_model(model_id)
        if not success:
            raise HTTPException(status_code=404, detail="模型不存在")
        
        return {"message": "模型配置删除成功"}
    
    except Exception as e:
        logger.error(f"删除模型配置失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/models/{model_id}/toggle", summary="切换模型状态")
async def toggle_model_status(
    model_id: str,
    current_user = Depends(get_current_user)
):
    """切换模型激活状态"""
    try:
        model = multimodal_manager.get_model(model_id)
        if not model:
            raise HTTPException(status_code=404, detail="模型不存在")
        
        success = multimodal_manager.update_model(model_id, {"is_active": not model.is_active})
        if not success:
            raise HTTPException(status_code=500, detail="切换模型状态失败")
        
        return {"message": f"模型状态已切换为 {'激活' if not model.is_active else '停用'}"}
    
    except Exception as e:
        logger.error(f"切换模型状态失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 模型推荐接口 ====================

@router.get("/models/recommend/{model_type}", response_model=ModelConfigResponse, summary="获取推荐模型")
async def get_recommended_model(
    model_type: ModelType,
    provider: Optional[ModelProvider] = None,
    current_user = Depends(get_current_user)
):
    """获取推荐模型"""
    try:
        async with multimodal_api_service as service:
            model = await service.get_recommended_model(model_type, provider)
        
        if not model:
            raise HTTPException(status_code=404, detail="未找到合适的模型")
        
        return ModelConfigResponse(
            id=model.id,
            name=model.name,
            provider=model.provider,
            type=model.type,
            model_id=model.model_id,
            is_active=model.is_active,
            created_at=model.created_at,
            updated_at=model.updated_at,
            metadata=model.metadata.dict() if model.metadata else None
        )
    
    except Exception as e:
        logger.error(f"获取推荐模型失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 模型性能指标接口 ====================

@router.get("/models/{model_id}/metrics", response_model=ModelMetrics, summary="获取模型性能指标")
async def get_model_metrics(
    model_id: str,
    current_user = Depends(get_current_user)
):
    """获取模型性能指标"""
    metrics = multimodal_manager.get_model_metrics(model_id)
    if not metrics:
        raise HTTPException(status_code=404, detail="模型指标不存在")
    
    return metrics


# ==================== 智能体模型配置接口 ====================

@router.post("/agents/{agent_id}/config", summary="设置智能体模型配置")
async def set_agent_model_config(
    agent_id: str,
    config: AgentModelConfig,
    current_user = Depends(get_current_user)
):
    """设置智能体模型配置"""
    try:
        success = multimodal_manager.set_agent_config(agent_id, config)
        if not success:
            raise HTTPException(status_code=500, detail="设置智能体模型配置失败")
        
        return {"message": "智能体模型配置设置成功"}
    
    except Exception as e:
        logger.error(f"设置智能体模型配置失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agents/{agent_id}/config", response_model=AgentModelConfig, summary="获取智能体模型配置")
async def get_agent_model_config(
    agent_id: str,
    current_user = Depends(get_current_user)
):
    """获取智能体模型配置"""
    config = multimodal_manager.get_agent_config(agent_id)
    if not config:
        raise HTTPException(status_code=404, detail="智能体模型配置不存在")
    
    return config