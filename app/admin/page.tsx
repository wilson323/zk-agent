// @ts-nocheck
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function AdminPage() {
  return (
    <ProtectedRoute requireAuth requireAdmin>
      {/* 现有的管理员页面内容 */}
    </ProtectedRoute>
  )
}
