import type React from "react"
import { cn } from "@/lib/utils"

type Attachment = {
  id: string
  type: "image" | "file" | "audio" | "video"
  url: string
  name: string
  size?: number
  thumbnail?: string
}

interface MessageAttachmentProps {
  attachment: Attachment
  isUserMessage?: boolean
}

export function MessageAttachment({ attachment, isUserMessage }: MessageAttachmentProps) {
  return (
    <div
      key={attachment.id}
      className={cn(
        "rounded-lg overflow-hidden",
        isUserMessage ? "bg-white/20" : "bg-gray-100 dark:bg-gray-700",
      )}
    >
      {attachment.type === "image" && (
        <img
          src={attachment.url || "/placeholder.svg"}
          alt={attachment.name}
          className="w-full h-auto max-h-60 object-cover"
        />
      )}
      {attachment.type === "file" && (
        <div className="p-3 flex items-center">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center mr-3">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{attachment.name}</p>
            {attachment.size && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {Math.round(attachment.size / 1024)} KB
              </p>
            )}
          </div>
          <button className="ml-2 text-blue-600 dark:text-blue-400 text-sm font-medium">下载</button>
        </div>
      )}
      {/* Add more attachment types (audio, video) as needed */}
    </div>
  )
}
