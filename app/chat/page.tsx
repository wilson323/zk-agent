// @ts-nocheck
"use client"

import { useState } from "react"
import { AgentCard } from "@/components/chat/agent-card"
import { NewAgentModal } from "@/components/admin/agent-list"
import { useAgents } from "@/hooks/use-fastgpt"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { StandardChatInterface } from "@/components/ag-ui/standard-chat-interface"

const ChatPage = () => {
  const [isNewAgentModalOpen, setIsNewAgentModalOpen] = useState(false)
  const { applications: agents, isLoading } = useAgents()
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)

  return (
    <div className="h-full flex">
      <div className="w-64 border-r flex-shrink-0 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Agents</h2>
          <Button size="icon" onClick={() => setIsNewAgentModalOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <Separator />
        <div className="mt-2 space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </>
          ) : (
            agents?.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onSelect={() => setSelectedAgent(agent.id)}
                onViewDetails={() => {}}
              />
            ))
          )}
        </div>
      </div>
      <div className="flex-1">
        {selectedAgent ? (
          <StandardChatInterface agentId={selectedAgent} />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Select an agent to start chatting
          </div>
        )}
      </div>
      <NewAgentModal isOpen={isNewAgentModalOpen} onClose={() => setIsNewAgentModalOpen(false)} />
    </div>
  )
}

export default ChatPage
