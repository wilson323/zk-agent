import { useState, useEffect } from "react"

export function useDevicePerformance() {
  const [isLowEndDevice, setIsLowEndDevice] = useState(false)

  useEffect(() => {
    const checkDevicePerformance = () => {
      const hardwareConcurrency = navigator.hardwareConcurrency || 2
      const deviceMemory = (navigator as any).deviceMemory || 4
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      const isLowEnd = hardwareConcurrency <= 2 || deviceMemory <= 2 || isMobile
      setIsLowEndDevice(isLowEnd)
    }

    checkDevicePerformance()
  }, [])

  return isLowEndDevice
}
