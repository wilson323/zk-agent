// @ts-nocheck
"use client"

import { MessageAttachment } from "@/components/chat/message-attachment"
import { MessageActions } from "@/components/chat/message-actions"
import { EditableMessageContent } from "@/components/chat/editable-message-content"
import { EnhancedShareDialog } from "@/components/sharing/enhanced-share-dialog"
import { EnhancedLikeButton } from "@/components/likes/enhanced-like-button"

// 在 ChatMessageProps 类型中添加 onEdit 属性
type ChatMessageProps = {
  message: Message
  agent?: Agent | null
  index: number
  onLike: () => void
  onDislike: () => void
  onCopy: () => void
  onFavorite: () => void
  onShare: () => void
  onEdit?: (messageId: string, newContent: string) => void
  formatTime: (date: Date) => string
}

// 在 ChatMessage 组件中添加编辑状态和处理函数
export function ChatMessage({
  message,
  agent,
  index,
  onLike,
  onDislike,
  onCopy,
  onFavorite,
  onShare,
  onEdit,
  formatTime,
}: ChatMessageProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(message.content)

  // 处理编辑内容变化
  const handleEditChange = (newContent: string) => {
    setEditedContent(newContent)
  }

  // 保存编辑
  const handleSaveEdit = () => {
    if (editedContent.trim() && onEdit) {
      onEdit(message.id, editedContent)
    }
    setIsEditing(false)
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setEditedContent(message.content)
    setIsEditing(false)
  }

  return (
    <div
      className={cn(
        "group animate-in fade-in-0 slide-in-from-bottom-3 duration-300",
        message.role === "user" ? "justify-end" : "justify-start",
        "flex",
      )}
      style={{ animationDelay: `${index * 0.1}s` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {message.role !== "user" && (
        <Avatar className="h-8 w-8 mr-2 mt-1 flex-shrink-0">
          <AvatarImage src={agent?.avatar || "/placeholder.svg?height=32&width=32"} alt={agent?.name || "AI"} />
          <AvatarFallback style={{ backgroundColor: agent?.config?.avatarColor || "#6cb33f" }}>
            {agent?.name?.charAt(0).toUpperCase() || "AI"}
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl p-4 shadow-sm transition-all duration-200 hover:shadow-md",
          message.role === "user"
            ? "bg-[#6cb33f] text-white rounded-tr-none ml-auto"
            : "bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-tl-none",
          message.role === "system" &&
            "bg-gray-100/90 dark:bg-gray-700/90 backdrop-blur-sm text-gray-600 dark:text-gray-300 text-sm italic",
        )}
      >
        {isEditing && message.role === "user" ? (
          <EditableMessageContent
            initialContent={editedContent}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
          />
        ) : (
          <div className={cn("text-sm", message.role === "user" ? "text-white" : "text-gray-800 dark:text-gray-200")}>
            {message.content}
          </div>
        )}

        {/* 消息附件 */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map((attachment) => (
              <MessageAttachment
                key={attachment.id}
                attachment={attachment}
                isUserMessage={message.role === "user"}
              />
            ))}
          </div>
        )}

        <div className="mt-1 flex justify-between items-center text-xs">
          <span className={cn(message.role === "user" ? "text-green-100" : "text-gray-500 dark:text-gray-400")}>
            {formatTime(message.timestamp)}
          </span>

          {message.role === "assistant" ? (
            <div className={cn("flex space-x-1 transition-opacity duration-200", isHovered ? "opacity-100" : "opacity-0")}>
              <MessageActions
                onLike={onLike}
                onDislike={onDislike}
                onCopy={onCopy}
                onFavorite={onFavorite}
                onShare={onShare}
                isFavorite={message.isFavorite || false}
                isHovered={isHovered}
              />
              <EnhancedLikeButton
                itemId={message.id}
                itemType="chat_message"
                initialLiked={message.feedback === "like"}
                initialCount={0} // You might want to fetch actual like count
                size="sm"
                showCount={true}
              />
              <EnhancedShareDialog
                open={false} // Control visibility via state if needed
                onOpenChange={() => {}} // Handle open/close state
                config={{
                  contentId: message.id,
                  contentType: "chat_message",
                  title: `AI对话消息 - ${message.content.substring(0, 50)}...`,
                  description: `来自 ${message.role === "user" ? "用户" : "AI助手"} 的消息`,
                }}
              >
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <Share2 className="h-3 w-3" />
                </Button>
              </EnhancedShareDialog>
            </div>
          ) : (
            <div
              className={cn("flex space-x-1 transition-opacity duration-200", isHovered ? "opacity-100" : "opacity-0")}
            >
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full text-green-100 hover:text-white hover:bg-white/10"
                  onClick={() => setIsEditing(true)}
                  title="编辑"
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      {message.role === "user" && (
        <Avatar className="h-8 w-8 ml-2 mt-1 flex-shrink-0">
          <AvatarImage src="/images/user-avatar.png" alt="用户" />
          <AvatarFallback>用户</AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}

