import { useState, useEffect } from "react"

export const useCountAnimation = (target: number, duration: number = 2000) => {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    let startTime: number
    let animationFrame: number

    const animate = (timestamp: number) => {
      if (!startTime) {startTime = timestamp}
      const progress = Math.min((timestamp - startTime) / duration, 1)
      
      // 使用缓动函数
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      setCurrent(Math.floor(target * easeOutQuart))

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [target, duration])

  return current
}
