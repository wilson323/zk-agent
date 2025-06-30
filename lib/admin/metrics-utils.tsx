import { Badge } from "@/components/ui/badge"
import React from "react"

export const getStatusColor = (percentage: number): string => {
  if (percentage < 50) {return "text-green-600"}
  if (percentage < 80) {return "text-yellow-600"}
  return "text-red-600"
}

export const getStatusBadge = (percentage: number): React.ReactElement => {
  if (percentage < 50) {
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800">
        正常
      </Badge>
    )
  }
  if (percentage < 80) {
    return (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
        警告
      </Badge>
    )
  }
  return <Badge variant="destructive">危险</Badge>
}