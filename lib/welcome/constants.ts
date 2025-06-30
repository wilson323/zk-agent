import { MessageSquare, Zap, FileText, Palette, Star, Users, ArrowRight, Sparkles, Bot, TrendingUp, Clock, Globe, Shield, Quote, ChevronLeft, ChevronRight, ThumbsUp } from "lucide-react"
import type { Agent, AgentData } from "@/types/agent"

export const AGENTS: Agent[] = [
  {
    id: "cad-analyzer",
    name: "CAD解读智能体",
    description: "多格式文件上传、结构识别、设备统计、风险评估",
    icon: FileText,
    color: "from-emerald-500 via-green-500 to-teal-500",
    bgColor: "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20",
    textColor: "text-emerald-600 dark:text-emerald-400",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    features: ["多格式CAD解析", "结构智能识别", "设备统计分析", "风险评估报告"],
  },
  {
    id: "conversation",
    name: "对话智能体",
    description: "多轮对话、文件上传、上下文记忆、专业问答",
    icon: MessageSquare,
    color: "from-blue-500 via-indigo-500 to-purple-500",
    bgColor: "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20",
    textColor: "text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-200 dark:border-blue-800",
    features: ["多轮智能对话", "文件上传分析", "上下文记忆", "专业领域问答"],
  },
  {
    id: "poster-generator",
    name: "海报设计智能体",
    description: "创意输入、风格选择、实时预览、多格式导出",
    icon: Palette,
    color: "from-purple-500 via-pink-500 to-rose-500",
    bgColor: "bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20",
    textColor: "text-purple-600 dark:text-purple-400",
    borderColor: "border-purple-200 dark:border-purple-800",
    features: ["AI创意设计", "多风格选择", "实时预览", "高质量导出"],
  },
]



export interface TestimonialData {
  id: string
  name: string
  role: string
  company: string
  avatar: string
  rating: number
  content: string
  date: string
  category: string
  isVerified: boolean
  likes: number
}

export const TESTIMONIALS_DATA: TestimonialData[] = [
  {
    id: 'testimonial-1',
    name: '张工程师',
    role: '高级工程师',
    company: '中建集团',
    avatar: '/images/avatars/user1.jpg',
    rating: 5,
    content: 'CAD分析功能非常强大，帮助我们团队快速识别设计问题，大大提升了工作效率。AI的分析结果准确度很高，为我们的项目节省了大量时间。',
    date: '2024-12-15',
    category: 'CAD分析',
    isVerified: true,
    likes: 128
  },
  {
    id: 'testimonial-2',
    name: '李设计师',
    role: '创意总监',
    company: '广告公司',
    avatar: '/images/avatars/user2.jpg',
    rating: 5,
    content: '海报生成器的效果超出预期！AI能够理解我的设计需求，生成的作品既专业又有创意。现在我们的设计效率提升了300%。',
    date: '2024-12-14',
    category: '海报生成',
    isVerified: true,
    likes: 95
  },
  {
    id: 'testimonial-3',
    name: '王产品经理',
    role: '产品经理',
    company: '科技公司',
    avatar: '/images/avatars/user3.jpg',
    rating: 4,
    content: '智能对话助手的回答质量很高，能够准确理解复杂的业务问题。团队成员都很喜欢使用，显著提升了我们的工作协作效率。',
    date: '2024-12-13',
    category: '智能对话',
    isVerified: true,
    likes: 76
  },
  {
    id: 'testimonial-4',
    name: '陈数据分析师',
    role: '数据科学家',
    company: '金融机构',
    avatar: '/images/avatars/user4.jpg',
    rating: 5,
    content: '平台的数据分析功能非常全面，可视化效果出色。AI能够自动发现数据中的关键洞察，为我们的决策提供了强有力的支持。',
    date: '2024-12-12',
    category: '数据分析',
    isVerified: true,
    likes: 112
  },
  {
    id: 'testimonial-5',
    name: '刘开发者',
    role: '全栈工程师',
    company: '互联网公司',
    avatar: '/images/avatars/user5.jpg',
    rating: 5,
    content: 'API接口设计得很好，文档详细，集成简单。代码审查功能帮助我们团队提升了代码质量，减少了bug数量。',
    date: '2024-12-11',
    category: '开发工具',
    isVerified: true,
    likes: 89
  },
  {
    id: 'testimonial-6',
    name: '赵运营总监',
    role: '运营总监',
    company: '电商平台',
    avatar: '/images/avatars/user6.jpg',
    rating: 4,
    content: '内容创作助手帮助我们快速生成高质量的营销文案，不同风格的内容都能很好地满足需求。团队的内容产出效率提升了很多。',
    date: '2024-12-10',
    category: '内容创作',
    isVerified: true,
    likes: 67
  }
]




export const FEATURED_AGENTS: AgentData[] = [
  {
    id: 'fastgpt-assistant',
    name: 'FastGPT助手',
    description: '基于FastGPT的智能对话助手，支持多轮对话和上下文理解，为您提供专业的问题解答和智能建议。',
    avatar: '/images/agents/fastgpt.png',
    rating: 4.8,
    users: 12500,
    category: '对话助手',
    href: '/chat',
    isPopular: true
  },
  {
    id: 'cad-analyzer',
    name: 'CAD分析专家',
    description: '专业的CAD文件分析工具，支持多种格式，提供详细的工程分析和优化建议，助力工程设计。',
    avatar: '/images/agents/cad.png',
    rating: 4.6,
    users: 8900,
    category: '工程分析',
    href: '/cad-analyzer'
  },
  {
    id: 'poster-generator',
    name: '海报生成器',
    description: '智能海报设计工具，提供丰富的模板和自定义选项，快速生成专业设计作品，满足各种场景需求。',
    avatar: '/images/agents/poster.png',
    rating: 4.9,
    users: 15600,
    category: '设计创意',
    href: '/poster-generator',
    isNew: true
  },
  {
    id: 'data-analyst',
    name: '数据分析师',
    description: '智能数据分析助手，支持多种数据格式，提供深度洞察和可视化报告，让数据说话。',
    avatar: '/images/agents/data.png',
    rating: 4.7,
    users: 6800,
    category: '数据分析',
    href: '/analytics'
  },
  {
    id: 'code-reviewer',
    name: '代码审查员',
    description: '专业的代码审查工具，支持多种编程语言，提供代码质量分析和改进建议，提升代码质量。',
    avatar: '/images/agents/code.png',
    rating: 4.5,
    users: 9200,
    category: '开发工具',
    href: '/code-review'
  },
  {
    id: 'content-writer',
    name: '内容创作者',
    description: '智能内容创作助手，支持多种文体和风格，帮助您快速生成高质量内容，激发创作灵感。',
    avatar: '/images/agents/writer.png',
    rating: 4.8,
    users: 11400,
    category: '内容创作',
    href: '/content'
  }
]

export const QUICK_START_ITEMS = [
  {
    icon: MessageSquare,
    title: '智能对话',
    description: '与AI助手进行自然语言对话，获得专业的问题解答和建议。支持多轮对话、上下文理解和个性化回复。',
    href: '/chat',
    badge: '热门',
    badgeVariant: 'default' as const,
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    features: ['多轮对话', '上下文理解', '个性化回复']
  },
  {
    icon: FileText,
    title: 'CAD分析',
    description: '上传CAD文件，获得专业的工程分析和优化建议。支持多种文件格式，提供详细的分析报告。',
    href: '/cad-analyzer',
    badge: '专业',
    badgeVariant: 'secondary' as const,
    iconColor: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    features: ['多格式支持', '专业分析', '优化建议']
  },
  {
    icon: Palette,
    title: '海报生成',
    description: '使用AI技术快速生成专业的海报和设计作品。提供多种模板和自定义选项，满足各种设计需求。',
    href: '/poster-generator',
    badge: '创意',
    badgeVariant: 'outline' as const,
    iconColor: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    features: ['多种模板', 'AI生成', '自定义设计']
  }
] as const

export const QUICK_STATS_ITEMS = [
  { icon: MessageSquare, label: '对话次数', value: '100K+', color: 'text-blue-600' },
  { icon: FileText, label: 'CAD分析', value: '5K+', color: 'text-purple-600' },
  { icon: Palette, label: '海报生成', value: '8K+', color: 'text-green-600' }
]


export const FEATURED_AGENTS: AgentData[] = [
  {
    id: 'fastgpt-assistant',
    name: 'FastGPT助手',
    description: '基于FastGPT的智能对话助手，支持多轮对话和上下文理解，为您提供专业的问题解答和智能建议。',
    avatar: '/images/agents/fastgpt.png',
    rating: 4.8,
    users: 12500,
    category: '对话助手',
    href: '/chat',
    isPopular: true
  },
  {
    id: 'cad-analyzer',
    name: 'CAD分析专家',
    description: '专业的CAD文件分析工具，支持多种格式，提供详细的工程分析和优化建议，助力工程设计。',
    avatar: '/images/agents/cad.png',
    rating: 4.6,
    users: 8900,
    category: '工程分析',
    href: '/cad-analyzer'
  },
  {
    id: 'poster-generator',
    name: '海报生成器',
    description: '智能海报设计工具，提供丰富的模板和自定义选项，快速生成专业设计作品，满足各种场景需求。',
    avatar: '/images/agents/poster.png',
    rating: 4.9,
    users: 15600,
    category: '设计创意',
    href: '/poster-generator',
    isNew: true
  },
  {
    id: 'data-analyst',
    name: '数据分析师',
    description: '智能数据分析助手，支持多种数据格式，提供深度洞察和可视化报告，让数据说话。',
    avatar: '/images/agents/data.png',
    rating: 4.7,
    users: 6800,
    category: '数据分析',
    href: '/analytics'
  },
  {
    id: 'code-reviewer',
    name: '代码审查员',
    description: '专业的代码审查工具，支持多种编程语言，提供代码质量分析和改进建议，提升代码质量。',
    avatar: '/images/agents/code.png',
    rating: 4.5,
    users: 9200,
    category: '开发工具',
    href: '/code-review'
  },
  {
    id: 'content-writer',
    name: '内容创作者',
    description: '智能内容创作助手，支持多种文体和风格，帮助您快速生成高质量内容，激发创作灵感。',
    avatar: '/images/agents/writer.png',
    rating: 4.8,
    users: 11400,
    category: '内容创作',
    href: '/content'
  }
]
