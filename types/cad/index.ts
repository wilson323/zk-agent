// @ts-nocheck
/**
 * @file types/cad/index.ts
 * @description CAD分析相关类型定义，包含文件处理、分析结果、设备识别等类型
 * @author zk-agent开发团队
 * @lastUpdate 2024-12-19
 * @updateLog
 *   - 2024-12-19 重构文件结构，从types/cad.ts移动到types/cad/index.ts
 *   - 2024-12-19 添加标准文件头注释，符合命名规范
 */

// CAD分析相关类型定义

export interface CADAnalysisConfig {
  enableStructureAnalysis: boolean
  enableDeviceDetection: boolean
  enableRiskAssessment: boolean
  enableComplianceCheck: boolean
  detectionSensitivity: "low" | "medium" | "high"
  riskThreshold: "conservative" | "balanced" | "aggressive"
  complianceStandards: string[]
  generateReport: boolean
  reportFormat: "pdf" | "docx" | "html"
  includeImages: boolean
  includeRecommendations: boolean
  customRules?: CADAnalysisRule[]
  outputLanguage?: "zh-CN" | "en-US"
  qualityLevel?: "fast" | "balanced" | "thorough"
}

export interface CADAnalysisRule {
  id: string
  name: string
  description: string
  category: string
  enabled: boolean
  parameters: Record<string, any>
  severity: "low" | "medium" | "high" | "critical"
}

export interface DeviceInfo {
  id: string
  name: string
  category: "surveillance" | "access_control" | "fire_safety" | "alarm_system" | "communication" | "emergency_lighting"
  type: string
  specifications: Record<string, any>
  location: {
    x: number
    y: number
    z: number
    room?: string
    zone?: string
    floor?: string
    building?: string
  }
  connections: {
    input: string[]
    output: string[]
    control: string[]
    network?: NetworkConnection[]
  }
  status: "active" | "inactive" | "maintenance" | "error"
  installDate?: Date
  warrantyExpiry?: Date
  maintenanceSchedule?: string
  riskFactors?: string[]
  aiConfidence?: number
  geometricMatch?: boolean
  textualMatch?: boolean
  contextualMatch?: boolean
  groupId?: string
  relatedDevices?: string[]
  predictiveInsights?: PredictiveInsight
  complianceStatus?: ComplianceStatus
}

export interface NetworkConnection {
  type: "ethernet" | "wifi" | "rs485" | "rs232" | "can" | "modbus"
  address?: string
  port?: number
  protocol?: string
  bandwidth?: string
  latency?: number
}

export interface PredictiveInsight {
  maintenanceSchedule: string
  riskFactors: string[]
  optimizationSuggestions: string
  compatibilityAnalysis: string
  expectedLifespan?: number
  replacementRecommendation?: Date
  energyEfficiency?: number
}

export interface ComplianceStatus {
  overall: "compliant" | "non_compliant" | "partial" | "unknown"
  standards: StandardCompliance[]
  recommendations: string[]
  lastChecked: Date
}

export interface StandardCompliance {
  standard: string
  version: string
  status: "compliant" | "non_compliant" | "partial"
  details: string
  requirements: RequirementCheck[]
}

export interface RequirementCheck {
  id: string
  description: string
  status: "pass" | "fail" | "warning"
  details?: string
  reference?: string
}

export interface RiskAssessment {
  id: string
  title: string
  description: string
  category: "security" | "safety" | "compliance" | "performance" | "maintenance"
  severity: "low" | "medium" | "high" | "critical"
  probability: number // 0-1
  impact: number // 0-1
  riskScore: number // calculated from probability * impact
  location: {
    coordinates: { x: number; y: number; z?: number }
    description: string
    affectedArea?: number
  }
  affectedDevices: string[]
  recommendations: Recommendation[]
  status: "open" | "acknowledged" | "mitigated" | "resolved" | "false_positive"
  assignedTo?: string
  dueDate?: Date
  createdAt: Date
  updatedAt: Date
  evidence?: Evidence[]
  mitigationPlan?: MitigationPlan
}

export interface Recommendation {
  id: string
  title: string
  description: string
  priority: "low" | "medium" | "high" | "urgent"
  category: "immediate" | "short_term" | "long_term"
  estimatedCost?: number
  estimatedTime?: number
  resources?: string[]
  dependencies?: string[]
  benefits?: string[]
}

export interface Evidence {
  type: "image" | "measurement" | "calculation" | "reference"
  content: string
  source: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface MitigationPlan {
  id: string
  title: string
  description: string
  steps: MitigationStep[]
  estimatedDuration: number
  estimatedCost: number
  requiredResources: string[]
  successCriteria: string[]
  status: "planned" | "in_progress" | "completed" | "cancelled"
  assignedTo?: string
  startDate?: Date
  completionDate?: Date
}

export interface MitigationStep {
  id: string
  title: string
  description: string
  order: number
  estimatedDuration: number
  dependencies?: string[]
  status: "pending" | "in_progress" | "completed" | "skipped"
  assignedTo?: string
  completedAt?: Date
  notes?: string
}

export interface CADFileInfo {
  id: string
  name: string
  size: number
  type: string
  path?: string
  hash?: string
  uploadedAt: Date
  userId: string
  metadata?: CADFileMetadata
  analysisHistory?: string[]
}

export interface CADFileMetadata {
  format: string
  version: string
  units: string
  precision: number
  boundingBox: {
    min: { x: number; y: number; z: number }
    max: { x: number; y: number; z: number }
  }
  layers: CADLayer[]
  blocks: CADBlock[]
  entities: CADEntity[]
  properties: Record<string, any>
  statistics?: CADStatistics
}

export interface CADLayer {
  name: string
  color: string
  lineType: string
  visible: boolean
  locked: boolean
  entityCount: number
  description?: string
  properties?: Record<string, any>
}

export interface CADBlock {
  name: string
  basePoint: { x: number; y: number; z: number }
  entities: CADEntity[]
  attributes: Record<string, any>
  description?: string
  category?: string
}

export interface CADEntity {
  id: string
  type: string
  layer: string
  geometry: any
  properties: Record<string, any>
  boundingBox?: {
    min: { x: number; y: number; z: number }
    max: { x: number; y: number; z: number }
  }
}

export interface CADStatistics {
  totalEntities: number
  entityTypes: Record<string, number>
  totalLayers: number
  activeLayers: number
  totalBlocks: number
  fileComplexity: "low" | "medium" | "high"
  estimatedProcessingTime: number
  memoryRequirement: number
}

export interface AnalysisProgress {
  stage: "parsing" | "structure" | "devices" | "risks" | "compliance" | "report" | "complete"
  progress: number // 0-100
  message: string
  details?: string
  estimatedTimeRemaining?: number
  currentOperation?: string
  warnings?: string[]
  errors?: string[]
}

export interface AnalysisResult {
  id: string
  fileInfo: CADFileInfo
  config: CADAnalysisConfig
  summary: AnalysisSummary
  devices: DeviceInfo[]
  risks: RiskAssessment[]
  compliance: ComplianceReport
  recommendations: Recommendation[]
  report?: AnalysisReport
  performance: PerformanceMetrics
  createdAt: Date
  processingTime: number
  version: string
}

export interface AnalysisSummary {
  totalDevices: number
  devicesByCategory: Record<string, number>
  totalRisks: number
  risksBySeverity: Record<string, number>
  complianceScore: number
  overallStatus: "excellent" | "good" | "fair" | "poor"
  keyFindings: string[]
  criticalIssues: number
  recommendationsCount: number
}

export interface ComplianceReport {
  overall: ComplianceStatus
  standards: StandardCompliance[]
  violations: ComplianceViolation[]
  recommendations: ComplianceRecommendation[]
  score: number // 0-100
  lastUpdated: Date
}

export interface ComplianceViolation {
  id: string
  standard: string
  requirement: string
  description: string
  severity: "minor" | "major" | "critical"
  location?: string
  affectedDevices: string[]
  remediation: string
  deadline?: Date
}

export interface ComplianceRecommendation {
  id: string
  title: string
  description: string
  standard: string
  priority: "low" | "medium" | "high"
  implementation: string
  benefits: string[]
  estimatedCost?: number
}

export interface AnalysisReport {
  id: string
  format: "pdf" | "docx" | "html"
  url: string
  size: number
  generatedAt: Date
  sections: ReportSection[]
  metadata: Record<string, any>
}

export interface ReportSection {
  id: string
  title: string
  type: "summary" | "devices" | "risks" | "compliance" | "recommendations" | "appendix"
  content: any
  order: number
  includeInTOC: boolean
}

export interface PerformanceMetrics {
  processingTime: number
  memoryUsage: number
  cpuUsage: number
  cacheHitRate: number
  errorRate: number
  throughput: number
  bottlenecks?: string[]
  optimizationSuggestions?: string[]
}

export interface BatchAnalysisConfig {
  maxConcurrent: number
  priorityQueue: boolean
  progressCallback?: (fileId: string, progress: AnalysisProgress) => void
  errorHandling: "stop" | "continue" | "retry"
  retryAttempts?: number
  timeout?: number
}

export interface BatchAnalysisResult {
  batchId: string
  totalFiles: number
  completedFiles: number
  failedFiles: number
  results: Map<string, AnalysisResult>
  errors: Map<string, string>
  startTime: Date
  endTime?: Date
  totalProcessingTime: number
  averageProcessingTime: number
}

export interface Visualization3DConfig {
  renderer: "webgl" | "canvas" | "svg"
  quality: "low" | "medium" | "high"
  lighting: boolean
  shadows: boolean
  materials: boolean
  animations: boolean
  interactivity: boolean
}

export interface Visualization3DScene {
  id: string
  name: string
  objects: Visualization3DObject[]
  camera: Camera3D
  lighting: Lighting3D
  environment: Environment3D
  metadata: Record<string, any>
}

export interface Visualization3DObject {
  id: string
  type: "device" | "structure" | "annotation" | "risk_indicator"
  geometry: Geometry3D
  material: Material3D
  transform: Transform3D
  properties: Record<string, any>
  interactive: boolean
  visible: boolean
}

export interface Camera3D {
  position: { x: number; y: number; z: number }
  target: { x: number; y: number; z: number }
  up: { x: number; y: number; z: number }
  fov: number
  near: number
  far: number
}

export interface Lighting3D {
  ambient: { color: string; intensity: number }
  directional: Array<{
    color: string
    intensity: number
    direction: { x: number; y: number; z: number }
  }>
  point: Array<{
    color: string
    intensity: number
    position: { x: number; y: number; z: number }
    distance: number
  }>
}

export interface Environment3D {
  background: string | { type: "color" | "gradient" | "skybox"; value: any }
  fog?: { type: "linear" | "exponential"; color: string; near: number; far: number }
  grid?: { size: number; divisions: number; color: string }
}

export interface Geometry3D {
  type: "box" | "sphere" | "cylinder" | "plane" | "custom"
  parameters: Record<string, any>
  vertices?: number[]
  faces?: number[]
  normals?: number[]
  uvs?: number[]
}

export interface Material3D {
  type: "basic" | "lambert" | "phong" | "standard" | "physical"
  color: string
  opacity: number
  transparent: boolean
  wireframe: boolean
  texture?: string
  normalMap?: string
  roughness?: number
  metalness?: number
}

export interface Transform3D {
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  scale: { x: number; y: number; z: number }
}

export interface ExportConfig {
  format: "json" | "csv" | "xlsx" | "pdf" | "docx"
  sections: string[]
  includeImages: boolean
  includeMetadata: boolean
  compression: boolean
  password?: string
  watermark?: string
}

export interface ExportResult {
  id: string
  format: string
  url: string
  size: number
  generatedAt: Date
  expiresAt: Date
  downloadCount: number
  metadata: Record<string, any>
} 