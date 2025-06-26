// @ts-nocheck
"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { FileUp, FileCheck, Settings, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CADFileUploader } from "@/components/cad/cad-file-uploader"
import { CADViewer } from "@/components/cad/cad-viewer"
import { CADAnalysisResult } from "@/components/cad/cad-analysis-result"

export default function CADAnalyzerPage() {
  const [activeTab, setActiveTab] = useState("upload")
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [fileDetails, setFileDetails] = useState<{
    url: string
    name: string
    type: string
  } | null>(null)

  const handleAnalysisComplete = (result: any) => {
    // 模拟文件URL，实际应用中应该从result中获取
    setFileDetails({
      url: "/cad-model-preview.png",
      name: "engine-assembly.dwg",
      type: "dwg",
    })

    setAnalysisResult(result)
    setActiveTab("view")
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-8">
        <motion.div variants={itemVariants}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">CAD分析工具</h1>
              <p className="text-muted-foreground mt-1">上传CAD文件进行智能分析，获取详细的零件、装配和材料信息</p>
            </div>
            <Button variant="outline" className="flex items-center gap-2 self-start">
              <Settings className="h-4 w-4" />
              分析设置
            </Button>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center">
              <TabsList className="mb-8">
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <FileUp className="h-4 w-4" />
                  上传文件
                </TabsTrigger>
                <TabsTrigger value="view" disabled={!fileDetails} className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4" />
                  查看模型
                </TabsTrigger>
                <TabsTrigger value="results" disabled={!analysisResult} className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4" />
                  分析结果
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="upload" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-dashed">
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-2xl">上传CAD文件</CardTitle>
                    <CardDescription>支持 .dwg, .dxf, .step, .stp, .iges, .igs, .stl 格式</CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center pb-8">
                    <CADFileUploader onAnalysisComplete={handleAnalysisComplete} />
                  </CardContent>
                </Card>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-bold">1</span>
                        </div>
                        上传CAD文件
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">上传您的CAD文件，支持多种常见格式。文件大小限制为50MB。</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-bold">2</span>
                        </div>
                        查看3D模型
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">在浏览器中查看您的3D模型，可以旋转、缩放和检查细节。</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-bold">3</span>
                        </div>
                        获取分析结果
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">获取详细的分析报告，包括零件信息、材料分析和优化建议。</p>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="view" className="mt-0">
              {fileDetails && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-2xl">CAD模型查看器</CardTitle>
                      <CardDescription>您可以旋转、缩放和检查模型细节</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CADViewer fileUrl={fileDetails.url} fileName={fileDetails.name} fileType={fileDetails.type} />
                    </CardContent>
                  </Card>

                  <div className="mt-6 flex justify-end">
                    <Button onClick={() => setActiveTab("results")}>
                      查看分析结果
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="results" className="mt-0">
              {analysisResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <CADAnalysisResult result={analysisResult} />
                </motion.div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold">1</span>
              </div>
              智能文件解析
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">支持DWG、DXF、STEP等多种CAD格式，智能识别文件结构和元数据。</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold">2</span>
              </div>
              设备智能识别
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">基于几何形状、文本标注和图层信息，自动识别安防设备类型和位置。</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold">3</span>
              </div>
              风险智能评估
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">全面评估安全风险和合规性，提供专业的改进建议和解决方案。</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold">4</span>
              </div>
              专业报告生成
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">生成PDF、Word、Excel等多格式专业报告，支持图表和详细分析。</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
