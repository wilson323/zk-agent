# -*- coding: utf-8 -*-
"""
多模态模型配置模块
统一管理自然语言、语音、视频、图像等模型的API接口调用
"""

from enum import Enum
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field, validator
from datetime import datetime


class ModelType(str, Enum):
    """模型类型枚举"""
    TEXT = "text"  # 文本生成
    MULTIMODAL = "multimodal"  # 多模态
    SPEECH_TO_TEXT = "speech_to_text"  # 语音识别
    TEXT_TO_SPEECH = "text_to_speech"  # 语音合成
    IMAGE_GENERATION = "image_generation"  # 图片生成
    IMAGE_UNDERSTANDING = "image_understanding"  # 图片理解
    VIDEO_GENERATION = "video_generation"  # 视频生成
    VIDEO_UNDERSTANDING = "video_understanding"  # 视频理解
    EMBEDDING = "embedding"  # 向量嵌入
    CODE_GENERATION = "code_generation"  # 代码生成
    TRANSLATION = "translation"  # 翻译
    AUDIO_GENERATION = "audio_generation"  # 音频生成


class ModelProvider(str, Enum):
    """模型厂商枚举"""
    OPENAI = "openai"
    ALIBABA_QWEN = "alibaba_qwen"
    BAIDU_WENXIN = "baidu_wenxin"
    TENCENT_HUNYUAN = "tencent_hunyuan"
    ZHIPU_GLM = "zhipu_glm"
    MOONSHOT_KIMI = "moonshot_kimi"
    BYTEDANCE_DOUBAO = "bytedance_doubao"
    IFLYTEK_SPARK = "iflytek_spark"
    SENSETIME_NOVA = "sensetime_nova"
    KUNLUN_TIANGONG = "kunlun_tiangong"
    MINIMAX_ABAB = "minimax_abab"
    YI_01AI = "yi_01ai"
    DEEPSEEK = "deepseek"
    MIANBEI_CPM = "mianbei_cpm"
    ANTHROPIC_CLAUDE = "anthropic_claude"
    GOOGLE_GEMINI = "google_gemini"
    MICROSOFT_AZURE = "microsoft_azure"
    STABILITY_AI = "stability_ai"
    MIDJOURNEY = "midjourney"
    RUNWAY = "runway"
    SILICONFLOW = "siliconflow"
    ELEVENLABS = "elevenlabs"
    REPLICATE = "replicate"


class ModelPricing(BaseModel):
    """模型定价信息"""
    input_token_price: Optional[float] = Field(None, description="输入token价格")
    output_token_price: Optional[float] = Field(None, description="输出token价格")
    image_price: Optional[float] = Field(None, description="图片处理价格")
    audio_price: Optional[float] = Field(None, description="音频处理价格")
    video_price: Optional[float] = Field(None, description="视频处理价格")
    currency: str = Field("USD", description="货币单位")


class ModelLimits(BaseModel):
    """模型限制信息"""
    max_requests_per_minute: Optional[int] = Field(None, description="每分钟最大请求数")
    max_tokens_per_request: Optional[int] = Field(None, description="每次请求最大token数")
    max_file_size: Optional[int] = Field(None, description="最大文件大小（字节）")
    supported_formats: Optional[List[str]] = Field(None, description="支持的文件格式")
    max_duration: Optional[int] = Field(None, description="最大时长（秒）")


class ModelMetadata(BaseModel):
    """模型元数据"""
    description: Optional[str] = Field(None, description="模型描述")
    capabilities: Optional[List[str]] = Field(None, description="模型能力")
    pricing: Optional[ModelPricing] = Field(None, description="定价信息")
    limits: Optional[ModelLimits] = Field(None, description="限制信息")
    version: Optional[str] = Field(None, description="模型版本")
    release_date: Optional[str] = Field(None, description="发布日期")
    documentation_url: Optional[str] = Field(None, description="文档链接")


class MultimodalModelConfig(BaseModel):
    """多模态模型配置"""
    id: str = Field(..., description="模型唯一标识")
    name: str = Field(..., description="模型名称")
    provider: ModelProvider = Field(..., description="模型厂商")
    type: ModelType = Field(..., description="模型类型")
    model_id: str = Field(..., description="厂商模型ID")
    api_key: str = Field(..., description="API密钥")
    base_url: Optional[str] = Field(None, description="API基础URL")
    api_version: Optional[str] = Field(None, description="API版本")
    
    # 模型参数
    max_tokens: Optional[int] = Field(None, description="最大token数")
    temperature: Optional[float] = Field(0.7, description="温度参数")
    top_p: Optional[float] = Field(None, description="Top-p参数")
    frequency_penalty: Optional[float] = Field(None, description="频率惩罚")
    presence_penalty: Optional[float] = Field(None, description="存在惩罚")
    
    # 请求配置
    timeout: int = Field(60, description="请求超时时间（秒）")
    retry_attempts: int = Field(3, description="重试次数")
    retry_delay: float = Field(1.0, description="重试延迟（秒）")
    
    # 自定义配置
    custom_headers: Optional[Dict[str, str]] = Field(None, description="自定义请求头")
    custom_params: Optional[Dict[str, Any]] = Field(None, description="自定义参数")
    
    # 状态信息
    is_active: bool = Field(True, description="是否激活")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    updated_at: datetime = Field(default_factory=datetime.now, description="更新时间")
    
    # 元数据
    metadata: Optional[ModelMetadata] = Field(None, description="模型元数据")
    
    @validator('temperature')
    def validate_temperature(cls, v):
        if v is not None and (v < 0 or v > 2):
            raise ValueError('温度参数必须在0-2之间')
        return v
    
    @validator('top_p')
    def validate_top_p(cls, v):
        if v is not None and (v < 0 or v > 1):
            raise ValueError('Top-p参数必须在0-1之间')
        return v


class AgentModelConfig(BaseModel):
    """智能体模型配置"""
    # 主要对话模型
    primary_model: str = Field(..., description="主要对话模型ID")
    
    # CAD智能体专用模型
    cad_models: Optional[Dict[str, str]] = Field(None, description="CAD智能体模型配置")
    
    # 海报智能体专用模型
    poster_models: Optional[Dict[str, str]] = Field(None, description="海报智能体模型配置")
    
    # 通用功能模型
    common_models: Optional[Dict[str, str]] = Field(None, description="通用功能模型配置")
    
    def __init__(self, **data):
        super().__init__(**data)
        # 设置默认的CAD模型配置
        if self.cad_models is None:
            self.cad_models = {
                "structure_analysis": self.primary_model,
                "device_recognition": self.primary_model,
                "risk_assessment": self.primary_model,
                "compliance_check": self.primary_model,
                "report_generation": self.primary_model,
            }
        
        # 设置默认的海报模型配置
        if self.poster_models is None:
            self.poster_models = {
                "design_analysis": self.primary_model,
                "image_generation": "dall-e-3",
                "text_generation": self.primary_model,
                "style_recommendation": self.primary_model,
                "color_analysis": self.primary_model,
            }
        
        # 设置默认的通用模型配置
        if self.common_models is None:
            self.common_models = {
                "speech_to_text": "whisper-1",
                "text_to_speech": "tts-1",
                "image_understanding": "gpt-4-vision-preview",
                "embedding": "text-embedding-ada-002",
                "translation": self.primary_model,
            }


class ModelCallResult(BaseModel):
    """模型调用结果"""
    success: bool = Field(..., description="是否成功")
    data: Optional[Any] = Field(None, description="返回数据")
    error: Optional[str] = Field(None, description="错误信息")
    usage: Optional[Dict[str, Union[int, float]]] = Field(None, description="使用统计")
    latency: Optional[float] = Field(None, description="延迟（毫秒）")
    model_id: str = Field(..., description="模型ID")
    provider: ModelProvider = Field(..., description="模型厂商")
    timestamp: datetime = Field(default_factory=datetime.now, description="调用时间")


class ModelMetrics(BaseModel):
    """模型性能指标"""
    model_id: str = Field(..., description="模型ID")
    total_calls: int = Field(0, description="总调用次数")
    success_rate: float = Field(0.0, description="成功率")
    average_latency: float = Field(0.0, description="平均延迟（毫秒）")
    total_cost: float = Field(0.0, description="总成本")
    error_count: int = Field(0, description="错误次数")
    last_used: Optional[datetime] = Field(None, description="最后使用时间")
    daily_usage: Optional[List[Dict[str, Any]]] = Field(None, description="每日使用统计")


class MultimodalModelManager:
    """多模态模型管理器"""
    
    def __init__(self):
        self.models: Dict[str, MultimodalModelConfig] = {}
        self.agent_configs: Dict[str, AgentModelConfig] = {}
        self.metrics: Dict[str, ModelMetrics] = {}
    
    def add_model(self, config: MultimodalModelConfig) -> bool:
        """添加模型配置"""
        try:
            self.models[config.id] = config
            if config.id not in self.metrics:
                self.metrics[config.id] = ModelMetrics(model_id=config.id)
            return True
        except Exception as e:
            print(f"添加模型失败: {e}")
            return False
    
    def get_model(self, model_id: str) -> Optional[MultimodalModelConfig]:
        """获取模型配置"""
        return self.models.get(model_id)
    
    def get_models_by_type(self, model_type: ModelType) -> List[MultimodalModelConfig]:
        """根据类型获取模型列表"""
        return [model for model in self.models.values() if model.type == model_type]
    
    def get_models_by_provider(self, provider: ModelProvider) -> List[MultimodalModelConfig]:
        """根据厂商获取模型列表"""
        return [model for model in self.models.values() if model.provider == provider]
    
    def update_model(self, model_id: str, updates: Dict[str, Any]) -> bool:
        """更新模型配置"""
        if model_id not in self.models:
            return False
        
        try:
            model = self.models[model_id]
            for key, value in updates.items():
                if hasattr(model, key):
                    setattr(model, key, value)
            model.updated_at = datetime.now()
            return True
        except Exception as e:
            print(f"更新模型失败: {e}")
            return False
    
    def remove_model(self, model_id: str) -> bool:
        """删除模型配置"""
        if model_id in self.models:
            del self.models[model_id]
            if model_id in self.metrics:
                del self.metrics[model_id]
            return True
        return False
    
    def set_agent_config(self, agent_id: str, config: AgentModelConfig) -> bool:
        """设置智能体模型配置"""
        try:
            self.agent_configs[agent_id] = config
            return True
        except Exception as e:
            print(f"设置智能体配置失败: {e}")
            return False
    
    def get_agent_config(self, agent_id: str) -> Optional[AgentModelConfig]:
        """获取智能体模型配置"""
        return self.agent_configs.get(agent_id)
    
    def record_call_result(self, result: ModelCallResult) -> None:
        """记录模型调用结果"""
        if result.model_id not in self.metrics:
            self.metrics[result.model_id] = ModelMetrics(model_id=result.model_id)
        
        metrics = self.metrics[result.model_id]
        metrics.total_calls += 1
        metrics.last_used = result.timestamp
        
        if result.success:
            # 更新成功率
            success_count = metrics.total_calls * metrics.success_rate + 1
            metrics.success_rate = success_count / metrics.total_calls
            
            # 更新平均延迟
            if result.latency:
                total_latency = metrics.average_latency * (metrics.total_calls - 1) + result.latency
                metrics.average_latency = total_latency / metrics.total_calls
        else:
            metrics.error_count += 1
            # 重新计算成功率
            success_count = metrics.total_calls - metrics.error_count
            metrics.success_rate = success_count / metrics.total_calls if metrics.total_calls > 0 else 0
        
        # 更新成本
        if result.usage and 'cost' in result.usage:
            metrics.total_cost += result.usage['cost']
    
    def get_model_metrics(self, model_id: str) -> Optional[ModelMetrics]:
        """获取模型性能指标"""
        return self.metrics.get(model_id)
    
    def list_active_models(self) -> List[MultimodalModelConfig]:
        """列出所有激活的模型"""
        return [model for model in self.models.values() if model.is_active]
    
    def get_recommended_model(self, model_type: ModelType, provider: Optional[ModelProvider] = None) -> Optional[MultimodalModelConfig]:
        """获取推荐模型"""
        candidates = self.get_models_by_type(model_type)
        
        if provider:
            candidates = [m for m in candidates if m.provider == provider]
        
        if not candidates:
            return None
        
        # 根据成功率和性能选择最佳模型
        active_candidates = [m for m in candidates if m.is_active]
        if not active_candidates:
            return candidates[0]
        
        # 选择成功率最高的模型
        best_model = active_candidates[0]
        best_success_rate = 0
        
        for model in active_candidates:
            metrics = self.get_model_metrics(model.id)
            if metrics and metrics.success_rate > best_success_rate:
                best_success_rate = metrics.success_rate
                best_model = model
        
        return best_model


# 全局模型管理器实例
multimodal_manager = MultimodalModelManager()


# 预定义的模型配置
DEFAULT_MODELS = {
    "gpt-4": MultimodalModelConfig(
        id="gpt-4",
        name="GPT-4",
        provider=ModelProvider.OPENAI,
        type=ModelType.TEXT,
        model_id="gpt-4",
        api_key="",  # 需要在环境变量中设置
        base_url="https://api.openai.com/v1",
        max_tokens=4000,
        temperature=0.7,
        metadata=ModelMetadata(
            description="OpenAI GPT-4 文本生成模型",
            capabilities=["文本生成", "对话", "推理", "代码生成"],
            pricing=ModelPricing(
                input_token_price=0.03,
                output_token_price=0.06,
                currency="USD"
            )
        )
    ),
    "gpt-4-vision": MultimodalModelConfig(
        id="gpt-4-vision",
        name="GPT-4 Vision",
        provider=ModelProvider.OPENAI,
        type=ModelType.MULTIMODAL,
        model_id="gpt-4-vision-preview",
        api_key="",
        base_url="https://api.openai.com/v1",
        max_tokens=4000,
        temperature=0.7,
        metadata=ModelMetadata(
            description="OpenAI GPT-4 Vision 多模态模型",
            capabilities=["图像理解", "文本生成", "多模态对话"],
            pricing=ModelPricing(
                input_token_price=0.01,
                output_token_price=0.03,
                image_price=0.00765,
                currency="USD"
            )
        )
    ),
    "dall-e-3": MultimodalModelConfig(
        id="dall-e-3",
        name="DALL-E 3",
        provider=ModelProvider.OPENAI,
        type=ModelType.IMAGE_GENERATION,
        model_id="dall-e-3",
        api_key="",
        base_url="https://api.openai.com/v1",
        metadata=ModelMetadata(
            description="OpenAI DALL-E 3 图像生成模型",
            capabilities=["图像生成", "艺术创作"],
            pricing=ModelPricing(
                image_price=0.04,
                currency="USD"
            )
        )
    ),
    "whisper-1": MultimodalModelConfig(
        id="whisper-1",
        name="Whisper",
        provider=ModelProvider.OPENAI,
        type=ModelType.SPEECH_TO_TEXT,
        model_id="whisper-1",
        api_key="",
        base_url="https://api.openai.com/v1",
        metadata=ModelMetadata(
            description="OpenAI Whisper 语音识别模型",
            capabilities=["语音识别", "多语言支持"],
            pricing=ModelPricing(
                audio_price=0.006,
                currency="USD"
            )
        )
    ),
    "tts-1": MultimodalModelConfig(
        id="tts-1",
        name="TTS-1",
        provider=ModelProvider.OPENAI,
        type=ModelType.TEXT_TO_SPEECH,
        model_id="tts-1",
        api_key="",
        base_url="https://api.openai.com/v1",
        metadata=ModelMetadata(
            description="OpenAI TTS 语音合成模型",
            capabilities=["语音合成", "多语言支持"],
            pricing=ModelPricing(
                audio_price=0.015,
                currency="USD"
            )
        )
    )
}


def initialize_default_models():
    """初始化默认模型配置"""
    for model_config in DEFAULT_MODELS.values():
        multimodal_manager.add_model(model_config)


# 在模块加载时初始化默认模型
initialize_default_models()