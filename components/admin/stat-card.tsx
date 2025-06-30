import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface StatCardProps {
  title: string
  icon: React.ElementType
  value: string | number
  description?: string
  badgeText?: string
  badgeColorClass?: string
}

export function StatCard({
  title,
  icon: Icon,
  value,
  description,
  badgeText,
  badgeColorClass,
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-2">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        {badgeText && (
          <div className="mt-2">
            <Badge variant="secondary" className={badgeColorClass}>
              {badgeText}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
