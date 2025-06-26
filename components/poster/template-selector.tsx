// @ts-nocheck
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Star, Crown, Sparkles, Filter, Grid, List } from "lucide-react"
import { templateSystem, type PosterTemplate } from "@/lib/poster/template-system"

interface TemplateSelectorProps {
  onTemplateSelect: (template: PosterTemplate) => void
  selectedTemplate?: string
}

export default function TemplateSelector({ onTemplateSelect, selectedTemplate }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<PosterTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<PosterTemplate[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTemplates()
  }, [])

  useEffect(() => {
    filterTemplates()
  }, [templates, searchTerm, selectedCategory])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      // 获取所有模板
      const allTemplates = templateSystem.getAllTemplates()
      setTemplates(allTemplates)
    } catch (error) {
      console.error("Failed to load templates:", error)
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
          template.metadata.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    // 分类过滤
    if (selectedCategory !== "all") {
      filtered = filtered.filter((template) => template.category === selectedCategory)
    }

    // 按热度排序
    filtered.sort((a, b) => b.metadata.popularity - a.metadata.popularity)

    setFilteredTemplates(filtered)
  }

  const getCategories = () => {
    const categories = new Set(templates.map((t) => t.category))
    return Array.from(categories)
  }

  const handleTemplateClick = (template: PosterTemplate) => {
    onTemplateSelect(template)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <Card className="border-purple-200 dark:border-purple-800">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-purple-700 dark:text-purple-300">
          <div className="flex items-center">
            <Sparkles className="mr-2 h-5 w-5" />
            模板选择
          </div>
          <div className="flex items-center gap-2">
            <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}>
              <Grid className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>
              <List className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 搜索和过滤 */}
        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索模板..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="business">商务</TabsTrigger>
              <TabsTrigger value="artistic">艺术</TabsTrigger>
              <TabsTrigger value="tech">科技</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* 模板网格/列表 */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <Filter className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">没有找到匹配的模板</p>
          </div>
        ) : (
          <div className={viewMode === "grid" ? "grid grid-cols-2 md:grid-cols-3 gap-4" : "space-y-3"}>
            <AnimatePresence>
              {filteredTemplates.map((template) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  whileHover={{ scale: viewMode === "grid" ? 1.02 : 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {viewMode === "grid" ? (
                    <TemplateGridCard
                      template={template}
                      isSelected={selectedTemplate === template.id}
                      onClick={() => handleTemplateClick(template)}
                    />
                  ) : (
                    <TemplateListCard
                      template={template}
                      isSelected={selectedTemplate === template.id}
                      onClick={() => handleTemplateClick(template)}
                    />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface TemplateCardProps {
  template: PosterTemplate
  isSelected: boolean
  onClick: () => void
}

function TemplateGridCard({ template, isSelected, onClick }: TemplateCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isSelected ? "ring-2 ring-purple-500 border-purple-500" : "border-gray-200 dark:border-gray-700"
      }`}
      onClick={onClick}
    >
      <div className="relative">
        <img
          src={template.thumbnailUrl || "/placeholder.svg?height=120&width=160&text=Template"}
          alt={template.name}
          className="w-full h-24 object-cover rounded-t-lg"
        />

        {/* 标签覆盖层 */}
        <div className="absolute top-2 left-2 flex gap-1">
          {template.metadata.difficulty === "advanced" && (
            <Badge variant="secondary" className="bg-red-500 text-white text-xs">
              <Crown className="h-2 w-2 mr-1" />
              高级
            </Badge>
          )}
          {template.metadata.popularity > 90 && (
            <Badge variant="secondary" className="bg-yellow-500 text-white text-xs">
              <Star className="h-2 w-2 mr-1" />
              热门
            </Badge>
          )}
        </div>

        {/* 热度指示器 */}
        <div className="absolute top-2 right-2">
          <div className="flex items-center bg-black/70 text-white px-2 py-1 rounded text-xs">
            <Star className="h-2 w-2 mr-1 fill-yellow-400 text-yellow-400" />
            {template.metadata.popularity}
          </div>
        </div>
      </div>

      <CardContent className="p-3">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">{template.name}</h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{template.description}</p>

          {/* 标签 */}
          <div className="flex flex-wrap gap-1">
            {template.metadata.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {template.metadata.tags.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{template.metadata.tags.length - 2}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TemplateListCard({ template, isSelected, onClick }: TemplateCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected ? "ring-2 ring-purple-500 border-purple-500" : "border-gray-200 dark:border-gray-700"
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <img
            src={template.thumbnailUrl || "/placeholder.svg?height=60&width=80&text=Template"}
            alt={template.name}
            className="w-20 h-15 object-cover rounded"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium">{template.name}</h4>
              {template.metadata.difficulty === "advanced" && (
                <Badge variant="secondary" className="bg-red-500 text-white text-xs">
                  高级
                </Badge>
              )}
              {template.metadata.popularity > 90 && (
                <Badge variant="secondary" className="bg-yellow-500 text-white text-xs">
                  热门
                </Badge>
              )}
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-1">{template.description}</p>

            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1">
                {template.metadata.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center text-xs text-gray-500">
                <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                {template.metadata.popularity}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
