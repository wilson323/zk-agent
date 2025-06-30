import React from "react"
import { AlertTriangle, AlertCircle, Info, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export const getLevelIcon = (level: string): React.ReactElement => {
  switch (level) {
    case "INFO":
      return <Info className="h-4 w-4 text-blue-600" />
    case "WARN":
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    case "ERROR":
      return <AlertCircle className="h-4 w-4 text-red-600" />
    case "FATAL":
      return <XCircle className="h-4 w-4 text-red-800" />
    default:
      return <Info className="h-4 w-4 text-gray-600" />
  }
}

export const getLevelBadge = (level: string): React.ReactElement => {
  const variants = {
    INFO: "bg-blue-100 text-blue-800",
    WARN: "bg-yellow-100 text-yellow-800",
    ERROR: "bg-red-100 text-red-800",
    FATAL: "bg-red-200 text-red-900",
  }
  return (
    <Badge variant="secondary" className={variants[level as keyof typeof variants] || "bg-gray-100 text-gray-800"}>
      {level}
    </Badge>
  )
}