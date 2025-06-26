// @ts-nocheck
/**
 * 海报模板系统
 * 支持动态模板、智能布局、元素组合
 */

export interface PosterTemplate {
  id: string
  name: string
  description: string
  category: string
  thumbnailUrl: string
  previewUrl: string
  elements: TemplateElement[]
  layout: LayoutConfig
  style: StyleConfig
  metadata: TemplateMetadata
}

export interface TemplateElement {
  id: string
  type: "text" | "image" | "shape" | "icon" | "background"
  position: { x: number; y: number; width: number; height: number }
  content?: string
  style: ElementStyle
  constraints?: ElementConstraints
  animations?: AnimationConfig[]
}

export interface LayoutConfig {
  type: "grid" | "flex" | "absolute" | "flow"
  columns?: number
  rows?: number
  gap?: number
  padding?: number
  alignment?: "start" | "center" | "end"
}

export interface StyleConfig {
  colorScheme: string[]
  typography: TypographyConfig
  spacing: SpacingConfig
  effects: EffectConfig[]
}

export interface TemplateMetadata {
  industry: string[]
  useCase: string[]
  difficulty: "beginner" | "intermediate" | "advanced"
  popularity: number
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

export class TemplateSystem {
  private templates: Map<string, PosterTemplate> = new Map()
  private categories: Map<string, PosterTemplate[]> = new Map()

  constructor() {
    this.initializeTemplates()
  }

  /**
   * 获取所有模板
   */
  getAllTemplates(): PosterTemplate[] {
    return Array.from(this.templates.values())
  }

  /**
   * 按分类获取模板
   */
  getTemplatesByCategory(category: string): PosterTemplate[] {
    return this.categories.get(category) || []
  }

  /**
   * 搜索模板
   */
  searchTemplates(
    query: string,
    filters?: {
      category?: string
      industry?: string
      useCase?: string
      difficulty?: string
    },
  ): PosterTemplate[] {
    let results = this.getAllTemplates()

    // 文本搜索
    if (query) {
      const searchTerm = query.toLowerCase()
      results = results.filter(
        (template) =>
          template.name.toLowerCase().includes(searchTerm) ||
          template.description.toLowerCase().includes(searchTerm) ||
          template.metadata.tags.some((tag) => tag.toLowerCase().includes(searchTerm)),
      )
    }

    // 过滤器
    if (filters) {
      if (filters.category) {
        results = results.filter((t) => t.category === filters.category)
      }
      if (filters.industry) {
        results = results.filter((t) => t.metadata.industry.includes(filters.industry))
      }
      if (filters.useCase) {
        results = results.filter((t) => t.metadata.useCase.includes(filters.useCase))
      }
      if (filters.difficulty) {
        results = results.filter((t) => t.metadata.difficulty === filters.difficulty)
      }
    }

    // 按热度排序
    return results.sort((a, b) => b.metadata.popularity - a.metadata.popularity)
  }

  /**
   * 获取推荐模板
   */
  getRecommendedTemplates(userPreferences?: {
    industry?: string
    style?: string
    recentTemplates?: string[]
  }): PosterTemplate[] {
    let templates = this.getAllTemplates()

    // 基于用户偏好推荐
    if (userPreferences) {
      if (userPreferences.industry) {
        templates = templates.filter((t) => t.metadata.industry.includes(userPreferences.industry!))
      }

      if (userPreferences.recentTemplates) {
        // 排除最近使用的模板
        templates = templates.filter((t) => !userPreferences.recentTemplates!.includes(t.id))
      }
    }

    // 返回热门模板
    return templates.sort((a, b) => b.metadata.popularity - a.metadata.popularity).slice(0, 12)
  }

  /**
   * 应用模板到用户内容
   */
  applyTemplate(
    templateId: string,
    userContent: {
      title?: string
      subtitle?: string
      description?: string
      images?: string[]
      colors?: string[]
    },
  ): PosterTemplate | null {
    const template = this.templates.get(templateId)
    if (!template) {return null}

    // 克隆模板
    const appliedTemplate = JSON.parse(JSON.stringify(template)) as PosterTemplate

    // 应用用户内容
    appliedTemplate.elements = appliedTemplate.elements.map((element) => {
      if (element.type === "text") {
        if (element.content?.includes("{{title}}") && userContent.title) {
          element.content = element.content.replace("{{title}}", userContent.title)
        }
        if (element.content?.includes("{{subtitle}}") && userContent.subtitle) {
          element.content = element.content.replace("{{subtitle}}", userContent.subtitle)
        }
        if (element.content?.includes("{{description}}") && userContent.description) {
          element.content = element.content.replace("{{description}}", userContent.description)
        }
      }

      if (element.type === "image" && userContent.images && userContent.images.length > 0) {
        // 应用用户图片
        const imageIndex = appliedTemplate.elements.filter((e) => e.type === "image").indexOf(element)
        if (imageIndex < userContent.images.length) {
          element.content = userContent.images[imageIndex]
        }
      }

      return element
    })

    // 应用用户配色
    if (userContent.colors && userContent.colors.length > 0) {
      appliedTemplate.style.colorScheme = userContent.colors
    }

    return appliedTemplate
  }

  /**
   * 创建自定义模板
   */
  createCustomTemplate(config: {
    name: string
    description: string
    category: string
    elements: TemplateElement[]
    layout: LayoutConfig
    style: StyleConfig
  }): PosterTemplate {
    const template: PosterTemplate = {
      id: `custom_${Date.now()}`,
      name: config.name,
      description: config.description,
      category: config.category,
      thumbnailUrl: "",
      previewUrl: "",
      elements: config.elements,
      layout: config.layout,
      style: config.style,
      metadata: {
        industry: [],
        useCase: [],
        difficulty: "beginner",
        popularity: 0,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }

    this.templates.set(template.id, template)
    return template
  }

  /**
   * 初始化默认模板
   */
  private initializeTemplates(): void {
    // 现代商务模板
    const modernBusinessTemplate: PosterTemplate = {
      id: "modern_business_001",
      name: "现代商务海报",
      description: "简洁专业的商务风格海报，适合企业宣传",
      category: "business",
      thumbnailUrl: "/templates/modern_business_thumb.png",
      previewUrl: "/templates/modern_business_preview.png",
      elements: [
        {
          id: "bg_001",
          type: "background",
          position: { x: 0, y: 0, width: 100, height: 100 },
          style: {
            backgroundColor: "#f8fafc",
            gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          },
        },
        {
          id: "title_001",
          type: "text",
          position: { x: 10, y: 20, width: 80, height: 15 },
          content: "{{title}}",
          style: {
            fontSize: 48,
            fontWeight: "bold",
            color: "#1e293b",
            textAlign: "center",
            fontFamily: "Inter",
          },
        },
        {
          id: "subtitle_001",
          type: "text",
          position: { x: 10, y: 40, width: 80, height: 10 },
          content: "{{subtitle}}",
          style: {
            fontSize: 24,
            color: "#64748b",
            textAlign: "center",
            fontFamily: "Inter",
          },
        },
      ],
      layout: {
        type: "flex",
        alignment: "center",
        padding: 40,
      },
      style: {
        colorScheme: ["#667eea", "#764ba2", "#1e293b", "#64748b"],
        typography: {
          primaryFont: "Inter",
          secondaryFont: "Inter",
          headingScale: 1.5,
          lineHeight: 1.4,
        },
        spacing: {
          unit: 8,
          scale: [4, 8, 16, 24, 32, 48, 64],
        },
        effects: [
          {
            type: "shadow",
            config: { blur: 20, opacity: 0.1, color: "#000000" },
          },
        ],
      },
      metadata: {
        industry: ["business", "corporate", "finance"],
        useCase: ["presentation", "marketing", "announcement"],
        difficulty: "beginner",
        popularity: 95,
        tags: ["modern", "professional", "clean", "business"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }

    // 创意艺术模板
    const creativeArtTemplate: PosterTemplate = {
      id: "creative_art_001",
      name: "创意艺术海报",
      description: "充满创意的艺术风格海报，适合文化活动",
      category: "artistic",
      thumbnailUrl: "/templates/creative_art_thumb.png",
      previewUrl: "/templates/creative_art_preview.png",
      elements: [
        {
          id: "bg_002",
          type: "background",
          position: { x: 0, y: 0, width: 100, height: 100 },
          style: {
            backgroundColor: "#fef3c7",
            gradient: "radial-gradient(circle, #fbbf24 0%, #f59e0b 50%, #d97706 100%)",
          },
        },
        {
          id: "shape_001",
          type: "shape",
          position: { x: 70, y: 10, width: 25, height: 25 },
          style: {
            shape: "circle",
            backgroundColor: "#ef4444",
            opacity: 0.8,
          },
        },
        {
          id: "title_002",
          type: "text",
          position: { x: 5, y: 30, width: 90, height: 20 },
          content: "{{title}}",
          style: {
            fontSize: 56,
            fontWeight: "bold",
            color: "#7c2d12",
            textAlign: "left",
            fontFamily: "Playfair Display",
            transform: "rotate(-2deg)",
          },
        },
      ],
      layout: {
        type: "absolute",
        padding: 20,
      },
      style: {
        colorScheme: ["#fbbf24", "#f59e0b", "#d97706", "#ef4444", "#7c2d12"],
        typography: {
          primaryFont: "Playfair Display",
          secondaryFont: "Inter",
          headingScale: 1.8,
          lineHeight: 1.2,
        },
        spacing: {
          unit: 12,
          scale: [6, 12, 24, 36, 48, 72, 96],
        },
        effects: [
          {
            type: "texture",
            config: { pattern: "paper", opacity: 0.3 },
          },
        ],
      },
      metadata: {
        industry: ["art", "culture", "entertainment"],
        useCase: ["event", "exhibition", "festival"],
        difficulty: "intermediate",
        popularity: 88,
        tags: ["creative", "artistic", "colorful", "dynamic"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }

    // 添加模板到系统
    this.templates.set(modernBusinessTemplate.id, modernBusinessTemplate)
    this.templates.set(creativeArtTemplate.id, creativeArtTemplate)

    // 按分类组织模板
    this.organizeTemplatesByCategory()
  }

  /**
   * 按分类组织模板
   */
  private organizeTemplatesByCategory(): void {
    this.categories.clear()

    for (const template of this.templates.values()) {
      if (!this.categories.has(template.category)) {
        this.categories.set(template.category, [])
      }
      this.categories.get(template.category)!.push(template)
    }
  }
}

// 类型定义
interface ElementStyle {
  fontSize?: number
  fontWeight?: string
  color?: string
  backgroundColor?: string
  textAlign?: "left" | "center" | "right"
  fontFamily?: string
  gradient?: string
  opacity?: number
  transform?: string
  shape?: string
}

interface ElementConstraints {
  minWidth?: number
  maxWidth?: number
  minHeight?: number
  maxHeight?: number
  aspectRatio?: number
}

interface AnimationConfig {
  type: "fadeIn" | "slideIn" | "scale" | "rotate"
  duration: number
  delay?: number
  easing?: string
}

interface TypographyConfig {
  primaryFont: string
  secondaryFont: string
  headingScale: number
  lineHeight: number
}

interface SpacingConfig {
  unit: number
  scale: number[]
}

interface EffectConfig {
  type: "shadow" | "blur" | "texture" | "gradient"
  config: Record<string, any>
}

// 创建默认实例
export const templateSystem = new TemplateSystem()
