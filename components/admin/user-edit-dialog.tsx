import type React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getRoleText, getStatusText } from "@/lib/admin/constants"

interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: "USER" | "ADMIN" | "SUPER_ADMIN"
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETED"
  emailVerified: boolean
  lastLoginAt?: Date
  loginCount: number
  createdAt: Date
  updatedAt: Date
}

interface UserEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  onUpdateUser: (userId: string, updates: Partial<User>) => Promise<void>
}

export function UserEditDialog({ open, onOpenChange, user, onUpdateUser }: UserEditDialogProps) {
  const [editedUser, setEditedUser] = useState<User | null>(user)

  useEffect(() => {
    setEditedUser(user)
  }, [user])

  const handleSave = async () => {
    if (editedUser && user) {
      await onUpdateUser(user.id, {
        role: editedUser.role,
        status: editedUser.status,
      })
      onOpenChange(false)
    }
  }

  if (!editedUser) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑用户</DialogTitle>
          <DialogDescription>修改用户的角色和状态</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={editedUser.avatar || "/placeholder.svg"} alt={editedUser.name} />
              <AvatarFallback>{editedUser.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{editedUser.name}</div>
              <div className="text-sm text-gray-500">{editedUser.email}</div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">角色</label>
            <Select
              value={editedUser.role}
              onValueChange={(value) => setEditedUser({ ...editedUser, role: value as any })}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">{getRoleText("USER")}</SelectItem>
                <SelectItem value="ADMIN">{getRoleText("ADMIN")}</SelectItem>
                <SelectItem value="SUPER_ADMIN">{getRoleText("SUPER_ADMIN")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">状态</label>
            <Select
              value={editedUser.status}
              onValueChange={(value) => setEditedUser({ ...editedUser, status: value as any })}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">{getStatusText("ACTIVE")}</SelectItem>
                <SelectItem value="INACTIVE">{getStatusText("INACTIVE")}</SelectItem>
                <SelectItem value="SUSPENDED">{getStatusText("SUSPENDED")}</SelectItem>
                <SelectItem value="DELETED">{getStatusText("DELETED")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} className="flex-1">
              保存更改
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
