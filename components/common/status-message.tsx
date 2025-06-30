import type React from "react"
import { AlertCircle, CheckCircle2 } from "lucide-react"

interface StatusMessageProps {
  type: "success" | "error"
  message: string
}

export function StatusMessage({ type, message }: StatusMessageProps) {
  return (
    <div
      className={`flex items-center gap-2 p-3 rounded-md ${
        type === "success"
          ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
          : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
      }`}
    >
      {type === "success" ? (
        <CheckCircle2 className="h-5 w-5" />
      ) : (
        <AlertCircle className="h-5 w-5" />
      )}
      <span>{message}</span>
    </div>
  )
}
