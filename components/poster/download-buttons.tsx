import type React from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface DownloadButtonsProps {
  onDownload: (format: string) => void
  generatedImage: string | null
}

export function DownloadButtons({ onDownload, generatedImage }: DownloadButtonsProps) {
  if (!generatedImage) {
    return null
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={() => onDownload("jpg")}>
        <Download className="mr-1 h-4 w-4" />
        JPG
      </Button>
      <Button size="sm" variant="outline" onClick={() => onDownload("png")}>
        <Download className="mr-1 h-4 w-4" />
        PNG
      </Button>
      <Button size="sm" variant="outline" onClick={() => onDownload("pdf")}>
        <Download className="mr-1 h-4 w-4" />
        PDF
      </Button>
    </div>
  )
}
