// @ts-nocheck
/**
 * 智能设备识别引擎
 * 基于CAD图纸自动识别安防设备
 */

import type { CADFileMetadata, CADEntity } from "./cad-file-processor"
import type { DeviceInfo } from "@/types/cad"

export interface DevicePattern {
  id: string
  name: string
  category: string
  type: string
  patterns: {
    geometric: GeometricPattern[]
    textual: TextualPattern[]
    contextual: ContextualPattern[]
  }
  confidence: number
}

export interface GeometricPattern {
  shape: "circle" | "rectangle" | "polygon" | "complex"
  dimensions?: {
    width?: number
    height?: number
    radius?: number
  }
  tolerance: number
}

export interface TextualPattern {
  keywords: string[]
  regex?: string
  layer?: string
  proximity?: number
}

export interface ContextualPattern {
  nearbyDevices?: string[]
  layerContext?: string[]
  locationContext?: string[]
}

export class DeviceRecognitionEngine {
  private devicePatterns: DevicePattern[] = []

  constructor() {
    this.initializeDevicePatterns()
  }

  /**
   * 识别CAD图纸中的设备
   */
  async recognizeDevices(metadata: CADFileMetadata): Promise<DeviceInfo[]> {
    const devices: DeviceInfo[] = []

    // 1. 基于几何形状识别
    const geometricDevices = await this.recognizeByGeometry(metadata.entities)
    devices.push(...geometricDevices)

    // 2. 基于文本标注识别
    const textualDevices = await this.recognizeByText(metadata.entities)
    devices.push(...textualDevices)

    // 3. 基于图层信息识别
    const layerDevices = await this.recognizeByLayer(metadata.entities, metadata.layers)
    devices.push(...layerDevices)

    // 4. 基于块定义识别
    const blockDevices = await this.recognizeByBlocks(metadata.blocks)
    devices.push(...blockDevices)

    // 5. 去重和合并
    const uniqueDevices = this.deduplicateDevices(devices)

    // 6. 增强设备信息
    const enhancedDevices = await this.enhanceDeviceInfo(uniqueDevices, metadata)

    return enhancedDevices
  }

  /**
   * AI增强的设备识别
   */
  async recognizeDevicesWithAI(metadata: CADFileMetadata): Promise<DeviceInfo[]> {
    const baseDevices = await this.recognizeDevices(metadata)

    // 使用AI模型进行二次验证和增强
    const enhancedDevices = await this.enhanceWithAI(baseDevices, metadata)

    // 智能分组和关联分析
    const groupedDevices = this.intelligentGrouping(enhancedDevices)

    // 预测性分析
    const predictiveInsights = await this.generatePredictiveInsights(groupedDevices)

    return groupedDevices.map((device) => ({
      ...device,
      aiConfidence: this.calculateAIConfidence(device),
      predictiveInsights: predictiveInsights.get(device.id),
    }))
  }

  /**
   * 基于几何形状识别设备
   */
  private async recognizeByGeometry(entities: CADEntity[]): Promise<DeviceInfo[]> {
    const devices: DeviceInfo[] = []

    for (const entity of entities) {
      for (const pattern of this.devicePatterns) {
        for (const geoPattern of pattern.patterns.geometric) {
          if (this.matchGeometricPattern(entity, geoPattern)) {
            const device = this.createDeviceFromPattern(entity, pattern)
            if (device) {
              devices.push(device)
            }
          }
        }
      }
    }

    return devices
  }

  /**
   * 基于文本标注识别设备
   */
  private async recognizeByText(entities: CADEntity[]): Promise<DeviceInfo[]> {
    const devices: DeviceInfo[] = []
    const textEntities = entities.filter((e) => e.type === "TEXT" || e.type === "MTEXT")

    for (const textEntity of textEntities) {
      const text = textEntity.properties.content || ""

      for (const pattern of this.devicePatterns) {
        for (const textPattern of pattern.patterns.textual) {
          if (this.matchTextualPattern(text, textPattern)) {
            // 查找附近的几何实体
            const nearbyEntities = this.findNearbyEntities(textEntity, entities, 100)
            for (const nearbyEntity of nearbyEntities) {
              const device = this.createDeviceFromPattern(nearbyEntity, pattern)
              if (device) {
                device.name = text.trim()
                devices.push(device)
              }
            }
          }
        }
      }
    }

    return devices
  }

  /**
   * 基于图层信息识别设备
   */
  private async recognizeByLayer(entities: CADEntity[], layers: any[]): Promise<DeviceInfo[]> {
    const devices: DeviceInfo[] = []
    const securityLayers = layers.filter(
      (layer) =>
        layer.name.includes("安防") ||
        layer.name.includes("监控") ||
        layer.name.includes("security") ||
        layer.name.includes("camera"),
    )

    for (const layer of securityLayers) {
      const layerEntities = entities.filter((e) => e.layer === layer.name)

      for (const entity of layerEntities) {
        const device = this.inferDeviceFromLayer(entity, layer.name)
        if (device) {
          devices.push(device)
        }
      }
    }

    return devices
  }

  /**
   * 基于块定义识别设备
   */
  private async recognizeByBlocks(blocks: any[]): Promise<DeviceInfo[]> {
    const devices: DeviceInfo[] = []

    for (const block of blocks) {
      const pattern = this.findPatternByBlockName(block.name)
      if (pattern) {
        const device: DeviceInfo = {
          id: `block_${block.name}_${Date.now()}`,
          name: block.name,
          category: pattern.category,
          type: pattern.type,
          specifications: this.getDefaultSpecifications(pattern),
          location: {
            x: block.basePoint.x,
            y: block.basePoint.y,
            z: block.basePoint.z,
          },
          connections: {
            input: [],
            output: [],
            control: [],
          },
          status: "active",
        }
        devices.push(device)
      }
    }

    return devices
  }

  /**
   * 匹配几何图案
   */
  private matchGeometricPattern(entity: CADEntity, pattern: GeometricPattern): boolean {
    if (entity.type === "CIRCLE" && pattern.shape === "circle") {
      const radius = entity.geometry.radius
      const expectedRadius = pattern.dimensions?.radius
      if (expectedRadius) {
        const tolerance = pattern.tolerance
        return Math.abs(radius - expectedRadius) <= tolerance
      }
    }

    if (entity.type === "RECTANGLE" && pattern.shape === "rectangle") {
      const width = entity.geometry.width
      const height = entity.geometry.height
      const expectedWidth = pattern.dimensions?.width
      const expectedHeight = pattern.dimensions?.height

      if (expectedWidth && expectedHeight) {
        const tolerance = pattern.tolerance
        return Math.abs(width - expectedWidth) <= tolerance && Math.abs(height - expectedHeight) <= tolerance
      }
    }

    return false
  }

  /**
   * 匹配文本图案
   */
  private matchTextualPattern(text: string, pattern: TextualPattern): boolean {
    const lowerText = text.toLowerCase()

    // 关键词匹配
    for (const keyword of pattern.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return true
      }
    }

    // 正则表达式匹配
    if (pattern.regex) {
      const regex = new RegExp(pattern.regex, "i")
      return regex.test(text)
    }

    return false
  }

  /**
   * 查找附近的实体
   */
  private findNearbyEntities(centerEntity: CADEntity, entities: CADEntity[], radius: number): CADEntity[] {
    const centerPos = this.getEntityPosition(centerEntity)
    if (!centerPos) {return []}

    return entities.filter((entity) => {
      const pos = this.getEntityPosition(entity)
      if (!pos) {return false}

      const distance = Math.sqrt(Math.pow(pos.x - centerPos.x, 2) + Math.pow(pos.y - centerPos.y, 2))
      return distance <= radius && entity.id !== centerEntity.id
    })
  }

  /**
   * 获取实体位置
   */
  private getEntityPosition(entity: CADEntity): { x: number; y: number } | null {
    switch (entity.type) {
      case "CIRCLE":
        return entity.geometry.center
      case "RECTANGLE":
        return entity.geometry.center || { x: 0, y: 0 }
      case "TEXT":
      case "MTEXT":
        return entity.geometry.position
      default:
        return null
    }
  }

  /**
   * 从图层推断设备类型
   */
  private inferDeviceFromLayer(entity: CADEntity, layerName: string): DeviceInfo | null {
    const lowerLayerName = layerName.toLowerCase()

    if (lowerLayerName.includes("摄像头") || lowerLayerName.includes("camera")) {
      return this.createCameraDevice(entity)
    }

    if (lowerLayerName.includes("门禁") || lowerLayerName.includes("access")) {
      return this.createAccessControlDevice(entity)
    }

    if (lowerLayerName.includes("报警") || lowerLayerName.includes("alarm")) {
      return this.createAlarmDevice(entity)
    }

    return null
  }

  /**
   * 创建摄像头设备
   */
  private createCameraDevice(entity: CADEntity): DeviceInfo {
    const position = this.getEntityPosition(entity) || { x: 0, y: 0 }

    return {
      id: `camera_${entity.id}`,
      name: "网络摄像头",
      category: "surveillance",
      type: "ip_camera",
      specifications: {
        resolution: "4K",
        nightVision: "true",
        weatherproof: "IP67",
        powerConsumption: "12W",
      },
      location: {
        x: position.x,
        y: position.y,
        z: 3000, // 默认3米高度
      },
      connections: {
        input: ["power", "network"],
        output: ["video", "audio"],
        control: ["ptz"],
      },
      status: "active",
    }
  }

  /**
   * 创建门禁设备
   */
  private createAccessControlDevice(entity: CADEntity): DeviceInfo {
    const position = this.getEntityPosition(entity) || { x: 0, y: 0 }

    return {
      id: `access_${entity.id}`,
      name: "门禁控制器",
      category: "access_control",
      type: "card_reader",
      specifications: {
        cardType: "IC/ID",
        capacity: "10000",
        communication: "TCP/IP",
      },
      location: {
        x: position.x,
        y: position.y,
        z: 1500, // 默认1.5米高度
      },
      connections: {
        input: ["power", "network"],
        output: ["relay", "wiegand"],
        control: ["door_lock"],
      },
      status: "active",
    }
  }

  /**
   * 创建报警设备
   */
  private createAlarmDevice(entity: CADEntity): DeviceInfo {
    const position = this.getEntityPosition(entity) || { x: 0, y: 0 }

    return {
      id: `alarm_${entity.id}`,
      name: "报警探测器",
      category: "alarm_system",
      type: "motion_detector",
      specifications: {
        detectionRange: "12m",
        detectionAngle: "110°",
        sensitivity: "adjustable",
      },
      location: {
        x: position.x,
        y: position.y,
        z: 2500, // 默认2.5米高度
      },
      connections: {
        input: ["power"],
        output: ["alarm_signal"],
        control: ["sensitivity_control"],
      },
      status: "active",
    }
  }

  /**
   * 从模式创建设备
   */
  private createDeviceFromPattern(entity: CADEntity, pattern: DevicePattern): DeviceInfo | null {
    const position = this.getEntityPosition(entity)
    if (!position) {return null}

    return {
      id: `${pattern.type}_${entity.id}`,
      name: pattern.name,
      category: pattern.category,
      type: pattern.type,
      specifications: this.getDefaultSpecifications(pattern),
      location: {
        x: position.x,
        y: position.y,
        z: this.getDefaultHeight(pattern.category),
      },
      connections: {
        input: [],
        output: [],
        control: [],
      },
      status: "active",
    }
  }

  /**
   * 去重设备
   */
  private deduplicateDevices(devices: DeviceInfo[]): DeviceInfo[] {
    const uniqueDevices: DeviceInfo[] = []
    const seenPositions = new Set<string>()

    for (const device of devices) {
      const posKey = `${Math.round(device.location.x)}_${Math.round(device.location.y)}_${device.category}`

      if (!seenPositions.has(posKey)) {
        seenPositions.add(posKey)
        uniqueDevices.push(device)
      }
    }

    return uniqueDevices
  }

  /**
   * 增强设备信息
   */
  private async enhanceDeviceInfo(devices: DeviceInfo[], metadata: CADFileMetadata): Promise<DeviceInfo[]> {
    for (const device of devices) {
      // 添加安装日期
      device.installDate = new Date()

      // 添加保修期
      device.warrantyExpiry = new Date()
      device.warrantyExpiry.setFullYear(device.warrantyExpiry.getFullYear() + 3)

      // 根据位置推断房间信息
      device.location.room = this.inferRoom(device.location, metadata)
      device.location.zone = this.inferZone(device.location, metadata)
    }

    return devices
  }

  /**
   * 智能设备分组
   */
  private intelligentGrouping(devices: DeviceInfo[]): DeviceInfo[] {
    // 基于位置、类型、功能进行智能分组
    const groups = new Map<string, DeviceInfo[]>()

    devices.forEach((device) => {
      const groupKey = this.generateGroupKey(device)
      if (!groups.has(groupKey)) {
        groups.set(groupKey, [])
      }
      groups.get(groupKey)!.push(device)
    })

    // 为每个设备添加分组信息
    return devices.map((device) => ({
      ...device,
      groupId: this.generateGroupKey(device),
      relatedDevices: this.findRelatedDevices(device, devices),
    }))
  }

  /**
   * 计算AI置信度
   */
  private calculateAIConfidence(device: DeviceInfo): number {
    let confidence = 0.5 // 基础置信度

    // 基于几何匹配度
    if (device.geometricMatch) {confidence += 0.2}

    // 基于文本匹配度
    if (device.textualMatch) {confidence += 0.2}

    // 基于上下文匹配度
    if (device.contextualMatch) {confidence += 0.1}

    return Math.min(confidence, 1.0)
  }

  /**
   * 生成预测性洞察
   */
  private async generatePredictiveInsights(devices: DeviceInfo[]): Promise<Map<string, any>> {
    const insights = new Map<string, any>()

    devices.forEach((device) => {
      const insight = {
        maintenanceSchedule: this.predictMaintenanceSchedule(device),
        riskFactors: this.identifyRiskFactors(device),
        optimizationSuggestions: this.generateOptimizationSuggestions(device),
        compatibilityAnalysis: this.analyzeCompatibility(device, devices),
      }

      insights.set(device.id, insight)
    })

    return insights
  }

  /**
   * 推断房间信息
   */
  private inferRoom(location: { x: number; y: number; z: number }, metadata: CADFileMetadata): string {
    // 简化的房间推断逻辑
    if (location.x < 5000 && location.y < 5000) {
      return "入口大厅"
    } else if (location.x > 15000) {
      return "办公区域"
    } else {
      return "公共区域"
    }
  }

  /**
   * 推断区域信息
   */
  private inferZone(location: { x: number; y: number; z: number }, metadata: CADFileMetadata): string {
    if (location.x < 10000) {
      return "A区"
    } else {
      return "B区"
    }
  }

  /**
   * 根据块名查找模式
   */
  private findPatternByBlockName(blockName: string): DevicePattern | null {
    return this.devicePatterns.find((pattern) =>
      pattern.patterns.textual.some((textPattern) =>
        textPattern.keywords.some((keyword) => blockName.toLowerCase().includes(keyword.toLowerCase())),
      ),
    )
  }

  /**
   * 获取默认规格
   */
  private getDefaultSpecifications(pattern: DevicePattern): Record<string, any> {
    switch (pattern.category) {
      case "surveillance":
        return {
          resolution: "1080P",
          nightVision: true,
          weatherproof: "IP65",
        }
      case "access_control":
        return {
          cardType: "IC",
          capacity: "5000",
          communication: "RS485",
        }
      case "alarm_system":
        return {
          detectionRange: "10m",
          sensitivity: "medium",
        }
      default:
        return {}
    }
  }

  /**
   * 获取默认安装高度
   */
  private getDefaultHeight(category: string): number {
    switch (category) {
      case "surveillance":
        return 3000 // 3米
      case "access_control":
        return 1500 // 1.5米
      case "alarm_system":
        return 2500 // 2.5米
      default:
        return 2000 // 2米
    }
  }

  /**
   * 初始化设备模式
   */
  private initializeDevicePatterns(): void {
    this.devicePatterns = [
      {
        id: "camera_pattern_1",
        name: "网络摄像头",
        category: "surveillance",
        type: "ip_camera",
        patterns: {
          geometric: [
            {
              shape: "circle",
              dimensions: { radius: 25 },
              tolerance: 10,
            },
          ],
          textual: [
            {
              keywords: ["摄像头", "camera", "监控", "surveillance", "CCTV"],
              regex: "(摄像头|camera|监控)",
            },
          ],
          contextual: [
            {
              layerContext: ["安防设备", "security", "监控设备"],
            },
          ],
        },
        confidence: 0.85,
      },
      {
        id: "access_pattern_1",
        name: "门禁控制器",
        category: "access_control",
        type: "card_reader",
        patterns: {
          geometric: [
            {
              shape: "rectangle",
              dimensions: { width: 100, height: 60 },
              tolerance: 20,
            },
          ],
          textual: [
            {
              keywords: ["门禁", "access", "读卡器", "card reader", "刷卡"],
              regex: "(门禁|access|读卡器)",
            },
          ],
          contextual: [
            {
              layerContext: ["门禁系统", "access control", "出入口"],
            },
          ],
        },
        confidence: 0.8,
      },
      {
        id: "alarm_pattern_1",
        name: "报警探测器",
        category: "alarm_system",
        type: "motion_detector",
        patterns: {
          geometric: [
            {
              shape: "circle",
              dimensions: { radius: 15 },
              tolerance: 5,
            },
          ],
          textual: [
            {
              keywords: ["报警", "alarm", "探测器", "detector", "传感器", "sensor"],
              regex: "(报警|alarm|探测器|detector)",
            },
          ],
          contextual: [
            {
              layerContext: ["报警系统", "alarm system", "安防探测"],
            },
          ],
        },
        confidence: 0.75,
      },
      // 添加更多安防设备模式
      {
        id: "smoke_detector_pattern",
        name: "烟雾探测器",
        category: "fire_safety",
        type: "smoke_detector",
        patterns: {
          geometric: [
            {
              shape: "circle",
              dimensions: { radius: 20 },
              tolerance: 8,
            },
          ],
          textual: [
            {
              keywords: ["烟感", "smoke", "烟雾探测", "fire detector", "烟雾报警"],
              regex: "(烟感|smoke|烟雾探测|fire.detector)",
            },
          ],
          contextual: [
            {
              layerContext: ["消防系统", "fire safety", "烟感设备"],
            },
          ],
        },
        confidence: 0.82,
      },
      {
        id: "emergency_light_pattern",
        name: "应急照明",
        category: "emergency_lighting",
        type: "emergency_light",
        patterns: {
          geometric: [
            {
              shape: "rectangle",
              dimensions: { width: 80, height: 40 },
              tolerance: 15,
            },
          ],
          textual: [
            {
              keywords: ["应急灯", "emergency", "疏散指示", "exit light", "安全出口"],
              regex: "(应急灯|emergency|疏散指示|exit.light)",
            },
          ],
          contextual: [
            {
              layerContext: ["应急照明", "emergency lighting", "疏散系统"],
            },
          ],
        },
        confidence: 0.78,
      },
      {
        id: "intercom_pattern",
        name: "对讲系统",
        category: "communication",
        type: "intercom_system",
        patterns: {
          geometric: [
            {
              shape: "rectangle",
              dimensions: { width: 60, height: 120 },
              tolerance: 20,
            },
          ],
          textual: [
            {
              keywords: ["对讲", "intercom", "可视对讲", "门铃", "doorbell"],
              regex: "(对讲|intercom|可视对讲|门铃|doorbell)",
            },
          ],
          contextual: [
            {
              layerContext: ["对讲系统", "communication", "门禁对讲"],
            },
          ],
        },
        confidence: 0.75,
      },
    ]
  }

  /**
   * 模拟AI增强
   */
  private async enhanceWithAI(devices: DeviceInfo[], metadata: CADFileMetadata): Promise<DeviceInfo[]> {
    return devices.map((device) => {
      // 模拟AI判断几何匹配度
      device.geometricMatch = Math.random() > 0.3

      // 模拟AI判断文本匹配度
      device.textualMatch = Math.random() > 0.3

      // 模拟AI判断上下文匹配度
      device.contextualMatch = Math.random() > 0.3

      return device
    })
  }

  /**
   * 生成分组Key
   */
  private generateGroupKey(device: DeviceInfo): string {
    return `${device.category}-${device.type}-${Math.floor(device.location.x / 1000)}-${Math.floor(device.location.y / 1000)}`
  }

  /**
   * 查找相关设备
   */
  private findRelatedDevices(device: DeviceInfo, allDevices: DeviceInfo[]): string[] {
    return allDevices.filter((d) => d.id !== device.id && this.areDevicesRelated(device, d)).map((d) => d.id)
  }

  /**
   * 判断两个设备是否相关
   */
  private areDevicesRelated(device1: DeviceInfo, device2: DeviceInfo): boolean {
    // 示例：相同区域或相邻位置的设备被认为是相关的
    const distanceThreshold = 2000 // 2米内
    const distance = Math.sqrt(
      Math.pow(device1.location.x - device2.location.x, 2) + Math.pow(device1.location.y - device2.location.y, 2),
    )

    return distance <= distanceThreshold || device1.category === device2.category
  }

  /**
   * 预测维护计划
   */
  private predictMaintenanceSchedule(device: DeviceInfo): string {
    // 示例：根据设备类型和使用频率预测维护计划
    if (device.type === "ip_camera") {
      return "建议每6个月检查一次"
    } else {
      return "建议每年检查一次"
    }
  }

  /**
   * 识别风险因素
   */
  private identifyRiskFactors(device: DeviceInfo): string[] {
    const riskFactors: string[] = []

    // 示例：根据设备类型和位置识别风险因素
    if (device.category === "surveillance" && device.location.zone === "B区") {
      riskFactors.push("B区光线较暗，可能影响夜视效果")
    }

    return riskFactors
  }

  /**
   * 生成优化建议
   */
  private generateOptimizationSuggestions(device: DeviceInfo): string {
    // 示例：根据设备类型和性能生成优化建议
    if (device.type === "card_reader") {
      return "建议定期清理读卡器表面，确保识别率"
    } else {
      return "建议定期检查电源连接，确保供电稳定"
    }
  }

  /**
   * 分析兼容性
   */
  private analyzeCompatibility(device: DeviceInfo, allDevices: DeviceInfo[]): string {
    // 示例：分析设备之间的兼容性
    const compatibleDevices = allDevices
      .filter((d) => d.id !== device.id && d.category === device.category)
      .map((d) => d.name)

    if (compatibleDevices.length > 0) {
      return `与 ${compatibleDevices.join(", ")} 兼容`
    } else {
      return "未发现兼容设备"
    }
  }
}
