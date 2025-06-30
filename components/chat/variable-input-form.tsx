import type React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

interface VariableInputFormProps {
  requiredVariables: Record<string, string>
  variableValues: Record<string, string>
  setVariableValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
  onSubmit: () => void
  isLoading: boolean
}

export function VariableInputForm({
  requiredVariables,
  variableValues,
  setVariableValues,
  onSubmit,
  isLoading,
}: VariableInputFormProps) {
  const { toast } = useToast()

  const handleSubmit = () => {
    const missingVariables = Object.keys(requiredVariables).filter((key) => !variableValues[key])
    if (missingVariables.length > 0) {
      toast({
        title: "缺少必填信息",
        description: `请填写以下信息: ${missingVariables.join(", ")}`,
        variant: "destructive",
      })
      return
    }
    onSubmit()
  }

  return (
    <Card className="m-4 p-4">
      <h2 className="text-xl font-bold mb-4">请填写以下必要信息</h2>
      {Object.entries(requiredVariables).map(([key, description]) => (
        <div key={key} className="mb-4">
          <Label htmlFor={key} className="block text-sm font-medium mb-1">{description}</Label>
          <Input
            id={key}
            type="text"
            className="w-full p-2 border rounded"
            value={variableValues[key] || ""}
            onChange={(e) =>
              setVariableValues((prev) => ({
                ...prev,
                [key]: e.target.value,
              }))
            }
          />
        </div>
      ))}
      <Button onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? "提交中..." : "提交"}
      </Button>
    </Card>
  )
}
