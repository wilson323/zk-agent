import type { LucideIcon } from "lucide-react"

export interface Agent {
  id: string
  name: string
  description: string
  icon: LucideIcon
  color: string
  bgColor: string
  textColor: string
  borderColor: string
  features: string[]
}

export interface AgentData {
  id: string
  name: string
  description: string
  avatar: string
  rating: number
  users: number
  category: string
  href: string
  isPopular?: boolean
  isNew?: boolean
}
