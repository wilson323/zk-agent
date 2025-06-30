// @ts-nocheck
/**
 * @file Testimonials Section Component
 * @description 用户评价展示组件，包含轮播效果和用户头像
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

"use client"

import { TESTIMONIALS_DATA } from "@/lib/welcome/constants"

// 星级评分组件
const StarRating = memo<{ rating: number; size?: 'sm' | 'md' | 'lg' }>(({ 
  rating, 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  return (
    <div className="flex items-center space-x-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`${sizeClasses[size]} ${
            index < rating
              ? 'text-yellow-400 fill-current'
              : 'text-gray-300 dark:text-gray-600'
          }`}
        />
      ))}
    </div>
  )
})

StarRating.displayName = 'StarRating'

// 评价卡片组件
const TestimonialCard = memo<{ 
  testimonial: TestimonialData
  isActive: boolean
}>(({ testimonial, isActive }) => {
  const handleLike = useCallback(() => {
    // 埋点统计
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'like', {
        event_category: 'Testimonial',
        event_label: testimonial.name
      })
    }
  }, [testimonial.name])

  return (
    <Card 
      className={`group relative overflow-hidden transition-all duration-500 border-0 bg-white/90 backdrop-blur-sm dark:bg-gray-800/90 shadow-lg ${
        isActive 
          ? 'scale-105 shadow-xl' 
          : 'scale-95 opacity-75 hover:scale-100 hover:opacity-90'
      }`}
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white/50 to-purple-50/50 dark:from-gray-800/50 dark:via-gray-700/50 dark:to-gray-600/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* 引用图标 */}
      <div className="absolute top-4 right-4 opacity-20">
        <Quote className="h-8 w-8 text-blue-600 dark:text-blue-400" />
      </div>
      
      <CardContent className="relative p-6 space-y-4">
        {/* 用户信息 */}
        <div className="flex items-start space-x-4">
          <Avatar className="h-12 w-12 ring-2 ring-blue-100 dark:ring-blue-900">
            <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
              {testimonial.name.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {testimonial.name}
              </h4>
              {testimonial.isVerified && (
                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                  <Sparkles className="h-3 w-3 mr-1" />
                  认证用户
                </Badge>
              )}
            </div>
            
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {testimonial.role} • {testimonial.company}
            </p>
            
            <div className="flex items-center space-x-2 mt-2">
              <StarRating rating={testimonial.rating} size="sm" />
              <Badge variant="outline" className="text-xs">
                {testimonial.category}
              </Badge>
            </div>
          </div>
        </div>
        
        {/* 评价内容 */}
        <blockquote className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 italic">
          "{testimonial.content}"
        </blockquote>
        
        {/* 底部信息 */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(testimonial.date).toLocaleDateString('zh-CN')}
          </span>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className="text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
          >
            <ThumbsUp className="h-3 w-3 mr-1" />
            {testimonial.likes}
          </Button>
        </div>
      </CardContent>
      
      {/* 悬浮光效 */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-sm" />
    </Card>
  )
})

TestimonialCard.displayName = 'TestimonialCard'

// 轮播控制组件
const CarouselControls = memo<{
  currentIndex: number
  totalItems: number
  onPrevious: () => void
  onNext: () => void
  onDotClick: (index: number) => void
}>(({ currentIndex, totalItems, onPrevious, onNext, onDotClick }) => {
  return (
    <div className="flex items-center justify-center space-x-4 mt-8">
      <Button
        variant="outline"
        size="sm"
        onClick={onPrevious}
        className="h-10 w-10 rounded-full p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <div className="flex space-x-2">
        {Array.from({ length: totalItems }).map((_, index) => (
          <button
            key={index}
            onClick={() => onDotClick(index)}
            className={`h-2 w-2 rounded-full transition-all duration-200 ${
              index === currentIndex
                ? 'bg-blue-600 w-6'
                : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
            }`}
          />
        ))}
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={onNext}
        className="h-10 w-10 rounded-full p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
})

CarouselControls.displayName = 'CarouselControls'

// 统计信息组件
const TestimonialStats = memo(() => {
  const stats = [
    { icon: MessageSquare, label: '用户评价', value: '2,500+' },
    { icon: Star, label: '平均评分', value: '4.8/5' },
    { icon: Users, label: '认证用户', value: '1,200+' }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12">
      {stats.map((stat, index) => (
        <div key={index} className="text-center group">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 mb-3 group-hover:scale-110 transition-transform duration-200">
            <stat.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stat.value}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  )
})

TestimonialStats.displayName = 'TestimonialStats'

// 主组件
const TestimonialsSection = memo(() => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  // 自动轮播
  useEffect(() => {
    if (!isAutoPlaying) {return}

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonialsData.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [isAutoPlaying])

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => 
      prev === 0 ? testimonialsData.length - 1 : prev - 1
    )
    setIsAutoPlaying(false)
  }, [])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % testimonialsData.length)
    setIsAutoPlaying(false)
  }, [])

  const handleDotClick = useCallback((index: number) => {
    setCurrentIndex(index)
    setIsAutoPlaying(false)
  }, [])

  // 获取当前显示的评价（显示3个）
  const getVisibleTestimonials = () => {
    const visible = []
    for (let i = 0; i < 3; i++) {
      const index = (currentIndex + i) % testimonialsData.length
      visible.push({
        ...testimonialsData[index],
        isActive: i === 1 // 中间的卡片为激活状态
      })
    }
    return visible
  }

  return (
    <div className="space-y-8">
      {/* 轮播区域 */}
      <div className="relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {getVisibleTestimonials().map((testimonial, index) => (
            <TestimonialCard
              key={`${testimonial.id}-${currentIndex}-${index}`}
              testimonial={testimonial}
              isActive={testimonial.isActive}
            />
          ))}
        </div>
        
        {/* 轮播控制 */}
        <CarouselControls
          currentIndex={currentIndex}
          totalItems={testimonialsData.length}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onDotClick={handleDotClick}
        />
      </div>
      
      {/* 统计信息 */}
      <TestimonialStats />
      
      {/* 底部提示 */}
      <div className="text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          所有评价均来自真实用户 • 定期更新 • 
          <button 
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className="text-blue-600 dark:text-blue-400 hover:underline ml-1"
          >
            {isAutoPlaying ? '暂停自动播放' : '开启自动播放'}
          </button>
        </p>
      </div>
    </div>
  )
})

TestimonialsSection.displayName = 'TestimonialsSection'

export default TestimonialsSection 