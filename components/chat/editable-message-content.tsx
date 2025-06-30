import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"

interface EditableMessageContentProps {
  initialContent: string
  onSave: (newContent: string) => void
  onCancel: () => void
}

export function EditableMessageContent({
  initialContent,
  onSave,
  onCancel,
}: EditableMessageContentProps) {
  const [editedContent, setEditedContent] = useState(initialContent)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [])

  const handleEditChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedContent(e.target.value)
    e.target.style.height = "auto"
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  const handleSave = () => {
    onSave(editedContent)
  }

  return (
    <div className="flex flex-col">
      <textarea
        ref={textareaRef}
        value={editedContent}
        onChange={handleEditChange}
        className="bg-transparent border-0 text-white resize-none focus:ring-0 focus:outline-none p-0 min-h-[24px]"
        style={{ height: "auto" }}
      />
      <div className="flex justify-end mt-2 space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-7 px-2 text-white/80 hover:text-white hover:bg-white/10"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          取消
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          className="h-7 px-2 text-white/80 hover:text-white hover:bg-white/10"
        >
          <Check className="h-3.5 w-3.5 mr-1" />
          保存
        </Button>
      </div>
    </div>
  )
}
