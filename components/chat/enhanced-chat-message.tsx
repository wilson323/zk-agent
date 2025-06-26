// @ts-nocheck
import type React from "react"
import { Button } from "@/components/ui/button"
import { Share2 } from "lucide-react"

import { EnhancedShareDialog } from "@/components/sharing/enhanced-share-dialog"
import { EnhancedLikeButton } from "@/components/likes/enhanced-like-button"

interface EnhancedChatMessageProps {
  message: {
    id: string
    role: "user" | "assistant"
    content: string
  }
}

const EnhancedChatMessage: React.FC<EnhancedChatMessageProps> = ({ message }) => {
  return (
    <div className="flex flex-col">
      <div
        className={`rounded-md p-2 ${message.role === "user" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}
      >
        {message.content}
      </div>

      <div className="flex items-center gap-2 mt-2">
        <EnhancedLikeButton
          itemId={message.id}
          itemType="message"
          userId="current-user" // Get from auth context
          variant="compact"
          showStats={true}
        />

        <EnhancedShareDialog
          contentId={message.id}
          contentType="conversation"
          contentTitle={`AI对话消息 - ${message.content.substring(0, 50)}...`}
          contentDescription={`来自 ${message.role === "user" ? "用户" : "AI助手"} 的消息`}
        >
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <Share2 className="h-3 w-3" />
          </Button>
        </EnhancedShareDialog>
      </div>
    </div>
  )
}

export default EnhancedChatMessage
