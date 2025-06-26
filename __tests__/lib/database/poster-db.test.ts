/**
 * 海报数据库操作测试
 * 测试poster-db.ts中的所有方法
 */

import { PosterDatabase } from '@/lib/database/poster-db'
import { PrismaClient } from '@prisma/client'
import type { PosterStyle, PosterSize, ColorPalette, PosterTask } from '@/types/poster'

// Mock Prisma Client
jest.mock('@prisma/client')
const mockPrisma = {
  posterStyle: {
    findMany: jest.fn(),
  },
  posterSize: {
    findMany: jest.fn(),
  },
  colorPalette: {
    findMany: jest.fn(),
  },
  posterTask: {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  posterGenerationHistory: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
}

;(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrisma as any)

describe('PosterDatabase', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getStyles', () => {
    it('应该成功获取海报风格列表', async () => {
      const mockStyles = [
        {
          id: '1',
          name: '现代简约',
          description: '简洁现代的设计风格',
          category: 'modern',
          previewUrl: 'https://example.com/preview1.jpg',
          isActive: true,
          order: 1,
        },
        {
          id: '2',
          name: '复古经典',
          description: '经典复古的设计风格',
          category: 'vintage',
          previewUrl: 'https://example.com/preview2.jpg',
          isActive: true,
          order: 2,
        },
      ]

      mockPrisma.posterStyle.findMany.mockResolvedValue(mockStyles)

      const result = await PosterDatabase.getStyles()

      expect(mockPrisma.posterStyle.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      })

      expect(result).toEqual([
        {
          id: '1',
          name: '现代简约',
          description: '简洁现代的设计风格',
          category: 'modern',
          previewUrl: 'https://example.com/preview1.jpg',
        },
        {
          id: '2',
          name: '复古经典',
          description: '经典复古的设计风格',
          category: 'vintage',
          previewUrl: 'https://example.com/preview2.jpg',
        },
      ])
    })

    it('应该处理获取风格时的错误', async () => {
      mockPrisma.posterStyle.findMany.mockRejectedValue(new Error('Database error'))

      await expect(PosterDatabase.getStyles()).rejects.toThrow('获取海报风格失败')
    })
  })

  describe('getSizes', () => {
    it('应该成功获取海报尺寸列表', async () => {
      const mockSizes = [
        {
          id: '1',
          name: 'A4',
          dimensions: '210x297mm',
          ratio: '1:1.414',
          width: 210,
          height: 297,
          isActive: true,
          order: 1,
        },
      ]

      mockPrisma.posterSize.findMany.mockResolvedValue(mockSizes)

      const result = await PosterDatabase.getSizes()

      expect(mockPrisma.posterSize.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      })

      expect(result).toEqual([
        {
          id: '1',
          name: 'A4',
          dimensions: '210x297mm',
          ratio: '1:1.414',
          height: 297,
        },
      ])
    })

    it('应该处理获取尺寸时的错误', async () => {
      mockPrisma.posterSize.findMany.mockRejectedValue(new Error('Database error'))

      await expect(PosterDatabase.getSizes()).rejects.toThrow('获取海报尺寸失败')
    })
  })

  describe('getColorPalettes', () => {
    it('应该成功获取配色方案列表', async () => {
      const mockPalettes = [
        {
          id: '1',
          name: '清新蓝绿',
          colors: ['#00BCD4', '#4CAF50', '#8BC34A'],
          description: '清新自然的蓝绿配色',
          isActive: true,
          order: 1,
        },
      ]

      mockPrisma.colorPalette.findMany.mockResolvedValue(mockPalettes)

      const result = await PosterDatabase.getColorPalettes()

      expect(mockPrisma.colorPalette.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      })

      expect(result).toEqual([
        {
          id: '1',
          name: '清新蓝绿',
          colors: ['#00BCD4', '#4CAF50', '#8BC34A'],
          description: '清新自然的蓝绿配色',
        },
      ])
    })

    it('应该处理获取配色方案时的错误', async () => {
      mockPrisma.colorPalette.findMany.mockRejectedValue(new Error('Database error'))

      await expect(PosterDatabase.getColorPalettes()).rejects.toThrow('获取配色方案失败')
    })
  })

  describe('createPosterTask', () => {
    it('应该成功创建海报任务', async () => {
      const taskData = {
        userId: 'user123',
        description: '创建一个现代风格的海报',
        style: 'modern',
        size: 'A4',
        palette: 'blue-green',
        referenceImageUrl: 'https://example.com/ref.jpg',
        templateId: 'template1',
      }

      const mockCreatedTask = {
        id: 'task123',
        userId: 'user123',
        description: '创建一个现代风格的海报',
        style: 'modern',
        size: 'A4',
        palette: 'blue-green',
        referenceImageUrl: 'https://example.com/ref.jpg',
        resultImageUrl: '',
        createdAt: new Date('2024-01-01'),
        templateId: 'template1',
        status: 'pending',
        updatedAt: new Date('2024-01-01'),
      }

      mockPrisma.posterTask.create.mockResolvedValue(mockCreatedTask)

      const result = await PosterDatabase.createPosterTask(taskData)

      expect(mockPrisma.posterTask.create).toHaveBeenCalledWith({
        data: {
          userId: 'user123',
          description: '创建一个现代风格的海报',
          style: 'modern',
          size: 'A4',
          palette: 'blue-green',
          referenceImageUrl: 'https://example.com/ref.jpg',
          templateId: 'template1',
          resultImageUrl: '',
          status: 'pending',
        },
      })

      expect(result).toEqual({
        id: 'task123',
        userId: 'user123',
        description: '创建一个现代风格的海报',
        style: 'modern',
        size: 'A4',
        palette: 'blue-green',
        referenceImageUrl: 'https://example.com/ref.jpg',
        resultImageUrl: '',
        createdAt: new Date('2024-01-01'),
      })
    })

    it('应该处理创建任务时的错误', async () => {
      const taskData = {
        userId: 'user123',
        description: '创建一个现代风格的海报',
        style: 'modern',
        size: 'A4',
        palette: 'blue-green',
      }

      mockPrisma.posterTask.create.mockRejectedValue(new Error('Database error'))

      await expect(PosterDatabase.createPosterTask(taskData)).rejects.toThrow('创建海报任务失败')
    })
  })

  describe('updatePosterTaskResult', () => {
    it('应该成功更新海报任务结果', async () => {
      const taskId = 'task123'
      const resultImageUrl = 'https://example.com/result.jpg'

      mockPrisma.posterTask.update.mockResolvedValue({})

      await PosterDatabase.updatePosterTaskResult(taskId, resultImageUrl)

      expect(mockPrisma.posterTask.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: {
          resultImageUrl,
          status: 'completed',
          updatedAt: expect.any(Date),
        },
      })
    })

    it('应该处理更新任务结果时的错误', async () => {
      mockPrisma.posterTask.update.mockRejectedValue(new Error('Database error'))

      await expect(
        PosterDatabase.updatePosterTaskResult('task123', 'https://example.com/result.jpg')
      ).rejects.toThrow('更新海报任务结果失败')
    })
  })
})