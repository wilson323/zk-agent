export interface ProgressStep {
  id: string
  name: string
  description?: string
  status: "pending" | "running" | "completed" | "error"
  progress: number
  startTime?: Date
  endTime?: Date
  estimatedDuration?: number
  metadata?: Record<string, any>
}
