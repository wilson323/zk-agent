export interface PosterStyle {
  id: string
  name: string
  description: string
  preview: string
  category: string
}

export interface PosterSize {
  id: string
  name: string
  dimensions: string
  ratio: string
}

export interface ColorPalette {
  id: string
  name: string
  colors: string[]
  description: string
}

export const POSTER_STYLES: PosterStyle[] = [
  {
    id: "modern",
    name: "现代简约",
    description: "简洁线条，几何元素",
    preview: "/placeholder.svg?height=100&width=100&text=Modern",
    category: "business",
  },
  {
    id: "vintage",
    name: "复古风格",
    description: "怀旧色调，经典排版",
    preview: "/placeholder.svg?height=100&width=100&text=Vintage",
    category: "artistic",
  },
  {
    id: "minimalist",
    name: "极简主义",
    description: "留白设计，纯净美学",
    preview: "/placeholder.svg?height=100&width=100&text=Minimal",
    category: "business",
  },
  {
    id: "artistic",
    name: "艺术创意",
    description: "抽象表现，创意构图",
    preview: "/placeholder.svg?height=100&width=100&text=Art",
    category: "artistic",
  },
  {
    id: "tech",
    name: "科技未来",
    description: "渐变光效，数字感",
    preview: "/placeholder.svg?height=100&width=100&text=Tech",
    category: "tech",
  },
  {
    id: "nature",
    name: "自然清新",
    description: "绿色生态，有机形状",
    preview: "/placeholder.svg?height=100&width=100&text=Nature",
    category: "lifestyle",
  },
]

export const POSTER_SIZES: PosterSize[] = [
  { id: "a4", name: "A4 海报", dimensions: "210×297mm", ratio: "3:4" },
  { id: "a3", name: "A3 海报", dimensions: "297×420mm", ratio: "3:4" },
  { id: "square", name: "正方形", dimensions: "1080×1080px", ratio: "1:1" },
  { id: "story", name: "故事版", dimensions: "1080×1920px", ratio: "9:16" },
  { id: "banner", name: "横幅", dimensions: "1920×1080px", ratio: "16:9" },
  { id: "poster", name: "标准海报", dimensions: "600×800px", ratio: "3:4" },
]

export const COLOR_PALETTES: ColorPalette[] = [
  { id: "warm", name: "暖色调", colors: ["#FF6B6B", "#FFE66D", "#FF8E53"], description: "温暖活力" },
  { id: "cool", name: "冷色调", colors: ["#4ECDC4", "#45B7D1", "#96CEB4"], description: "清新冷静" },
  { id: "monochrome", name: "单色调", colors: ["#2C3E50", "#34495E", "#7F8C8D"], description: "经典黑白" },
  { id: "vibrant", name: "鲜艳色彩", colors: ["#E74C3C", "#F39C12", "#9B59B6"], description: "活力四射" },
  { id: "pastel", name: "柔和色彩", colors: ["#F8BBD9", "#E8F5E8", "#FFF2CC"], description: "温柔梦幻" },
  { id: "brand", name: "品牌色", colors: ["#6CB33F", "#8ED658", "#A8E6A3"], description: "品牌主色" },
]
