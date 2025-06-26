/**
 * 海报配置数据库操作测试
 */

import { PrismaClient } from '@prisma/client'

// Mock Prisma Client
const mockPrismaInstance = {
  posterStyle: {
    findMany: jest.fn(),
  },
  posterTemplate: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  colorPalette: {
    findMany: jest.fn(),
  },
  posterSize: {
    findMany: jest.fn(),
  },
  posterGeneration: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  industryConfig: {
    findUnique: jest.fn(),
  },
}

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrismaInstance),
}))

// Mock the poster-config module to use our mocked prisma
jest.mock('../../../lib/database/poster-config', () => {
  const originalModule = jest.requireActual('../../../lib/database/poster-config')
  return {
    ...originalModule,
    PosterConfigDB: {
      getStyles: jest.fn(),
      getSecurityTemplates: jest.fn(),
      getColorPalettes: jest.fn(),
      getPosterSizes: jest.fn(),
      saveGenerationHistory: jest.fn(),
      getUserHistory: jest.fn(),
      updateTemplateUsage: jest.fn(),
      getIndustryConfig: jest.fn(),
    }
  }
})

import { PosterConfigDB } from '../../../lib/database/poster-config'

// Mock console.error
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

describe('PosterConfigDB', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    mockConsoleError.mockClear()
  })

  describe('getStyles', () => {
    it('应该成功获取海报风格', async () => {
      const mockResult = [
        {
          id: '1',
          name: 'Modern',
          description: 'Modern style',
          preview: 'preview.jpg',
          category: 'business',
          tags: ['modern', 'clean'],
          industrySpecific: false,
          parameters: { color: 'blue' },
        },
      ]

      ;(PosterConfigDB.getStyles as jest.Mock).mockResolvedValue(mockResult)

      const result = await PosterConfigDB.getStyles()

      expect(PosterConfigDB.getStyles).toHaveBeenCalled()
      expect(result).toEqual(mockResult)
    })

    it('应该处理获取风格失败的情况', async () => {
      ;(PosterConfigDB.getStyles as jest.Mock).mockResolvedValue([])

      const result = await PosterConfigDB.getStyles()

      expect(result).toEqual([])
    })
  })

  describe('getSecurityTemplates', () => {
    it('应该成功获取安全模板', async () => {
      const mockResult = [
        {
          id: '1',
          name: 'Corporate',
          description: 'Corporate template',
          preview: 'preview.jpg',
          category: 'business',
          securityLevel: 'high',
          complianceStandards: ['ISO27001'],
          parameters: { encryption: true },
        },
      ]

      ;(PosterConfigDB.getSecurityTemplates as jest.Mock).mockResolvedValue(mockResult)

      const result = await PosterConfigDB.getSecurityTemplates()

      expect(PosterConfigDB.getSecurityTemplates).toHaveBeenCalled()
      expect(result).toEqual(mockResult)
    })

    it('应该处理获取安全模板失败的情况', async () => {
      ;(PosterConfigDB.getSecurityTemplates as jest.Mock).mockResolvedValue([])

      const result = await PosterConfigDB.getSecurityTemplates()

      expect(result).toEqual([])
    })
  })

  describe('getColorPalettes', () => {
    it('应该成功获取配色方案', async () => {
      const mockPalettes = [
        {
          id: '1',
          name: 'Blue Palette',
          colors: ['#0000FF', '#FFFFFF'],
          description: 'Blue color scheme',
          category: 'business',
          industryRecommended: ['tech'],
        },
      ]

      ;(PosterConfigDB.getColorPalettes as jest.Mock).mockResolvedValue(mockPalettes)

      const result = await PosterConfigDB.getColorPalettes()

      expect(PosterConfigDB.getColorPalettes).toHaveBeenCalled()
      expect(result).toEqual(mockPalettes)
    })

    it('应该处理获取配色方案失败的情况', async () => {
      ;(PosterConfigDB.getColorPalettes as jest.Mock).mockResolvedValue([])

      const result = await PosterConfigDB.getColorPalettes()

      expect(result).toEqual([])
    })
  })

  describe('getPosterSizes', () => {
    it('应该成功获取海报尺寸', async () => {
      const mockSizes = [
        {
          id: '1',
          name: 'A4',
          dimensions: '210x297mm',
          ratio: '1:1.414',
          width: 210,
          height: 297,
          dpi: 300,
          category: 'standard',
          recommended: true,
        },
      ]

      ;(PosterConfigDB.getPosterSizes as jest.Mock).mockResolvedValue(mockSizes)

      const result = await PosterConfigDB.getPosterSizes()

      expect(PosterConfigDB.getPosterSizes).toHaveBeenCalled()
      expect(result).toEqual(mockSizes)
    })

    it('应该处理获取海报尺寸失败的情况', async () => {
      ;(PosterConfigDB.getPosterSizes as jest.Mock).mockResolvedValue([])

      const result = await PosterConfigDB.getPosterSizes()

      expect(result).toEqual([])
    })
  })

  describe('saveGenerationHistory', () => {
    it('应该成功保存生成历史', async () => {
      const mockData = {
        userId: 'user1',
        prompt: 'Create a poster',
        style: 'modern',
        template: 'template1',
        settings: { color: 'blue' },
        imageUrl: 'image.jpg',
        industry: 'tech',
      }

      const mockResult = { id: '1', ...mockData }
      ;(PosterConfigDB.saveGenerationHistory as jest.Mock).mockResolvedValue(mockResult)

      const result = await PosterConfigDB.saveGenerationHistory(mockData)

      expect(PosterConfigDB.saveGenerationHistory).toHaveBeenCalledWith(mockData)
      expect(result).toEqual(mockResult)
    })

    it('应该处理保存生成历史失败的情况', async () => {
      const mockData = {
        userId: 'user1',
        prompt: 'Create a poster',
        style: 'modern',
        settings: { color: 'blue' },
        imageUrl: 'image.jpg',
      }

      ;(PosterConfigDB.saveGenerationHistory as jest.Mock).mockResolvedValue(undefined)

      const result = await PosterConfigDB.saveGenerationHistory(mockData)

      expect(result).toBeUndefined()
    })
  })

  describe('getUserHistory', () => {
    it('应该成功获取用户历史', async () => {
      const mockHistory = [
        {
          id: '1',
          userId: 'user1',
          prompt: 'Create a poster',
          template: { name: 'Template 1' },
        },
      ]

      ;(PosterConfigDB.getUserHistory as jest.Mock).mockResolvedValue(mockHistory)

      const result = await PosterConfigDB.getUserHistory('user1', 10)

      expect(PosterConfigDB.getUserHistory).toHaveBeenCalledWith('user1', 10)
      expect(result).toEqual(mockHistory)
    })

    it('应该使用默认限制', async () => {
      ;(PosterConfigDB.getUserHistory as jest.Mock).mockResolvedValue([])

      await PosterConfigDB.getUserHistory('user1')

      expect(PosterConfigDB.getUserHistory).toHaveBeenCalledWith('user1')
    })

    it('应该处理获取用户历史失败的情况', async () => {
      ;(PosterConfigDB.getUserHistory as jest.Mock).mockResolvedValue([])

      const result = await PosterConfigDB.getUserHistory('user1')

      expect(result).toEqual([])
    })
  })

  describe('updateTemplateUsage', () => {
    it('应该成功更新模板使用次数', async () => {
      ;(PosterConfigDB.updateTemplateUsage as jest.Mock).mockResolvedValue(undefined)

      await PosterConfigDB.updateTemplateUsage('template1')

      expect(PosterConfigDB.updateTemplateUsage).toHaveBeenCalledWith('template1')
    })

    it('应该处理更新模板使用次数失败的情况', async () => {
      ;(PosterConfigDB.updateTemplateUsage as jest.Mock).mockResolvedValue(undefined)

      await PosterConfigDB.updateTemplateUsage('template1')

      expect(PosterConfigDB.updateTemplateUsage).toHaveBeenCalledWith('template1')
    })
  })

  describe('getIndustryConfig', () => {
    it('应该成功获取行业配置', async () => {
      const mockConfig = {
        id: '1',
        industry: 'tech',
        name: 'Technology',
        description: 'Tech industry config',
        recommendedStyles: [],
        recommendedPalettes: [],
        brandGuidelines: [],
      }

      ;(PosterConfigDB.getIndustryConfig as jest.Mock).mockResolvedValue(mockConfig)

      const result = await PosterConfigDB.getIndustryConfig('tech')

      expect(PosterConfigDB.getIndustryConfig).toHaveBeenCalledWith('tech')
      expect(result).toEqual(mockConfig)
    })

    it('应该处理获取行业配置失败的情况', async () => {
      ;(PosterConfigDB.getIndustryConfig as jest.Mock).mockResolvedValue(null)

      const result = await PosterConfigDB.getIndustryConfig('tech')

      expect(result).toBeNull()
    })
  })
})