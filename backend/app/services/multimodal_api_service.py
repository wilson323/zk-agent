# -*- coding: utf-8 -*-
"""
多模态API服务
统一调用各种商用大模型的API接口
"""

import asyncio
import aiohttp
import json
import time
from typing import Dict, List, Optional, Any, Union, BinaryIO
from datetime import datetime
from pathlib import Path
import base64
import mimetypes

from ..core.multimodal_config import (
    MultimodalModelConfig,
    ModelType,
    ModelProvider,
    ModelCallResult,
    multimodal_manager
)
from ..core.config import settings
from ..core.logger import get_logger

logger = get_logger(__name__)


class MultimodalAPIService:
    """多模态API服务类"""
    
    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        """异步上下文管理器入口"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=300),
            connector=aiohttp.TCPConnector(limit=100, limit_per_host=30)
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """异步上下文管理器出口"""
        if self.session:
            await self.session.close()
    
    async def call_model(self, 
                        model_id: str, 
                        request_data: Dict[str, Any],
                        files: Optional[Dict[str, BinaryIO]] = None) -> ModelCallResult:
        """调用模型API"""
        start_time = time.time()
        
        # 获取模型配置
        model_config = multimodal_manager.get_model(model_id)
        if not model_config:
            return ModelCallResult(
                success=False,
                error=f"模型 {model_id} 不存在",
                model_id=model_id,
                provider=ModelProvider.OPENAI  # 默认值
            )
        
        if not model_config.is_active:
            return ModelCallResult(
                success=False,
                error=f"模型 {model_id} 未激活",
                model_id=model_id,
                provider=model_config.provider
            )
        
        try:
            # 根据模型类型和厂商调用相应的API
            if model_config.provider == ModelProvider.OPENAI:
                result = await self._call_openai_api(model_config, request_data, files)
            elif model_config.provider == ModelProvider.ALIBABA_QWEN:
                result = await self._call_qwen_api(model_config, request_data, files)
            elif model_config.provider == ModelProvider.SILICONFLOW:
                result = await self._call_siliconflow_api(model_config, request_data, files)
            elif model_config.provider == ModelProvider.ZHIPU_GLM:
                result = await self._call_zhipu_api(model_config, request_data, files)
            elif model_config.provider == ModelProvider.BAIDU_WENXIN:
                result = await self._call_wenxin_api(model_config, request_data, files)
            else:
                result = ModelCallResult(
                    success=False,
                    error=f"不支持的模型厂商: {model_config.provider}",
                    model_id=model_id,
                    provider=model_config.provider
                )
            
            # 计算延迟
            result.latency = (time.time() - start_time) * 1000
            
            # 记录调用结果
            multimodal_manager.record_call_result(result)
            
            return result
            
        except Exception as e:
            logger.error(f"调用模型 {model_id} 失败: {str(e)}")
            result = ModelCallResult(
                success=False,
                error=str(e),
                model_id=model_id,
                provider=model_config.provider,
                latency=(time.time() - start_time) * 1000
            )
            multimodal_manager.record_call_result(result)
            return result
    
    async def _call_openai_api(self, 
                              config: MultimodalModelConfig, 
                              request_data: Dict[str, Any],
                              files: Optional[Dict[str, BinaryIO]] = None) -> ModelCallResult:
        """调用OpenAI API"""
        headers = {
            "Authorization": f"Bearer {config.api_key}",
            "Content-Type": "application/json"
        }
        
        if config.custom_headers:
            headers.update(config.custom_headers)
        
        # 根据模型类型构建请求
        if config.type == ModelType.TEXT or config.type == ModelType.MULTIMODAL:
            url = f"{config.base_url}/chat/completions"
            payload = {
                "model": config.model_id,
                "messages": request_data.get("messages", []),
                "temperature": config.temperature,
                "max_tokens": config.max_tokens
            }
            
            # 添加可选参数
            if config.top_p is not None:
                payload["top_p"] = config.top_p
            if config.frequency_penalty is not None:
                payload["frequency_penalty"] = config.frequency_penalty
            if config.presence_penalty is not None:
                payload["presence_penalty"] = config.presence_penalty
            
            # 处理图像输入（多模态）
            if files and config.type == ModelType.MULTIMODAL:
                for message in payload["messages"]:
                    if message.get("role") == "user" and isinstance(message.get("content"), list):
                        for content_item in message["content"]:
                            if content_item.get("type") == "image_url":
                                # 处理图像文件
                                image_data = self._encode_image(files.get("image"))
                                content_item["image_url"] = {
                                    "url": f"data:image/jpeg;base64,{image_data}"
                                }
        
        elif config.type == ModelType.IMAGE_GENERATION:
            url = f"{config.base_url}/images/generations"
            payload = {
                "model": config.model_id,
                "prompt": request_data.get("prompt", ""),
                "n": request_data.get("n", 1),
                "size": request_data.get("size", "1024x1024"),
                "quality": request_data.get("quality", "standard")
            }
        
        elif config.type == ModelType.SPEECH_TO_TEXT:
            url = f"{config.base_url}/audio/transcriptions"
            # 对于语音识别，需要使用multipart/form-data
            headers.pop("Content-Type", None)
            
            form_data = aiohttp.FormData()
            form_data.add_field("model", config.model_id)
            if files and "audio" in files:
                form_data.add_field("file", files["audio"], filename="audio.wav")
            
            async with self.session.post(url, headers=headers, data=form_data, timeout=config.timeout) as response:
                response_data = await response.json()
                
                if response.status == 200:
                    return ModelCallResult(
                        success=True,
                        data=response_data,
                        model_id=config.id,
                        provider=config.provider,
                        usage=response_data.get("usage")
                    )
                else:
                    return ModelCallResult(
                        success=False,
                        error=response_data.get("error", {}).get("message", "未知错误"),
                        model_id=config.id,
                        provider=config.provider
                    )
        
        elif config.type == ModelType.TEXT_TO_SPEECH:
            url = f"{config.base_url}/audio/speech"
            payload = {
                "model": config.model_id,
                "input": request_data.get("text", ""),
                "voice": request_data.get("voice", "alloy"),
                "response_format": request_data.get("format", "mp3")
            }
        
        else:
            return ModelCallResult(
                success=False,
                error=f"不支持的模型类型: {config.type}",
                model_id=config.id,
                provider=config.provider
            )
        
        # 发送请求（除了语音识别已经处理过的情况）
        if config.type != ModelType.SPEECH_TO_TEXT:
            async with self.session.post(url, headers=headers, json=payload, timeout=config.timeout) as response:
                if config.type == ModelType.TEXT_TO_SPEECH:
                    # 语音合成返回二进制数据
                    if response.status == 200:
                        audio_data = await response.read()
                        return ModelCallResult(
                            success=True,
                            data={"audio": base64.b64encode(audio_data).decode()},
                            model_id=config.id,
                            provider=config.provider
                        )
                    else:
                        error_data = await response.json()
                        return ModelCallResult(
                            success=False,
                            error=error_data.get("error", {}).get("message", "未知错误"),
                            model_id=config.id,
                            provider=config.provider
                        )
                else:
                    # 其他类型返回JSON数据
                    response_data = await response.json()
                    
                    if response.status == 200:
                        return ModelCallResult(
                            success=True,
                            data=response_data,
                            model_id=config.id,
                            provider=config.provider,
                            usage=response_data.get("usage")
                        )
                    else:
                        return ModelCallResult(
                            success=False,
                            error=response_data.get("error", {}).get("message", "未知错误"),
                            model_id=config.id,
                            provider=config.provider
                        )
    
    async def _call_qwen_api(self, 
                            config: MultimodalModelConfig, 
                            request_data: Dict[str, Any],
                            files: Optional[Dict[str, BinaryIO]] = None) -> ModelCallResult:
        """调用阿里云千问API"""
        headers = {
            "Authorization": f"Bearer {config.api_key}",
            "Content-Type": "application/json"
        }
        
        if config.custom_headers:
            headers.update(config.custom_headers)
        
        base_url = config.base_url or "https://dashscope.aliyuncs.com/api/v1"
        
        if config.type == ModelType.TEXT or config.type == ModelType.MULTIMODAL:
            url = f"{base_url}/services/aigc/text-generation/generation"
            payload = {
                "model": config.model_id,
                "input": {
                    "messages": request_data.get("messages", [])
                },
                "parameters": {
                    "temperature": config.temperature,
                    "max_tokens": config.max_tokens
                }
            }
        
        elif config.type == ModelType.IMAGE_GENERATION:
            url = f"{base_url}/services/aigc/text2image/image-synthesis"
            payload = {
                "model": config.model_id,
                "input": {
                    "prompt": request_data.get("prompt", "")
                },
                "parameters": {
                    "size": request_data.get("size", "1024*1024"),
                    "n": request_data.get("n", 1)
                }
            }
        
        else:
            return ModelCallResult(
                success=False,
                error=f"千问暂不支持模型类型: {config.type}",
                model_id=config.id,
                provider=config.provider
            )
        
        async with self.session.post(url, headers=headers, json=payload, timeout=config.timeout) as response:
            response_data = await response.json()
            
            if response.status == 200 and response_data.get("output"):
                return ModelCallResult(
                    success=True,
                    data=response_data,
                    model_id=config.id,
                    provider=config.provider,
                    usage=response_data.get("usage")
                )
            else:
                return ModelCallResult(
                    success=False,
                    error=response_data.get("message", "未知错误"),
                    model_id=config.id,
                    provider=config.provider
                )
    
    async def _call_siliconflow_api(self, 
                                   config: MultimodalModelConfig, 
                                   request_data: Dict[str, Any],
                                   files: Optional[Dict[str, BinaryIO]] = None) -> ModelCallResult:
        """调用硅基流动API"""
        headers = {
            "Authorization": f"Bearer {config.api_key}",
            "Content-Type": "application/json"
        }
        
        if config.custom_headers:
            headers.update(config.custom_headers)
        
        base_url = config.base_url or "https://api.siliconflow.cn/v1"
        
        if config.type == ModelType.TEXT or config.type == ModelType.MULTIMODAL:
            url = f"{base_url}/chat/completions"
            payload = {
                "model": config.model_id,
                "messages": request_data.get("messages", []),
                "temperature": config.temperature,
                "max_tokens": config.max_tokens,
                "stream": request_data.get("stream", False)
            }
        
        elif config.type == ModelType.IMAGE_GENERATION:
            url = f"{base_url}/images/generations"
            payload = {
                "model": config.model_id,
                "prompt": request_data.get("prompt", ""),
                "n": request_data.get("n", 1),
                "size": request_data.get("size", "1024x1024")
            }
        
        else:
            return ModelCallResult(
                success=False,
                error=f"硅基流动暂不支持模型类型: {config.type}",
                model_id=config.id,
                provider=config.provider
            )
        
        async with self.session.post(url, headers=headers, json=payload, timeout=config.timeout) as response:
            response_data = await response.json()
            
            if response.status == 200:
                return ModelCallResult(
                    success=True,
                    data=response_data,
                    model_id=config.id,
                    provider=config.provider,
                    usage=response_data.get("usage")
                )
            else:
                return ModelCallResult(
                    success=False,
                    error=response_data.get("error", {}).get("message", "未知错误"),
                    model_id=config.id,
                    provider=config.provider
                )
    
    async def _call_zhipu_api(self, 
                             config: MultimodalModelConfig, 
                             request_data: Dict[str, Any],
                             files: Optional[Dict[str, BinaryIO]] = None) -> ModelCallResult:
        """调用智谱GLM API"""
        headers = {
            "Authorization": f"Bearer {config.api_key}",
            "Content-Type": "application/json"
        }
        
        if config.custom_headers:
            headers.update(config.custom_headers)
        
        base_url = config.base_url or "https://open.bigmodel.cn/api/paas/v4"
        
        if config.type == ModelType.TEXT or config.type == ModelType.MULTIMODAL:
            url = f"{base_url}/chat/completions"
            payload = {
                "model": config.model_id,
                "messages": request_data.get("messages", []),
                "temperature": config.temperature,
                "max_tokens": config.max_tokens
            }
        
        elif config.type == ModelType.IMAGE_GENERATION:
            url = f"{base_url}/images/generations"
            payload = {
                "model": config.model_id,
                "prompt": request_data.get("prompt", ""),
                "n": request_data.get("n", 1),
                "size": request_data.get("size", "1024x1024")
            }
        
        else:
            return ModelCallResult(
                success=False,
                error=f"智谱GLM暂不支持模型类型: {config.type}",
                model_id=config.id,
                provider=config.provider
            )
        
        async with self.session.post(url, headers=headers, json=payload, timeout=config.timeout) as response:
            response_data = await response.json()
            
            if response.status == 200:
                return ModelCallResult(
                    success=True,
                    data=response_data,
                    model_id=config.id,
                    provider=config.provider,
                    usage=response_data.get("usage")
                )
            else:
                return ModelCallResult(
                    success=False,
                    error=response_data.get("error", {}).get("message", "未知错误"),
                    model_id=config.id,
                    provider=config.provider
                )
    
    async def _call_wenxin_api(self, 
                              config: MultimodalModelConfig, 
                              request_data: Dict[str, Any],
                              files: Optional[Dict[str, BinaryIO]] = None) -> ModelCallResult:
        """调用百度文心API"""
        # 百度文心需要先获取access_token
        access_token = await self._get_wenxin_access_token(config)
        if not access_token:
            return ModelCallResult(
                success=False,
                error="获取百度文心access_token失败",
                model_id=config.id,
                provider=config.provider
            )
        
        headers = {
            "Content-Type": "application/json"
        }
        
        if config.custom_headers:
            headers.update(config.custom_headers)
        
        base_url = config.base_url or "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop"
        
        if config.type == ModelType.TEXT:
            url = f"{base_url}/chat/{config.model_id}?access_token={access_token}"
            payload = {
                "messages": request_data.get("messages", []),
                "temperature": config.temperature,
                "max_output_tokens": config.max_tokens
            }
        
        else:
            return ModelCallResult(
                success=False,
                error=f"百度文心暂不支持模型类型: {config.type}",
                model_id=config.id,
                provider=config.provider
            )
        
        async with self.session.post(url, headers=headers, json=payload, timeout=config.timeout) as response:
            response_data = await response.json()
            
            if response.status == 200 and not response_data.get("error_code"):
                return ModelCallResult(
                    success=True,
                    data=response_data,
                    model_id=config.id,
                    provider=config.provider,
                    usage=response_data.get("usage")
                )
            else:
                return ModelCallResult(
                    success=False,
                    error=response_data.get("error_msg", "未知错误"),
                    model_id=config.id,
                    provider=config.provider
                )
    
    async def _get_wenxin_access_token(self, config: MultimodalModelConfig) -> Optional[str]:
        """获取百度文心access_token"""
        # 这里需要使用API Key和Secret Key获取access_token
        # 实际实现中需要从配置中获取这些信息
        url = "https://aip.baidubce.com/oauth/2.0/token"
        params = {
            "grant_type": "client_credentials",
            "client_id": config.api_key,  # API Key
            "client_secret": config.custom_params.get("secret_key", "") if config.custom_params else ""
        }
        
        try:
            async with self.session.post(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get("access_token")
        except Exception as e:
            logger.error(f"获取百度文心access_token失败: {e}")
        
        return None
    
    def _encode_image(self, image_file: BinaryIO) -> str:
        """编码图像文件为base64"""
        if image_file:
            image_file.seek(0)
            return base64.b64encode(image_file.read()).decode('utf-8')
        return ""
    
    async def text_generation(self, model_id: str, messages: List[Dict[str, str]], **kwargs) -> ModelCallResult:
        """文本生成"""
        request_data = {
            "messages": messages,
            **kwargs
        }
        return await self.call_model(model_id, request_data)
    
    async def image_generation(self, model_id: str, prompt: str, **kwargs) -> ModelCallResult:
        """图像生成"""
        request_data = {
            "prompt": prompt,
            **kwargs
        }
        return await self.call_model(model_id, request_data)
    
    async def image_understanding(self, model_id: str, messages: List[Dict[str, Any]], image_file: BinaryIO, **kwargs) -> ModelCallResult:
        """图像理解"""
        request_data = {
            "messages": messages,
            **kwargs
        }
        files = {"image": image_file}
        return await self.call_model(model_id, request_data, files)
    
    async def speech_to_text(self, model_id: str, audio_file: BinaryIO, **kwargs) -> ModelCallResult:
        """语音识别"""
        request_data = kwargs
        files = {"audio": audio_file}
        return await self.call_model(model_id, request_data, files)
    
    async def text_to_speech(self, model_id: str, text: str, **kwargs) -> ModelCallResult:
        """语音合成"""
        request_data = {
            "text": text,
            **kwargs
        }
        return await self.call_model(model_id, request_data)
    
    async def get_model_list(self, model_type: Optional[ModelType] = None, provider: Optional[ModelProvider] = None) -> List[MultimodalModelConfig]:
        """获取模型列表"""
        models = multimodal_manager.list_active_models()
        
        if model_type:
            models = [m for m in models if m.type == model_type]
        
        if provider:
            models = [m for m in models if m.provider == provider]
        
        return models
    
    async def get_recommended_model(self, model_type: ModelType, provider: Optional[ModelProvider] = None) -> Optional[MultimodalModelConfig]:
        """获取推荐模型"""
        return multimodal_manager.get_recommended_model(model_type, provider)


# 全局服务实例
multimodal_api_service = MultimodalAPIService()