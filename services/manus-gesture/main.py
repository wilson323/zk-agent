#!/usr/bin/env python3
"""
Manus手势识别服务

基于MediaPipe和TensorFlow的高性能手势识别微服务
支持实时手势检测、动作分析和3D坐标输出

Author: ZK-Agent Team
Version: 1.0.0
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Optional, Tuple

import cv2
import mediapipe as mp
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn
from prometheus_client import Counter, Histogram, generate_latest
from fastapi.responses import Response

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Prometheus指标
REQUEST_COUNT = Counter('manus_requests_total', 'Total requests', ['method', 'endpoint'])
REQUEST_DURATION = Histogram('manus_request_duration_seconds', 'Request duration')
GESTURE_DETECTION_COUNT = Counter('manus_gestures_detected_total', 'Total gestures detected', ['gesture_type'])

class GestureFrame(BaseModel):
    """手势帧数据模型"""
    frame_data: str = Field(..., description="Base64编码的图像数据")
    timestamp: float = Field(..., description="时间戳")
    frame_id: str = Field(..., description="帧ID")
    config: Optional[Dict] = Field(default={}, description="处理配置")

class GestureResult(BaseModel):
    """手势识别结果模型"""
    success: bool = Field(..., description="识别是否成功")
    gestures: List[Dict] = Field(default=[], description="检测到的手势列表")
    landmarks: Optional[List[List[float]]] = Field(default=None, description="手部关键点坐标")
    confidence: float = Field(default=0.0, description="置信度")
    processing_time: float = Field(..., description="处理时间(ms)")
    frame_id: str = Field(..., description="对应的帧ID")

class ManusGestureService:
    """Manus手势识别服务核心类"""
    
    def __init__(self):
        # 初始化MediaPipe
        self.mp_hands = mp.solutions.hands
        self.mp_drawing = mp.solutions.drawing_utils
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5
        )
        
        # 手势分类器（这里使用简单的规则，实际可以用训练好的模型）
        self.gesture_classifier = self._init_gesture_classifier()
        
        # 连接管理
        self.active_connections: List[WebSocket] = []
        
        logger.info("Manus手势识别服务初始化完成")
    
    def _init_gesture_classifier(self) -> Dict:
        """初始化手势分类器"""
        return {
            'gestures': {
                'fist': {'threshold': 0.8, 'landmarks_pattern': 'closed_fingers'},
                'open_palm': {'threshold': 0.8, 'landmarks_pattern': 'open_fingers'},
                'peace': {'threshold': 0.7, 'landmarks_pattern': 'two_fingers'},
                'thumbs_up': {'threshold': 0.7, 'landmarks_pattern': 'thumb_up'},
                'point': {'threshold': 0.7, 'landmarks_pattern': 'index_finger'},
                'ok': {'threshold': 0.6, 'landmarks_pattern': 'ok_sign'}
            }
        }
    
    async def process_frame(self, frame_data: str, config: Dict = None) -> GestureResult:
        """处理单帧图像并返回手势识别结果
        
        Args:
            frame_data: Base64编码的图像数据
            config: 处理配置参数
            
        Returns:
            GestureResult: 手势识别结果
        """
        start_time = time.time()
        
        try:
            # 解码图像
            frame = self._decode_frame(frame_data)
            if frame is None:
                return GestureResult(
                    success=False,
                    processing_time=(time.time() - start_time) * 1000,
                    frame_id=config.get('frame_id', 'unknown')
                )
            
            # MediaPipe手势检测
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.hands.process(rgb_frame)
            
            gestures = []
            all_landmarks = []
            max_confidence = 0.0
            
            if results.multi_hand_landmarks:
                for idx, hand_landmarks in enumerate(results.multi_hand_landmarks):
                    # 提取关键点坐标
                    landmarks = self._extract_landmarks(hand_landmarks)
                    all_landmarks.append(landmarks.tolist())
                    
                    # 手势分类
                    gesture_type, confidence = self._classify_gesture(landmarks)
                    
                    if confidence > 0.5:  # 置信度阈值
                        gestures.append({
                            'hand_id': idx,
                            'type': gesture_type,
                            'confidence': confidence,
                            'landmarks': landmarks.tolist(),
                            'bbox': self._calculate_bbox(landmarks),
                            'timestamp': time.time()
                        })
                        
                        max_confidence = max(max_confidence, confidence)
                        
                        # 更新Prometheus指标
                        GESTURE_DETECTION_COUNT.labels(gesture_type=gesture_type).inc()
            
            processing_time = (time.time() - start_time) * 1000
            
            return GestureResult(
                success=len(gestures) > 0,
                gestures=gestures,
                landmarks=all_landmarks,
                confidence=max_confidence,
                processing_time=processing_time,
                frame_id=config.get('frame_id', 'unknown')
            )
            
        except Exception as e:
            logger.error(f"手势识别处理错误: {e}")
            return GestureResult(
                success=False,
                processing_time=(time.time() - start_time) * 1000,
                frame_id=config.get('frame_id', 'unknown')
            )
    
    def _decode_frame(self, frame_data: str) -> Optional[np.ndarray]:
        """解码Base64图像数据"""
        try:
            import base64
            # 移除data:image前缀
            if ',' in frame_data:
                frame_data = frame_data.split(',')[1]
            
            # Base64解码
            img_data = base64.b64decode(frame_data)
            
            # 转换为numpy数组
            nparr = np.frombuffer(img_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            return frame
        except Exception as e:
            logger.error(f"图像解码错误: {e}")
            return None
    
    def _extract_landmarks(self, hand_landmarks) -> np.ndarray:
        """提取手部关键点坐标"""
        landmarks = []
        for landmark in hand_landmarks.landmark:
            landmarks.extend([landmark.x, landmark.y, landmark.z])
        return np.array(landmarks)
    
    def _classify_gesture(self, landmarks: np.ndarray) -> Tuple[str, float]:
        """基于关键点坐标分类手势
        
        这里实现简单的规则分类，实际项目中可以使用训练好的ML模型
        """
        try:
            # 重塑为21个关键点，每个3个坐标
            points = landmarks.reshape(21, 3)
            
            # 计算手指状态（简化版本）
            finger_states = self._analyze_finger_states(points)
            
            # 基于手指状态判断手势
            if all(not state for state in finger_states):  # 所有手指弯曲
                return 'fist', 0.9
            elif all(finger_states):  # 所有手指伸直
                return 'open_palm', 0.9
            elif finger_states[1] and finger_states[2] and not any(finger_states[3:]):  # 食指中指伸直
                return 'peace', 0.8
            elif finger_states[0] and not any(finger_states[1:]):  # 只有拇指伸直
                return 'thumbs_up', 0.8
            elif finger_states[1] and not any(finger_states[2:]) and not finger_states[0]:  # 只有食指伸直
                return 'point', 0.8
            else:
                return 'unknown', 0.3
                
        except Exception as e:
            logger.error(f"手势分类错误: {e}")
            return 'unknown', 0.0
    
    def _analyze_finger_states(self, points: np.ndarray) -> List[bool]:
        """分析手指状态（伸直/弯曲）
        
        简化版本，实际实现需要更复杂的几何计算
        """
        # MediaPipe手部关键点索引
        finger_tips = [4, 8, 12, 16, 20]  # 拇指、食指、中指、无名指、小指尖端
        finger_pips = [3, 6, 10, 14, 18]  # 对应的PIP关节
        
        finger_states = []
        
        for tip, pip in zip(finger_tips, finger_pips):
            # 简单判断：如果指尖y坐标小于PIP关节，认为手指伸直
            is_extended = points[tip][1] < points[pip][1]
            finger_states.append(is_extended)
        
        return finger_states
    
    def _calculate_bbox(self, landmarks: np.ndarray) -> Dict[str, float]:
        """计算手部边界框"""
        points = landmarks.reshape(21, 3)
        x_coords = points[:, 0]
        y_coords = points[:, 1]
        
        return {
            'x_min': float(np.min(x_coords)),
            'y_min': float(np.min(y_coords)),
            'x_max': float(np.max(x_coords)),
            'y_max': float(np.max(y_coords)),
            'width': float(np.max(x_coords) - np.min(x_coords)),
            'height': float(np.max(y_coords) - np.min(y_coords))
        }
    
    async def add_connection(self, websocket: WebSocket):
        """添加WebSocket连接"""
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"新的WebSocket连接，当前连接数: {len(self.active_connections)}")
    
    def remove_connection(self, websocket: WebSocket):
        """移除WebSocket连接"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket连接断开，当前连接数: {len(self.active_connections)}")
    
    async def broadcast_result(self, result: GestureResult):
        """广播结果到所有连接的客户端"""
        if self.active_connections:
            message = result.model_dump_json()
            disconnected = []
            
            for connection in self.active_connections:
                try:
                    await connection.send_text(message)
                except:
                    disconnected.append(connection)
            
            # 清理断开的连接
            for connection in disconnected:
                self.remove_connection(connection)

# 创建服务实例
gesture_service = ManusGestureService()

# 创建FastAPI应用
app = FastAPI(
    title="Manus手势识别服务",
    description="基于MediaPipe的实时手势识别微服务",
    version="1.0.0"
)

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应该限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """健康检查端点"""
    return {
        "service": "Manus手势识别服务",
        "status": "running",
        "version": "1.0.0",
        "active_connections": len(gesture_service.active_connections)
    }

@app.get("/health")
async def health_check():
    """详细健康检查"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "service_info": {
            "name": "manus-gesture-service",
            "version": "1.0.0",
            "mediapipe_version": mp.__version__
        },
        "metrics": {
            "active_connections": len(gesture_service.active_connections),
            "total_requests": REQUEST_COUNT._value._value
        }
    }

@app.get("/metrics")
async def metrics():
    """Prometheus指标端点"""
    return Response(generate_latest(), media_type="text/plain")

@app.post("/recognize", response_model=GestureResult)
async def recognize_gesture(frame: GestureFrame):
    """单帧手势识别API"""
    REQUEST_COUNT.labels(method="POST", endpoint="/recognize").inc()
    
    with REQUEST_DURATION.time():
        result = await gesture_service.process_frame(
            frame.frame_data,
            {"frame_id": frame.frame_id, **frame.config}
        )
    
    return result

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket实时手势识别"""
    await gesture_service.add_connection(websocket)
    
    try:
        while True:
            # 接收客户端数据
            data = await websocket.receive_text()
            frame_data = json.loads(data)
            
            # 处理手势识别
            result = await gesture_service.process_frame(
                frame_data.get("frame_data"),
                frame_data.get("config", {})
            )
            
            # 发送结果
            await websocket.send_text(result.model_dump_json())
            
    except WebSocketDisconnect:
        gesture_service.remove_connection(websocket)
    except Exception as e:
        logger.error(f"WebSocket错误: {e}")
        gesture_service.remove_connection(websocket)

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )