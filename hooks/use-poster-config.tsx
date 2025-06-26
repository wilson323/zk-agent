// @ts-nocheck
"use client"

/**
 * 海报配置数据Hook
 * 从数据库获取配置信息
 */

import { useState, useEffect } from "react"
import type { PosterStyle, PosterSize, ColorPalette } from "@/types/poster"

interface PosterConfig {
  styles: PosterStyle[]
  sizes: PosterSize[]
  palettes: ColorPalette[]
}

export function usePosterConfig() {
  const [config, setConfig] = useState<PosterConfig>({
    styles: [],
    sizes: [],
    palettes: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch("/api/poster/config?type=all")
        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || "获取配置失败")
        }

        setConfig(result.data)
      } catch (err) {
        // Error handled by setting error state
        setError(err instanceof Error ? err.message : "获取配置失败")
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [])

  const refetch = () => {
    setLoading(true)
    setError(null)
    // 重新获取配置
    const fetchConfig = async () => {
      try {
        const response = await fetch("/api/poster/config?type=all")
        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || "获取配置失败")
        }

        setConfig(result.data)
      } catch (err) {
        // Error handled by setting error state
        setError(err instanceof Error ? err.message : "获取配置失败")
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }

  return {
    config,
    loading,
    error,
    refetch,
  }
}
