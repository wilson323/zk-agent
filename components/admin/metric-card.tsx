import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getStatusBadge } from "@/lib/admin/metrics-utils"

interface MetricCardProps {
  title: string
  icon: React.ElementType
  value: string | number
  percentage?: number
  description?: string
  children?: React.ReactNode
}

export function MetricCard({
  title,
  icon: Icon,
  value,
  percentage,
  description,
  children,
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-2">{value}</div>
        {percentage !== undefined && <Progress value={percentage} className="mb-2" />}
        <div className="flex justify-between text-xs text-muted-foreground">
          {description && <span>{description}</span>}
          {percentage !== undefined && getStatusBadge(percentage)}
          {children}
        </div>
      </CardContent>
    </Card>
  )
}
