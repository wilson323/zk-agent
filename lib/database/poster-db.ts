// @ts-nocheck
/**
 * 海报数据库操作层
 * 严格按照设计文档的数据结构要求
 */

import { PrismaClient } from "@prisma/client"
import type { PosterStyle, PosterSize, ColorPalette, PosterTask, PosterGenerationResult } from "@/types/poster"

const prisma = new PrismaClient()

export class PosterDatabase {
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
        category: style.category,
        previewUrl: style.previewUrl,
      }))
    } catch (error) {
      console.error("Failed to get poster styles:", error)
      throw new Error("获取海报风格失败")
    }
  }

  /**
   * 获取所有海报尺寸
   */
  static async getSizes(): Promise<PosterSize[]> {
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
      }))
    } catch (error) {
      console.error("Failed to get poster sizes:", error)
      throw new Error("获取海报尺寸失败")
    }
  }

  /**
   * 获取所有配色方案
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
      }))
    } catch (error) {
      console.error("Failed to get color palettes:", error)
      throw new Error("获取配色方案失败")
    }
  }

  /**
   * 创建海报任务
   */
  static async createPosterTask(data: {
    userId: string
    description: string
    style: string
    size: string
    palette: string
    referenceImageUrl?: string
    templateId?: string
  }): Promise<PosterTask> {
    try {
      const task = await prisma.posterTask.create({
        data: {
          userId: data.userId,
          description: data.description,
          style: data.style,
          size: data.size,
          palette: data.palette,
          referenceImageUrl: data.referenceImageUrl,
          templateId: data.templateId,
          resultImageUrl: "", // 初始为空，生成后更新
          status: "pending",
        },
      })

      return {
        id: task.id,
        userId: task.userId,
        description: task.description,
        style: task.style,
        size: task.size,
        palette: task.palette,
        referenceImageUrl: task.referenceImageUrl,
        resultImageUrl: task.resultImageUrl,
        createdAt: task.createdAt,
      }
    } catch (error) {
      console.error("Failed to create poster task:", error)
      throw new Error("创建海报任务失败")
    }
  }

  /**
   * 更新海报任务结果
   */
  static async updatePosterTaskResult(taskId: string, resultImageUrl: string): Promise<void> {
    try {
      await prisma.posterTask.update({
        where: { id: taskId },
        data: {
          resultImageUrl,
          status: "completed",
          updatedAt: new Date(),
        },
      })
    } catch (error) {
      console.error("Failed to update poster task result:", error)
      throw new Error("更新海报任务结果失败")
    }
  }

  /**
   * 保存生成历史
   */
  static async saveGenerationHistory(data: {
    userId: string
    prompt: string
    style: string
    size: string
    palette: string
    templateId?: string
    imageUrl: string
    thumbnailUrl?: string
    settings: any
    metadata?: any
  }): Promise<PosterGenerationResult> {
    try {
      const generation = await prisma.posterGeneration.create({
        data: {
          userId: data.userId,
          prompt: data.prompt,
          style: data.style,
          size: data.size,
          palette: data.palette,
          templateId: data.templateId,
          imageUrl: data.imageUrl,
          thumbnailUrl: data.thumbnailUrl,
          settings: data.settings,
          metadata: data.metadata,
        },
      })

      return {
        id: generation.id,
        imageUrl: generation.imageUrl,
        thumbnailUrl: generation.thumbnailUrl,
        metadata: {
          generationTime: data.metadata?.generationTime || 0,
          style: data.style,
          size: data.size,
          palette: data.palette,
        },
        createdAt: generation.createdAt,
      }
    } catch (error) {
      console.error("Failed to save generation history:", error)
      throw new Error("保存生成历史失败")
    }
  }

  /**
   * 获取用户生成历史
   */
  static async getUserGenerationHistory(userId: string, limit = 20) {
    try {
      const history = await prisma.posterGeneration.findMany({
        where: { userId },
        include: {
          styleRef: true,
          sizeRef: true,
          paletteRef: true,
          templateRef: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      })

      return history.map((item) => ({
        id: item.id,
        prompt: item.prompt,
        style: item.styleRef.name,
        size: item.sizeRef.name,
        palette: item.paletteRef.name,
        template: item.templateRef?.name,
        imageUrl: item.imageUrl,
        thumbnailUrl: item.thumbnailUrl,
        settings: item.settings,
        metadata: item.metadata,
        rating: item.rating,
        feedback: item.feedback,
        createdAt: item.createdAt,
      }))
    } catch (error) {
      console.error("Failed to get user generation history:", error)
      throw new Error("获取用户生成历史失败")
    }
  }

  /**
   * 获取模板列表
   */
  static async getTemplates(filters?: {
    category?: string
    industry?: string
    productType?: string
  }) {
    try {
      const where: any = { isActive: true }

      if (filters?.category) {where.category = filters.category}
      if (filters?.industry) {where.industry = filters.industry}
      if (filters?.productType) {where.productType = filters.productType}

      const templates = await prisma.posterTemplate.findMany({
        where,
        include: {
          tags: true,
        },
        orderBy: { popularity: "desc" },
      })

      return templates.map((template) => ({
        id: template.id,
        name: template.name,
        description: template.description,
        thumbnailUrl: template.thumbnailUrl,
        category: template.category,
        industry: template.industry,
        productType: template.productType,
        useCase: template.useCase,
        tags: template.tags.map((tag) => tag.name),
        popularity: template.popularity,
        usageCount: template.usageCount,
        isNew: template.isNew,
        isPremium: template.isPremium,
      }))
    } catch (error) {
      console.error("Failed to get templates:", error)
      throw new Error("获取模板列表失败")
    }
  }

  /**
   * 更新模板使用统计
   */
  static async updateTemplateUsage(templateId: string): Promise<void> {
    try {
      await prisma.posterTemplate.update({
        where: { id: templateId },
        data: {
          usageCount: { increment: 1 },
          popularity: { increment: 1 },
          lastUsed: new Date(),
        },
      })
    } catch (error) {
      console.error("Failed to update template usage:", error)
      // 不抛出错误，统计失败不影响主流程
    }
  }

  /**
   * 记录使用统计
   */
  static async recordUsageStats(data: {
    userId?: string
    agentType: string
    action: string
    metadata?: any
  }): Promise<void> {
    try {
      await prisma.usageStats.create({
        data: {
          userId: data.userId,
          agentType: data.agentType,
          action: data.action,
          metadata: data.metadata,
        },
      })
    } catch (error) {
      console.error("Failed to record usage stats:", error)
      // 不抛出错误，统计失败不影响主流程
    }
  }
}
