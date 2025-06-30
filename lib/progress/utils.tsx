import React from "react"
import { CheckCircle2, Loader2, AlertCircle, Clock } from "lucide-react"
import type { ProgressStep } from "@/types/progress"

export const getStepIcon = (step: ProgressStep): React.ReactElement => {
  switch (step.status) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case "running":
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
    case "error":
      return <AlertCircle className="h-4 w-4 text-red-500" />
    default:
      return <Clock className="h-4 w-4 text-gray-400" />
  }
}

export const getStepStatusColor = (step: ProgressStep): string => {
  switch (step.status) {
    case "completed":
      return "bg-green-500/10 text-green-500 border-green-500/20"
    case "running":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20"
    case "error":
      return "bg-red-500/10 text-red-500 border-red-500/20"
    default:
      return "bg-gray-500/10 text-gray-500 border-gray-500/20"
  }
}
