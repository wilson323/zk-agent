#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Prometheus监控服务

使用Prometheus和Grafana替代自定义连接池分析器，
提供系统性能监控、指标收集和告警功能。
"""

import time
import asyncio
import psutil
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum

from prometheus_client import (
    Counter, Histogram, Gauge, Summary, Info,
    CollectorRegistry, generate_latest, CONTENT_TYPE_LATEST,
    start_http_server, push_to_gateway
)
from prometheus_client.exposition import MetricsHandler

from app.utils.logger import get_logger
from app.core.config import settings

logger = get_logger()


class MetricType(Enum):
    """指标类型"""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    SUMMARY = "summary"
    INFO = "info"


class AlertLevel(Enum):
    """告警级别"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class MetricConfig:
    """指标配置"""
    name: str
    description: str
    metric_type: MetricType
    labels: List[str] = field(default_factory=list)
    buckets: Optional[List[float]] = None  # 用于Histogram
    quantiles: Optional[Dict[float, float]] = None  # 用于Summary


@dataclass
class AlertRule:
    """告警规则"""
    name: str
    metric_name: str
    condition: str  # 告警条件表达式
    threshold: float
    level: AlertLevel
    duration: timedelta = timedelta(minutes=5)
    description: str = ""
    enabled: bool = True


@dataclass
class AlertEvent:
    """告警事件"""
    rule_name: str
    metric_name: str
    current_value: float
    threshold: float
    level: AlertLevel
    message: str
    timestamp: datetime
    labels: Dict[str, str] = field(default_factory=dict)
    resolved: bool = False


class PrometheusMonitoringService:
    """Prometheus监控服务"""
    
    def __init__(self, 
                 registry: Optional[CollectorRegistry] = None,
                 push_gateway_url: Optional[str] = None,
                 job_name: str = "zk-agent"):
        self.registry = registry or CollectorRegistry()
        self.push_gateway_url = push_gateway_url
        self.job_name = job_name
        
        # 指标存储
        self.metrics: Dict[str, Any] = {}
        self.metric_configs: Dict[str, MetricConfig] = {}
        
        # 告警相关
        self.alert_rules: Dict[str, AlertRule] = {}
        self.active_alerts: Dict[str, AlertEvent] = {}
        self.alert_callbacks: List[Callable[[AlertEvent], None]] = []
        
        # 监控状态
        self.is_running = False
        self.monitoring_task: Optional[asyncio.Task] = None
        
        # 初始化默认指标
        self._initialize_default_metrics()
        
        logger.info("Prometheus监控服务初始化完成")
    
    def _initialize_default_metrics(self):
        """初始化默认指标"""
        default_metrics = [
            # 系统指标
            MetricConfig(
                name="system_cpu_usage_percent",
                description="系统CPU使用率",
                metric_type=MetricType.GAUGE
            ),
            MetricConfig(
                name="system_memory_usage_bytes",
                description="系统内存使用量",
                metric_type=MetricType.GAUGE
            ),
            MetricConfig(
                name="system_disk_usage_bytes",
                description="系统磁盘使用量",
                metric_type=MetricType.GAUGE,
                labels=["device", "mountpoint"]
            ),
            
            # 应用指标
            MetricConfig(
                name="http_requests_total",
                description="HTTP请求总数",
                metric_type=MetricType.COUNTER,
                labels=["method", "endpoint", "status_code"]
            ),
            MetricConfig(
                name="http_request_duration_seconds",
                description="HTTP请求持续时间",
                metric_type=MetricType.HISTOGRAM,
                labels=["method", "endpoint"],
                buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
            ),
            
            # 数据库指标
            MetricConfig(
                name="database_connections_active",
                description="活跃数据库连接数",
                metric_type=MetricType.GAUGE,
                labels=["database", "pool"]
            ),
            MetricConfig(
                name="database_query_duration_seconds",
                description="数据库查询持续时间",
                metric_type=MetricType.HISTOGRAM,
                labels=["database", "operation"],
                buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5]
            ),
            
            # AI/ML指标
            MetricConfig(
                name="ai_model_inference_duration_seconds",
                description="AI模型推理时间",
                metric_type=MetricType.HISTOGRAM,
                labels=["model", "task_type"],
                buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0]
            ),
            MetricConfig(
                name="ai_token_usage_total",
                description="AI令牌使用总数",
                metric_type=MetricType.COUNTER,
                labels=["model", "type"]  # type: input/output
            ),
            
            # 工作流指标
            MetricConfig(
                name="workflow_executions_total",
                description="工作流执行总数",
                metric_type=MetricType.COUNTER,
                labels=["workflow_type", "status"]
            ),
            MetricConfig(
                name="workflow_execution_duration_seconds",
                description="工作流执行时间",
                metric_type=MetricType.HISTOGRAM,
                labels=["workflow_type"],
                buckets=[1.0, 5.0, 10.0, 30.0, 60.0, 300.0, 600.0]
            ),
            
            # 智能体指标
            MetricConfig(
                name="agent_conversations_active",
                description="活跃智能体对话数",
                metric_type=MetricType.GAUGE,
                labels=["agent_id", "agent_type"]
            ),
            MetricConfig(
                name="agent_response_time_seconds",
                description="智能体响应时间",
                metric_type=MetricType.HISTOGRAM,
                labels=["agent_id", "agent_type"],
                buckets=[0.5, 1.0, 2.0, 5.0, 10.0, 20.0]
            )
        ]
        
        for config in default_metrics:
            self.register_metric(config)
    
    def register_metric(self, config: MetricConfig) -> Any:
        """注册指标"""
        if config.name in self.metrics:
            logger.warning(f"指标 {config.name} 已存在，跳过注册")
            return self.metrics[config.name]
        
        try:
            if config.metric_type == MetricType.COUNTER:
                metric = Counter(
                    config.name,
                    config.description,
                    config.labels,
                    registry=self.registry
                )
            elif config.metric_type == MetricType.GAUGE:
                metric = Gauge(
                    config.name,
                    config.description,
                    config.labels,
                    registry=self.registry
                )
            elif config.metric_type == MetricType.HISTOGRAM:
                metric = Histogram(
                    config.name,
                    config.description,
                    config.labels,
                    buckets=config.buckets,
                    registry=self.registry
                )
            elif config.metric_type == MetricType.SUMMARY:
                metric = Summary(
                    config.name,
                    config.description,
                    config.labels,
                    registry=self.registry
                )
            elif config.metric_type == MetricType.INFO:
                metric = Info(
                    config.name,
                    config.description,
                    registry=self.registry
                )
            else:
                raise ValueError(f"不支持的指标类型: {config.metric_type}")
            
            self.metrics[config.name] = metric
            self.metric_configs[config.name] = config
            
            logger.info(f"注册指标: {config.name} ({config.metric_type.value})")
            return metric
            
        except Exception as e:
            logger.error(f"注册指标失败 {config.name}: {e}")
            raise
    
    def get_metric(self, name: str) -> Optional[Any]:
        """获取指标"""
        return self.metrics.get(name)
    
    def increment_counter(self, name: str, labels: Optional[Dict[str, str]] = None, value: float = 1.0):
        """增加计数器"""
        metric = self.get_metric(name)
        if metric and hasattr(metric, 'inc'):
            if labels:
                metric.labels(**labels).inc(value)
            else:
                metric.inc(value)
    
    def set_gauge(self, name: str, value: float, labels: Optional[Dict[str, str]] = None):
        """设置仪表盘值"""
        metric = self.get_metric(name)
        if metric and hasattr(metric, 'set'):
            if labels:
                metric.labels(**labels).set(value)
            else:
                metric.set(value)
    
    def observe_histogram(self, name: str, value: float, labels: Optional[Dict[str, str]] = None):
        """观察直方图值"""
        metric = self.get_metric(name)
        if metric and hasattr(metric, 'observe'):
            if labels:
                metric.labels(**labels).observe(value)
            else:
                metric.observe(value)
    
    def time_histogram(self, name: str, labels: Optional[Dict[str, str]] = None):
        """计时装饰器"""
        def decorator(func):
            def wrapper(*args, **kwargs):
                start_time = time.time()
                try:
                    result = func(*args, **kwargs)
                    return result
                finally:
                    duration = time.time() - start_time
                    self.observe_histogram(name, duration, labels)
            return wrapper
        return decorator
    
    def add_alert_rule(self, rule: AlertRule):
        """添加告警规则"""
        self.alert_rules[rule.name] = rule
        logger.info(f"添加告警规则: {rule.name}")
    
    def remove_alert_rule(self, rule_name: str):
        """移除告警规则"""
        if rule_name in self.alert_rules:
            del self.alert_rules[rule_name]
            logger.info(f"移除告警规则: {rule_name}")
    
    def add_alert_callback(self, callback: Callable[[AlertEvent], None]):
        """添加告警回调"""
        self.alert_callbacks.append(callback)
    
    def _check_alert_rules(self):
        """检查告警规则"""
        for rule_name, rule in self.alert_rules.items():
            if not rule.enabled:
                continue
            
            try:
                # 获取指标当前值
                metric = self.get_metric(rule.metric_name)
                if not metric:
                    continue
                
                # 简单的阈值检查（实际应用中可能需要更复杂的逻辑）
                current_value = self._get_metric_value(metric)
                
                # 检查告警条件
                is_alerting = self._evaluate_condition(rule.condition, current_value, rule.threshold)
                
                if is_alerting and rule_name not in self.active_alerts:
                    # 触发新告警
                    alert = AlertEvent(
                        rule_name=rule_name,
                        metric_name=rule.metric_name,
                        current_value=current_value,
                        threshold=rule.threshold,
                        level=rule.level,
                        message=f"{rule.description or rule_name}: {current_value} {rule.condition} {rule.threshold}",
                        timestamp=datetime.now()
                    )
                    
                    self.active_alerts[rule_name] = alert
                    self._trigger_alert(alert)
                    
                elif not is_alerting and rule_name in self.active_alerts:
                    # 解决告警
                    alert = self.active_alerts[rule_name]
                    alert.resolved = True
                    self._resolve_alert(alert)
                    del self.active_alerts[rule_name]
                    
            except Exception as e:
                logger.error(f"检查告警规则失败 {rule_name}: {e}")
    
    def _get_metric_value(self, metric) -> float:
        """获取指标值（简化实现）"""
        # 这里需要根据实际的Prometheus客户端API来实现
        # 这是一个简化的示例
        try:
            if hasattr(metric, '_value'):
                return float(metric._value._value)
            return 0.0
        except:
            return 0.0
    
    def _evaluate_condition(self, condition: str, current_value: float, threshold: float) -> bool:
        """评估告警条件"""
        if condition == ">":
            return current_value > threshold
        elif condition == "<":
            return current_value < threshold
        elif condition == ">=":
            return current_value >= threshold
        elif condition == "<=":
            return current_value <= threshold
        elif condition == "==":
            return abs(current_value - threshold) < 0.001
        else:
            return False
    
    def _trigger_alert(self, alert: AlertEvent):
        """触发告警"""
        logger.warning(f"告警触发: {alert.message}")
        
        for callback in self.alert_callbacks:
            try:
                callback(alert)
            except Exception as e:
                logger.error(f"告警回调执行失败: {e}")
    
    def _resolve_alert(self, alert: AlertEvent):
        """解决告警"""
        logger.info(f"告警解决: {alert.rule_name}")
        
        # 可以添加告警解决的回调
    
    async def _collect_system_metrics(self):
        """收集系统指标"""
        try:
            # CPU使用率
            cpu_percent = psutil.cpu_percent(interval=1)
            self.set_gauge("system_cpu_usage_percent", cpu_percent)
            
            # 内存使用
            memory = psutil.virtual_memory()
            self.set_gauge("system_memory_usage_bytes", memory.used)
            
            # 磁盘使用
            for partition in psutil.disk_partitions():
                try:
                    usage = psutil.disk_usage(partition.mountpoint)
                    self.set_gauge(
                        "system_disk_usage_bytes",
                        usage.used,
                        {"device": partition.device, "mountpoint": partition.mountpoint}
                    )
                except PermissionError:
                    continue
                    
        except Exception as e:
            logger.error(f"收集系统指标失败: {e}")
    
    async def _monitoring_loop(self):
        """监控循环"""
        while self.is_running:
            try:
                # 收集系统指标
                await self._collect_system_metrics()
                
                # 检查告警规则
                self._check_alert_rules()
                
                # 推送到Push Gateway（如果配置了）
                if self.push_gateway_url:
                    try:
                        push_to_gateway(
                            self.push_gateway_url,
                            job=self.job_name,
                            registry=self.registry
                        )
                    except Exception as e:
                        logger.error(f"推送指标到Gateway失败: {e}")
                
                # 等待下一次收集
                await asyncio.sleep(30)  # 30秒收集一次
                
            except Exception as e:
                logger.error(f"监控循环错误: {e}")
                await asyncio.sleep(5)
    
    async def start_monitoring(self, port: int = 8000):
        """启动监控服务"""
        if self.is_running:
            logger.warning("监控服务已在运行")
            return
        
        self.is_running = True
        
        # 启动HTTP服务器暴露指标
        try:
            start_http_server(port, registry=self.registry)
            logger.info(f"Prometheus指标服务器启动在端口 {port}")
        except Exception as e:
            logger.error(f"启动指标服务器失败: {e}")
        
        # 启动监控循环
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())
        logger.info("监控服务启动完成")
    
    async def stop_monitoring(self):
        """停止监控服务"""
        self.is_running = False
        
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
        
        logger.info("监控服务已停止")
    
    def get_metrics_text(self) -> str:
        """获取指标文本格式"""
        return generate_latest(self.registry).decode('utf-8')
    
    def get_active_alerts(self) -> List[AlertEvent]:
        """获取活跃告警"""
        return list(self.active_alerts.values())
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """获取指标摘要"""
        return {
            "total_metrics": len(self.metrics),
            "active_alerts": len(self.active_alerts),
            "alert_rules": len(self.alert_rules),
            "monitoring_status": "running" if self.is_running else "stopped",
            "registry_info": {
                "collectors": len(self.registry._collector_to_names),
                "names_to_collectors": len(self.registry._names_to_collectors)
            }
        }


# 全局监控服务实例
monitoring_service = PrometheusMonitoringService(
    push_gateway_url=getattr(settings, 'PROMETHEUS_PUSH_GATEWAY_URL', None),
    job_name=getattr(settings, 'PROMETHEUS_JOB_NAME', 'zk-agent')
)


# 便捷函数
def get_monitoring_service() -> PrometheusMonitoringService:
    """获取监控服务实例"""
    return monitoring_service


def track_http_request(method: str, endpoint: str, status_code: int, duration: float):
    """跟踪HTTP请求"""
    labels = {"method": method, "endpoint": endpoint, "status_code": str(status_code)}
    monitoring_service.increment_counter("http_requests_total", labels)
    monitoring_service.observe_histogram("http_request_duration_seconds", duration, 
                                       {"method": method, "endpoint": endpoint})


def track_database_query(database: str, operation: str, duration: float):
    """跟踪数据库查询"""
    labels = {"database": database, "operation": operation}
    monitoring_service.observe_histogram("database_query_duration_seconds", duration, labels)


def track_ai_inference(model: str, task_type: str, duration: float, input_tokens: int, output_tokens: int):
    """跟踪AI推理"""
    labels = {"model": model, "task_type": task_type}
    monitoring_service.observe_histogram("ai_model_inference_duration_seconds", duration, labels)
    monitoring_service.increment_counter("ai_token_usage_total", 
                                       {"model": model, "type": "input"}, input_tokens)
    monitoring_service.increment_counter("ai_token_usage_total", 
                                       {"model": model, "type": "output"}, output_tokens)


def track_workflow_execution(workflow_type: str, status: str, duration: float):
    """跟踪工作流执行"""
    labels = {"workflow_type": workflow_type, "status": status}
    monitoring_service.increment_counter("workflow_executions_total", labels)
    monitoring_service.observe_histogram("workflow_execution_duration_seconds", duration, 
                                       {"workflow_type": workflow_type})


def track_agent_conversation(agent_id: str, agent_type: str, active_count: int, response_time: float):
    """跟踪智能体对话"""
    labels = {"agent_id": agent_id, "agent_type": agent_type}
    monitoring_service.set_gauge("agent_conversations_active", active_count, labels)
    monitoring_service.observe_histogram("agent_response_time_seconds", response_time, labels)


# 默认告警规则
DEFAULT_ALERT_RULES = [
    AlertRule(
        name="high_cpu_usage",
        metric_name="system_cpu_usage_percent",
        condition=">",
        threshold=80.0,
        level=AlertLevel.WARNING,
        description="CPU使用率过高"
    ),
    AlertRule(
        name="high_memory_usage",
        metric_name="system_memory_usage_bytes",
        condition=">",
        threshold=8 * 1024 * 1024 * 1024,  # 8GB
        level=AlertLevel.WARNING,
        description="内存使用量过高"
    ),
    AlertRule(
        name="slow_http_requests",
        metric_name="http_request_duration_seconds",
        condition=">",
        threshold=5.0,
        level=AlertLevel.WARNING,
        description="HTTP请求响应时间过长"
    )
]


# 初始化默认告警规则
for rule in DEFAULT_ALERT_RULES:
    monitoring_service.add_alert_rule(rule)