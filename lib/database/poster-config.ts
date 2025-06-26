// @ts-nocheck
/**
 * 海报配置数据库操作
 */

import { PrismaClient } from "@prisma/client"
import type { PosterStyle, ColorPalette, PosterSize, SecurityTemplate, IndustryConfig } from "@/types/poster"

const prisma = new PrismaClient()

export class PosterConfigDB {
  /**
   * 获取所有海报风格
   */
  static async getStyles(): Promise<PosterStyle[]> {
    try {
      const styles = await prisma.posterStyle.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      })
      return styles.map((style) => ({
        id: style.id,
        name: style.name,
        description: style.description,
        preview: style.previewUrl,
        category: style.category as any,
        tags: style.tags,
        industrySpecific: style.industrySpecific,
        parameters: style.parameters as any,
      }))
    } catch (error) {
      console.error("Failed to get poster styles:", error)
      return []
    }
  }

  /**
   * 获取安防行业模板
   */
  static async getSecurityTemplates(): Promise<SecurityTemplate[]> {
    try {
      const templates = await prisma.posterTemplate.findMany({
        where: {
          isActive: true,
          industry: "security",
        },
        include: {
          elements: true,
          tags: true,
        },
        orderBy: { popularity: "desc" },
      })

      return templates.map((template) => ({
        id: template.id,
        name: template.name,
        description: template.description,
        thumbnail: template.thumbnailUrl,
        category: template.category,
        industry: template.industry,
        productType: template.productType,
        useCase: template.useCase,
        tags: template.tags.map((t) => t.name),
        elements: template.elements,
        popularity: template.popularity,
        isNew: template.isNew,
        isPremium: template.isPremium,
      }))
    } catch (error) {
      console.error("Failed to get security templates:", error)
      return []
    }
  }

  /**
   * 获取配色方案
   */
  static async getColorPalettes(): Promise<ColorPalette[]> {
    try {
      const palettes = await prisma.colorPalette.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      })
      return palettes.map((palette) => ({
        id: palette.id,
        name: palette.name,
        colors: palette.colors,
        description: palette.description,
        category: palette.category as any,
        industryRecommended: palette.industryRecommended,
      }))
    } catch (error) {
      console.error("Failed to get color palettes:", error)
      return []
    }
  }

  /**
   * 获取海报尺寸配置
   */
  static async getPosterSizes(): Promise<PosterSize[]> {
    try {
      const sizes = await prisma.posterSize.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      })
      return sizes.map((size) => ({
        id: size.id,
        name: size.name,
        dimensions: size.dimensions,
        ratio: size.ratio,
        width: size.width,
        height: size.height,
        dpi: size.dpi,
        category: size.category,
        recommended: size.recommended,
      }))
    } catch (error) {
      console.error("Failed to get poster sizes:", error)
      return []
    }
  }

  /**
   * 保存用户生成历史
   */
  static async saveGenerationHistory(data: {
    userId: string
    prompt: string
    style: string
    template?: string
    settings: any
    imageUrl: string
    industry?: string
  }) {
    try {
      return await prisma.posterGeneration.create({
        data: {
          userId: data.userId,
          prompt: data.prompt,
          style: data.style,
          templateId: data.template,
          settings: data.settings,
          imageUrl: data.imageUrl,
          industry: data.industry,
          createdAt: new Date(),
        },
      })
    } catch (error) {
      console.error("Failed to save generation history:", error)
      throw error
    }
  }

  /**
   * 获取用户生成历史
   */
  static async getUserHistory(userId: string, limit = 20) {
    try {
      return await prisma.posterGeneration.findMany({
        where: { userId },
        include: {
          template: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      })
    } catch (error) {
      console.error("Failed to get user history:", error)
      return []
    }
  }

  /**
   * 更新模板使用统计
   */
  static async updateTemplateUsage(templateId: string) {
    try {
      await prisma.posterTemplate.update({
        where: { id: templateId },
        data: {
          usageCount: { increment: 1 },
          lastUsed: new Date(),
        },
      })
    } catch (error) {
      console.error("Failed to update template usage:", error)
    }
  }

  /**
   * 获取行业配置
   */
  static async getIndustryConfig(industry: string): Promise<IndustryConfig | null> {
    try {
      const config = await prisma.industryConfig.findUnique({
        where: { industry },
        include: {
          recommendedStyles: true,
          recommendedPalettes: true,
          brandGuidelines: true,
        },
      })
      return config
    } catch (error) {
      console.error("Failed to get industry config:", error)
      return null
    }
  }
}
