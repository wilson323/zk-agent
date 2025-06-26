// @ts-nocheck
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion, AnimatePresence } from "framer-motion"
import {
  Shield,
  Camera,
  Lock,
  Wifi,
  Eye,
  Search,
  Filter,
  Star,
  Crown,
  Sparkles,
  Building,
  Home,
  Factory,
  GraduationCap,
  ShoppingCart,
  Truck,
} from "lucide-react"
import type { SecurityTemplate, SecurityProductType, SecurityUseCase } from "@/types/poster"
import { PosterConfigDB } from "@/lib/database/poster-config"

const PRODUCT_TYPE_ICONS: Record<SecurityProductType, React.ReactNode> = {
  surveillance_camera: <Camera className="h-4 w-4" />,
  access_control: <Lock className="h-4 w-4" />,
  alarm_system: <Shield className="h-4 w-4" />,
  smart_lock: <Lock className="h-4 w-4" />,
  security_software: <Wifi className="h-4 w-4" />,
  perimeter_security: <Shield className="h-4 w-4" />,
  fire_safety: <Shield className="h-4 w-4" />,
  integrated_solution: <Eye className="h-4 w-4" />,
}

const USE_CASE_ICONS: Record<SecurityUseCase, React.ReactNode> = {
  residential: <Home className="h-4 w-4" />,
  commercial: <Building className="h-4 w-4" />,
  industrial: <Factory className="h-4 w-4" />,
  government: <Shield className="h-4 w-4" />,
  education: <GraduationCap className="h-4 w-4" />,
  healthcare: <Shield className="h-4 w-4" />,
  retail: <ShoppingCart className="h-4 w-4" />,
  transportation: <Truck className="h-4 w-4" />,
}

interface SecurityTemplateGalleryProps {
  onTemplateSelect: (template: SecurityTemplate) => void
  selectedTemplate?: string
}

export default function SecurityTemplateGallery({ onTemplateSelect, selectedTemplate }: SecurityTemplateGalleryProps) {
  const [templates, setTemplates] = useState<SecurityTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<SecurityTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProductType, setSelectedProductType] = useState<string>("all")
  const [selectedUseCase, setSelectedUseCase] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"popularity" | "newest" | "name">("popularity")

  useEffect(() => {
    loadTemplates()
  }, [])

  useEffect(() => {
    filterTemplates()
  }, [templates, searchTerm, selectedProductType, selectedUseCase, sortBy])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const data = await PosterConfigDB.getSecurityTemplates()
      setTemplates(data)
    } catch (error) {
      console.error("Failed to load security templates:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterTemplates = () => {
    let filtered = [...templates]

    // 搜索过滤
    if (searchTerm) {
      filtered = filtered.filter(
        (template) =>
          template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          template.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    // 产品类型过滤
    if (selectedProductType !== "all") {
      filtered = filtered.filter((template) => template.productType === selectedProductType)
    }

    // 使用场景过滤
    if (selectedUseCase !== "all") {
      filtered = filtered.filter((template) => template.useCase === selectedUseCase)
    }

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "popularity":
          return b.popularity - a.popularity
        case "newest":
          return b.isNew ? 1 : -1
        case "name":
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })

    setFilteredTemplates(filtered)
  }

  const handleTemplateClick = async (template: SecurityTemplate) => {
    onTemplateSelect(template)
    // 更新使用统计
    await PosterConfigDB.updateTemplateUsage(template.id)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 搜索和过滤 */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索安防模板..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select value={selectedProductType} onValueChange={setSelectedProductType}>
            <SelectTrigger>
              <SelectValue placeholder="产品类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有产品</SelectItem>
              <SelectItem value="surveillance_camera">监控摄像头</SelectItem>
              <SelectItem value="access_control">门禁系统</SelectItem>
              <SelectItem value="alarm_system">报警系统</SelectItem>
              <SelectItem value="smart_lock">智能门锁</SelectItem>
              <SelectItem value="security_software">安防软件</SelectItem>
              <SelectItem value="perimeter_security">周界安防</SelectItem>
              <SelectItem value="fire_safety">消防安全</SelectItem>
              <SelectItem value="integrated_solution">集成解决方案</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedUseCase} onValueChange={setSelectedUseCase}>
            <SelectTrigger>
              <SelectValue placeholder="应用场景" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有场景</SelectItem>
              <SelectItem value="residential">住宅</SelectItem>
              <SelectItem value="commercial">商业</SelectItem>
              <SelectItem value="industrial">工业</SelectItem>
              <SelectItem value="government">政府</SelectItem>
              <SelectItem value="education">教育</SelectItem>
              <SelectItem value="healthcare">医疗</SelectItem>
              <SelectItem value="retail">零售</SelectItem>
              <SelectItem value="transportation">交通</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger>
              <SelectValue placeholder="排序方式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popularity">热门优先</SelectItem>
              <SelectItem value="newest">最新优先</SelectItem>
              <SelectItem value="name">名称排序</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 模板分类标签 */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="popular">热门</TabsTrigger>
          <TabsTrigger value="new">最新</TabsTrigger>
          <TabsTrigger value="premium">精品</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <TemplateGrid
            templates={filteredTemplates}
            onTemplateClick={handleTemplateClick}
            selectedTemplate={selectedTemplate}
          />
        </TabsContent>

        <TabsContent value="popular" className="mt-6">
          <TemplateGrid
            templates={filteredTemplates.filter((t) => t.popularity > 80)}
            onTemplateClick={handleTemplateClick}
            selectedTemplate={selectedTemplate}
          />
        </TabsContent>

        <TabsContent value="new" className="mt-6">
          <TemplateGrid
            templates={filteredTemplates.filter((t) => t.isNew)}
            onTemplateClick={handleTemplateClick}
            selectedTemplate={selectedTemplate}
          />
        </TabsContent>

        <TabsContent value="premium" className="mt-6">
          <TemplateGrid
            templates={filteredTemplates.filter((t) => t.isPremium)}
            onTemplateClick={handleTemplateClick}
            selectedTemplate={selectedTemplate}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface TemplateGridProps {
  templates: SecurityTemplate[]
  onTemplateClick: (template: SecurityTemplate) => void
  selectedTemplate?: string
}

function TemplateGrid({ templates, onTemplateClick, selectedTemplate }: TemplateGridProps) {
  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <Filter className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500">没有找到匹配的模板</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <AnimatePresence>
        {templates.map((template) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedTemplate === template.id
                  ? "ring-2 ring-blue-500 border-blue-500"
                  : "border-gray-200 dark:border-gray-700"
              }`}
              onClick={() => onTemplateClick(template)}
            >
              <div className="relative">
                <img
                  src={template.thumbnail || "/placeholder.svg?height=200&width=300&text=Security+Template"}
                  alt={template.name}
                  className="w-full h-48 object-cover rounded-t-lg"
                />

                {/* 标签覆盖层 */}
                <div className="absolute top-2 left-2 flex gap-1">
                  {template.isNew && (
                    <Badge variant="secondary" className="bg-green-500 text-white">
                      <Sparkles className="h-3 w-3 mr-1" />
                      新品
                    </Badge>
                  )}
                  {template.isPremium && (
                    <Badge variant="secondary" className="bg-yellow-500 text-white">
                      <Crown className="h-3 w-3 mr-1" />
                      精品
                    </Badge>
                  )}
                </div>

                {/* 热度指示器 */}
                <div className="absolute top-2 right-2">
                  <div className="flex items-center bg-black/70 text-white px-2 py-1 rounded text-xs">
                    <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                    {template.popularity}
                  </div>
                </div>
              </div>

              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{template.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{template.description}</p>
                  </div>

                  {/* 产品类型和使用场景 */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-blue-600">
                      {PRODUCT_TYPE_ICONS[template.productType]}
                      <span className="capitalize">{template.productType.replace("_", " ")}</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-600">
                      {USE_CASE_ICONS[template.useCase]}
                      <span className="capitalize">{template.useCase}</span>
                    </div>
                  </div>

                  {/* 标签 */}
                  <div className="flex flex-wrap gap-1">
                    {template.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {template.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.tags.length - 3}
                      </Badge>
                    )}
                  </div>

                  {/* 规格信息 */}
                  {template.specifications && (
                    <div className="text-xs text-gray-500 space-y-1">
                      {template.specifications.resolution && <div>分辨率: {template.specifications.resolution}</div>}
                      {template.specifications.connectivity && (
                        <div>连接: {template.specifications.connectivity.join(", ")}</div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
