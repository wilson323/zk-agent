import type React from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, ImageIcon } from "lucide-react"

interface ChatInputAreaProps {
  input: string
  setInput: (input: string) => void
  isLoading: boolean
  chatId: string | null
  handleSendMessage: () => void
  handleGenerateImage: () => void
  messagesLength: number
}

export function ChatInputArea({
  input,
  setInput,
  isLoading,
  chatId,
  handleSendMessage,
  handleGenerateImage,
  messagesLength,
}: ChatInputAreaProps) {
  return (
    <div className="p-4 border-t">
      <div className="flex items-end gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入消息..."
          className="flex-1 min-h-[80px] resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSendMessage()
            }
          }}
          disabled={isLoading || !chatId}
        />
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim() || !chatId}
            className="h-10 w-10 p-0"
          >
            <Send className="h-5 w-5" />
          </Button>
          <Button
            onClick={handleGenerateImage}
            disabled={isLoading || messagesLength === 0 || !chatId}
            className="h-10 w-10 p-0"
            variant="outline"
          >
            <ImageIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
