/**
 * @file types/cad/enhanced.ts
 * @description CAD分析增强功能类型定义，包含真实解析器、工程量计算、空间分析等
 * @author zk-agent开发团队
 * @lastUpdate 2024-12-19
 * @updateLog
 *   - 2024-12-19 创建增强功能类型定义文件
 *   - 2024-12-19 添加真实解析器相关类型
 *   - 2024-12-19 添加工程量计算和空间分析类型
 */

import { DeviceInfo, CADFileMetadata, AnalysisProgress } from './index'

// 真实CAD解析器相关类型
export interface RealCADParserConfig {
  enableDXFParser: boolean
  enableDWGParser: boolean
  enableSTEPParser: boolean
  enableIGESParser: boolean
  enableSTLParser: boolean
  enableOBJParser: boolean
  precision: number
  maxFileSize: number
  timeout: number
  memoryLimit: number
}

export interface DXFParseResult {
  header: DXFHeader
  tables: DXFTables
  blocks: DXFBlock[]
  entities: DXFEntity[]
  objects: DXFObject[]
  metadata: CADFileMetadata
}

export interface DXFHeader {
  version: string
  acadVersion: string
  units: string
  precision: number
  extMin: { x: number; y: number; z: number }
  extMax: { x: number; y: number; z: number }
  limMin: { x: number; y: number; z: number }
  limMax: { x: number; y: number; z: number }
  variables: Record<string, any>
}

export interface DXFTables {
  layers: DXFLayer[]
  lineTypes: DXFLineType[]
  textStyles: DXFTextStyle[]
  dimStyles: DXFDimStyle[]
  blocks: DXFBlockRecord[]
}

export interface DXFLayer {
  name: string
  color: number
  lineType: string
  lineWeight: number
  plotStyle: string
  visible: boolean
  frozen: boolean
  locked: boolean
}

export interface DXFLineType {
  name: string
  description: string
  pattern: number[]
  patternLength: number
}

export interface DXFTextStyle {
  name: string
  fontFile: string
  bigFontFile?: string
  height: number
  widthFactor: number
  obliqueAngle: number
  backwards: boolean
  upsideDown: boolean
}

export interface DXFDimStyle {
  name: string
  dimScale: number
  dimTextHeight: number
  dimArrowSize: number
  dimExtensionLineOffset: number
  dimExtensionLineExtend: number
}

export interface DXFBlockRecord {
  name: string
  handle: string
  ownerHandle: string
}

export interface DXFBlock {
  name: string
  basePoint: { x: number; y: number; z: number }
  entities: DXFEntity[]
  attributes: DXFAttribute[]
}

export interface DXFEntity {
  type: string
  handle: string
  layer: string
  color: number
  lineType: string
  lineWeight: number
  geometry: any
  extendedData?: Record<string, any>
}

export interface DXFAttribute {
  tag: string
  value: string
  position: { x: number; y: number; z: number }
  height: number
  rotation: number
  style: string
}

export interface DXFObject {
  type: string
  handle: string
  ownerHandle: string
  data: Record<string, any>
}

// 设备识别增强类型
export interface DeviceRecognitionPattern {
  id: string
  name: string
  category: string
  type: string
  geometricPattern: GeometricPattern
  textualPattern: TextualPattern
  contextualPattern: ContextualPattern
  confidence: number
  priority: number
}

export interface GeometricPattern {
  shapes: GeometricShape[]
  dimensions: DimensionConstraint[]
  relationships: SpatialRelationship[]
  tolerance: number
}

export interface GeometricShape {
  type: 'circle' | 'rectangle' | 'line' | 'arc' | 'polyline' | 'text'
  parameters: Record<string, number>
  position: { x: number; y: number; z?: number }
  rotation?: number
  scale?: number
}

export interface DimensionConstraint {
  parameter: string
  min: number
  max: number
  preferred?: number
  unit: string
}

export interface SpatialRelationship {
  type: 'adjacent' | 'inside' | 'outside' | 'parallel' | 'perpendicular' | 'concentric'
  target: string
  distance?: number
  angle?: number
  tolerance: number
}

export interface TextualPattern {
  keywords: string[]
  patterns: RegExp[]
  exclusions: string[]
  caseSensitive: boolean
  fuzzyMatch: boolean
  similarity: number
}

export interface ContextualPattern {
  layerNames: string[]
  blockNames: string[]
  nearbyDevices: string[]
  roomTypes: string[]
  buildingZones: string[]
  electricalCircuits: string[]
}

// 工程量计算类型
export interface QuantityCalculationConfig {
  enableCableCalculation: boolean
  enableConduitCalculation: boolean
  enableDeviceQuantification: boolean
  enableLaborEstimation: boolean
  enableMaterialEstimation: boolean
  enableCostEstimation: boolean
  priceDatabase?: string
  laborRates?: Record<string, number>
  materialPrices?: Record<string, number>
}

export interface QuantityCalculationResult {
  cables: CableQuantity[]
  conduits: ConduitQuantity[]
  devices: DeviceQuantity[]
  labor: LaborEstimation
  materials: MaterialEstimation
  cost: CostEstimation
  summary: QuantitySummary
}

export interface CableQuantity {
  type: string
  specification: string
  length: number
  unit: string
  routes: CableRoute[]
  connections: CableConnection[]
  redundancy: number
  safetyFactor: number
}

export interface CableRoute {
  id: string
  from: { x: number; y: number; z: number; device?: string }
  to: { x: number; y: number; z: number; device?: string }
  path: { x: number; y: number; z: number }[]
  length: number
  conduit?: string
  tray?: string
  underground?: boolean
}

export interface CableConnection {
  deviceId: string
  connectionType: string
  termination: string
  wireGauge: string
  voltage: number
  current: number
}

export interface ConduitQuantity {
  type: string
  diameter: number
  material: string
  length: number
  fittings: ConduitFitting[]
  supports: ConduitSupport[]
  installation: string
}

export interface ConduitFitting {
  type: string
  size: number
  quantity: number
  material: string
  location: { x: number; y: number; z: number }
}

export interface ConduitSupport {
  type: string
  spacing: number
  quantity: number
  material: string
  loadCapacity: number
}

export interface DeviceQuantity {
  deviceId: string
  type: string
  model: string
  quantity: number
  specifications: Record<string, any>
  accessories: DeviceAccessory[]
  installation: InstallationRequirement
}

export interface DeviceAccessory {
  type: string
  model: string
  quantity: number
  required: boolean
  purpose: string
}

export interface InstallationRequirement {
  mounting: string
  height: number
  clearance: number
  powerRequirement: PowerRequirement
  environmentalRating: string
  certifications: string[]
}

export interface PowerRequirement {
  voltage: number
  current: number
  power: number
  phases: number
  frequency: number
  powerFactor: number
}

export interface LaborEstimation {
  totalHours: number
  skillCategories: LaborCategory[]
  phases: LaborPhase[]
  complexity: 'low' | 'medium' | 'high'
  riskFactors: string[]
}

export interface LaborCategory {
  category: string
  skillLevel: string
  hours: number
  rate: number
  cost: number
  tasks: string[]
}

export interface LaborPhase {
  phase: string
  description: string
  duration: number
  dependencies: string[]
  resources: string[]
  milestones: string[]
}

export interface MaterialEstimation {
  totalCost: number
  categories: MaterialCategory[]
  suppliers: SupplierInfo[]
  leadTimes: Record<string, number>
  alternatives: MaterialAlternative[]
}

export interface MaterialCategory {
  category: string
  items: MaterialItem[]
  subtotal: number
  tax: number
  shipping: number
  total: number
}

export interface MaterialItem {
  id: string
  name: string
  specification: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
  supplier: string
  leadTime: number
  availability: 'in-stock' | 'order' | 'backorder' | 'discontinued'
}

export interface SupplierInfo {
  id: string
  name: string
  contact: string
  rating: number
  reliability: number
  priceCompetitiveness: number
  deliveryPerformance: number
}

export interface MaterialAlternative {
  originalItem: string
  alternativeItem: string
  costDifference: number
  performanceDifference: string
  availability: string
  recommendation: string
}

export interface CostEstimation {
  materials: number
  labor: number
  equipment: number
  overhead: number
  profit: number
  contingency: number
  tax: number
  total: number
  breakdown: CostBreakdown[]
  assumptions: string[]
}

export interface CostBreakdown {
  category: string
  description: string
  amount: number
  percentage: number
  basis: string
}

export interface QuantitySummary {
  totalDevices: number
  totalCableLength: number
  totalConduitLength: number
  totalLaborHours: number
  totalMaterialCost: number
  totalProjectCost: number
  keyMetrics: Record<string, number>
  recommendations: string[]
}

// 空间分析类型
export interface SpatialAnalysisConfig {
  enableCoverageAnalysis: boolean
  enableInterferenceAnalysis: boolean
  enableAccessibilityAnalysis: boolean
  enableOptimizationAnalysis: boolean
  gridResolution: number
  analysisRadius: number
  obstructionDetection: boolean
}

export interface SpatialAnalysisResult {
  coverage: CoverageAnalysis
  interference: InterferenceAnalysis
  accessibility: AccessibilityAnalysis
  optimization: OptimizationAnalysis
  heatmaps: HeatmapData[]
  recommendations: SpatialRecommendation[]
}

export interface CoverageAnalysis {
  totalArea: number
  coveredArea: number
  coveragePercentage: number
  gaps: CoverageGap[]
  overlaps: CoverageOverlap[]
  zones: CoverageZone[]
}

export interface CoverageGap {
  id: string
  area: number
  center: { x: number; y: number }
  severity: 'minor' | 'major' | 'critical'
  recommendations: string[]
  affectedFunctions: string[]
}

export interface CoverageOverlap {
  id: string
  devices: string[]
  area: number
  center: { x: number; y: number }
  redundancy: number
  optimization: string[]
}

export interface CoverageZone {
  id: string
  type: string
  area: number
  devices: string[]
  coverage: number
  quality: 'excellent' | 'good' | 'fair' | 'poor'
}

export interface InterferenceAnalysis {
  totalInterferences: number
  interferenceTypes: Record<string, number>
  criticalInterferences: InterferenceIssue[]
  mitigationStrategies: InterferenceMitigation[]
}

export interface InterferenceIssue {
  id: string
  type: 'electromagnetic' | 'physical' | 'signal' | 'thermal'
  devices: string[]
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  impact: string[]
  location: { x: number; y: number; z: number }
  radius: number
}

export interface InterferenceMitigation {
  interferenceId: string
  strategy: string
  description: string
  effectiveness: number
  cost: number
  implementation: string[]
  timeline: number
}

export interface AccessibilityAnalysis {
  accessibleDevices: number
  inaccessibleDevices: number
  accessibilityScore: number
  accessPaths: AccessPath[]
  barriers: AccessBarrier[]
  improvements: AccessImprovement[]
}

export interface AccessPath {
  deviceId: string
  path: { x: number; y: number; z: number }[]
  length: number
  difficulty: 'easy' | 'moderate' | 'difficult' | 'extreme'
  clearance: number
  obstacles: string[]
  safetyRating: number
}

export interface AccessBarrier {
  id: string
  type: 'physical' | 'height' | 'clearance' | 'safety' | 'security'
  location: { x: number; y: number; z: number }
  affectedDevices: string[]
  severity: 'minor' | 'major' | 'blocking'
  description: string
}

export interface AccessImprovement {
  id: string
  description: string
  affectedDevices: string[]
  cost: number
  benefit: string
  priority: 'low' | 'medium' | 'high'
  implementation: string[]
}

export interface OptimizationAnalysis {
  currentScore: number
  optimizedScore: number
  improvement: number
  optimizations: OptimizationSuggestion[]
  scenarios: OptimizationScenario[]
  tradeoffs: OptimizationTradeoff[]
}

export interface OptimizationSuggestion {
  id: string
  type: 'relocation' | 'addition' | 'removal' | 'replacement' | 'configuration'
  description: string
  devices: string[]
  impact: OptimizationImpact
  cost: number
  feasibility: number
  priority: number
}

export interface OptimizationImpact {
  coverage: number
  interference: number
  accessibility: number
  cost: number
  maintenance: number
  performance: number
}

export interface OptimizationScenario {
  id: string
  name: string
  description: string
  optimizations: string[]
  totalCost: number
  totalBenefit: number
  roi: number
  timeline: number
  riskLevel: 'low' | 'medium' | 'high'
}

export interface OptimizationTradeoff {
  aspect1: string
  aspect2: string
  relationship: 'positive' | 'negative' | 'neutral'
  strength: number
  description: string
  recommendations: string[]
}

export interface HeatmapData {
  id: string
  type: 'coverage' | 'interference' | 'accessibility' | 'cost' | 'risk'
  resolution: number
  bounds: {
    min: { x: number; y: number }
    max: { x: number; y: number }
  }
  data: number[][]
  colorScale: ColorScale
  legend: HeatmapLegend
}

export interface ColorScale {
  min: string
  max: string
  steps: ColorStep[]
}

export interface ColorStep {
  value: number
  color: string
  label: string
}

export interface HeatmapLegend {
  title: string
  unit: string
  min: number
  max: number
  steps: LegendStep[]
}

export interface LegendStep {
  value: number
  label: string
  description: string
}

export interface SpatialRecommendation {
  id: string
  type: 'coverage' | 'interference' | 'accessibility' | 'optimization'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  impact: string[]
  implementation: string[]
  cost: number
  timeline: number
  dependencies: string[]
}

// CAD分析服务配置类型
export interface CADAnalysisServiceConfig {
  useRealParser: boolean
  enableDeviceDetection: boolean
  enableQuantityCalculation: boolean
  enableSpatialAnalysis: boolean
  enable3DVisualization: boolean
  cacheResults: boolean
  maxConcurrentAnalyses: number
  timeoutMs: number
  progressCallback?: (progress: number, stage: string) => void
}

// 统一分析结果类型
export interface EnhancedAnalysisResult {
  id: string
  fileName: string
  fileSize: number
  format: string

  // 文件信息 (匹配AnalysisResult)
  fileInfo: {
    id: string
    name: string
    size: number
    type: string
    uploadedAt: Date
    userId: string
  }

  // 配置信息 (匹配AnalysisResult)
  config: {
    enableStructureAnalysis: boolean
    enableDeviceDetection: boolean
    enableRiskAssessment: boolean
    enableComplianceCheck: boolean
    detectionSensitivity: "low" | "medium" | "high"
    riskThreshold: "conservative" | "balanced" | "aggressive"
    complianceStandards: string[]
    generateReport: boolean
    reportFormat: "pdf" | "docx"
    includeImages: boolean
    includeRecommendations: boolean
  }

  parseResult: DXFParseResult | any
  devices: DeviceInfo[]
  quantities?: QuantityCalculationResult
  spatialAnalysis?: SpatialAnalysisResult
  visualization3D?: any

  // 合规检查 (匹配AnalysisResult)
  compliance: {
    overallScore: number
    standards: Array<{
      name: string
      score: number
      status: 'compliant' | 'non-compliant' | 'warning'
      issues: string[]
    }>
    recommendations: string[]
  }

  // 建议 (匹配AnalysisResult)
  recommendations: Array<{
    id: string
    type: 'optimization' | 'safety' | 'compliance' | 'cost'
    priority: 'low' | 'medium' | 'high' | 'critical'
    title: string
    description: string
    impact: string
    effort: 'low' | 'medium' | 'high'
  }>

  summary: any
  risks: any[]

  // 创建时间和处理时间 (匹配AnalysisResult)
  createdAt: Date
  processingTime: number
  version: string

  report?: {
    url: string
    format: string
    size: number
    generatedAt: Date
    id: string
    sections: any[]
    metadata: any
  }
  performance: {
    parseTime: number
    analysisTime: number
    totalTime: number
    memoryUsage: number
  }
  metadata: {
    parserType: 'real' | 'mock'
    version: string
    timestamp: Date
    cacheHit: boolean
  }
}