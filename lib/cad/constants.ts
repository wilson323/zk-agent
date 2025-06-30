export interface CADAnalysisConfig {
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

export const DEFAULT_CAD_ANALYSIS_CONFIG: CADAnalysisConfig = {
  enableStructureAnalysis: true,
  enableDeviceDetection: true,
  enableRiskAssessment: true,
  enableComplianceCheck: true,
  detectionSensitivity: "medium",
  riskThreshold: "balanced",
  complianceStandards: ["GB50348-2018", "GA/T75-1994"],
  generateReport: true,
  reportFormat: "pdf",
  includeImages: true,
  includeRecommendations: true,
}
