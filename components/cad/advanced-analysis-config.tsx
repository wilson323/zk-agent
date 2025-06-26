// @ts-nocheck
"use client"

import { useState } from "react"
import { Settings, Zap, Shield, FileText, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import type { CADAnalysisConfig } from "@/types/cad"

interface AdvancedAnalysisConfigProps {
  config: CADAnalysisConfig
  onConfigChange: (config: CADAnalysisConfig) => void
  onClose: () => void
}

export function AdvancedAnalysisConfig({ config, onConfigChange, onClose }: AdvancedAnalysisConfigProps) {
  const [localConfig, setLocalConfig] = useState<CADAnalysisConfig>(config)

  const handleConfigUpdate = (updates: Partial<CADAnalysisConfig>) => {
    const newConfig = { ...localConfig, ...updates }
    setLocalConfig(newConfig)
  }

  const handleSave = () => {
    onConfigChange(localConfig)
    onClose()
  }

  const handleReset = () => {
    const defaultConfig: CADAnalysisConfig = {
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
    setLocalConfig(defaultConfig)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            高级分析配置
          </CardTitle>
          <CardDescription>自定义CAD分析参数，优化分析结果的准确性和相关性</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 分析模块配置 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h3 className="text-lg font-semibold">分析模块</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">结构分析</Label>
                  <p className="text-xs text-muted-foreground">识别建筑结构和组件层次</p>
                </div>
                <Switch
                  checked={localConfig.enableStructureAnalysis}
                  onCheckedChange={(checked) => handleConfigUpdate({ enableStructureAnalysis: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">设备检测</Label>
                  <p className="text-xs text-muted-foreground">自动识别安防设备类型和位置</p>
                </div>
                <Switch
                  checked={localConfig.enableDeviceDetection}
                  onCheckedChange={(checked) => handleConfigUpdate({ enableDeviceDetection: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">风险评估</Label>
                  <p className="text-xs text-muted-foreground">评估安全风险和潜在问题</p>
                </div>
                <Switch
                  checked={localConfig.enableRiskAssessment}
                  onCheckedChange={(checked) => handleConfigUpdate({ enableRiskAssessment: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">合规性检查</Label>
                  <p className="text-xs text-muted-foreground">检查是否符合相关标准规范</p>
                </div>
                <Switch
                  checked={localConfig.enableComplianceCheck}
                  onCheckedChange={(checked) => handleConfigUpdate({ enableComplianceCheck: checked })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* 分析参数 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h3 className="text-lg font-semibold">分析参数</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>检测灵敏度</Label>
                <Select
                  value={localConfig.detectionSensitivity}
                  onValueChange={(value: "low" | "medium" | "high") =>
                    handleConfigUpdate({ detectionSensitivity: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">低 - 只检测明显特征</SelectItem>
                    <SelectItem value="medium">中 - 平衡准确性和覆盖率</SelectItem>
                    <SelectItem value="high">高 - 检测更多细节</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>风险阈值</Label>
                <Select
                  value={localConfig.riskThreshold}
                  onValueChange={(value: "conservative" | "balanced" | "aggressive") =>
                    handleConfigUpdate({ riskThreshold: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">保守 - 严格的风险标准</SelectItem>
                    <SelectItem value="balanced">平衡 - 适中的风险评估</SelectItem>
                    <SelectItem value="aggressive">积极 - 宽松的风险标准</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* 合规标准 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <h3 className="text-lg font-semibold">合规标准</h3>
            </div>

            <div className="space-y-3">
              <Label>选择适用的标准规范</Label>
              <div className="flex flex-wrap gap-2">
                {["GB50348-2018", "GA/T75-1994", "GB50057-2010", "GB25506-2010", "GB16806-2006", "GA/T1400-2017"].map(
                  (standard) => (
                    <Badge
                      key={standard}
                      variant={localConfig.complianceStandards.includes(standard) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        const standards = localConfig.complianceStandards.includes(standard)
                          ? localConfig.complianceStandards.filter((s) => s !== standard)
                          : [...localConfig.complianceStandards, standard]
                        handleConfigUpdate({ complianceStandards: standards })
                      }}
                    >
                      {standard}
                    </Badge>
                  ),
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* 报告配置 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-lg font-semibold">报告配置</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>生成分析报告</Label>
                  <p className="text-xs text-muted-foreground">自动生成专业的分析报告</p>
                </div>
                <Switch
                  checked={localConfig.generateReport}
                  onCheckedChange={(checked) => handleConfigUpdate({ generateReport: checked })}
                />
              </div>

              {localConfig.generateReport && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-primary/20">
                  <div className="space-y-2">
                    <Label>报告格式</Label>
                    <Select
                      value={localConfig.reportFormat}
                      onValueChange={(value: "pdf" | "docx" | "html" | "xlsx") =>
                        handleConfigUpdate({ reportFormat: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF - 便于分享和打印</SelectItem>
                        <SelectItem value="docx">Word - 可编辑文档</SelectItem>
                        <SelectItem value="html">HTML - 网页格式</SelectItem>
                        <SelectItem value="xlsx">Excel - 数据分析</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label>报告内容</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="include-images"
                          checked={localConfig.includeImages}
                          onCheckedChange={(checked) => handleConfigUpdate({ includeImages: checked })}
                        />
                        <Label htmlFor="include-images" className="text-sm">
                          包含图片
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="include-recommendations"
                          checked={localConfig.includeRecommendations}
                          onCheckedChange={(checked) => handleConfigUpdate({ includeRecommendations: checked })}
                        />
                        <Label htmlFor="include-recommendations" className="text-sm">
                          包含建议
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handleReset}>
              重置为默认
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button onClick={handleSave}>保存配置</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
