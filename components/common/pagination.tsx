import type React from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  onPageChange: (page: number) => void
}

export function Pagination({ pagination, onPageChange }: PaginationProps) {
  if (pagination.pages <= 1) {
    return null
  }

  return (
    <div className="flex items-center justify-between mt-4">
      <div className="text-sm text-gray-500">
        显示 {(pagination.page - 1) * pagination.limit + 1} 到{" "}
        {Math.min(pagination.page * pagination.limit, pagination.total)} 条，共 {pagination.total} 条
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm">
          {pagination.page} / {pagination.pages}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.pages}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
