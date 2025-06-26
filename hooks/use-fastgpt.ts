// @ts-nocheck
/**
 * @file FastGPT Hooks
 * @description FastGPT相关的React Hooks
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

"use client"

import { useFastGPT as useContextFastGPT } from "@/contexts/FastGPTContext"

// 导出FastGPT上下文hook
export const useFastGPT = useContextFastGPT

// 导出agents相关的hook
export const useAgents = () => {
  const context = useFastGPT()
  
  return {
    applications: context.applications,
    isLoading: context.isLoading,
    fetchApplications: context.fetchApplications,
    selectApplication: context.selectApplication,
    selectedApp: context.selectedApp
  }
}

// 导出聊天会话相关的hook
export const useChatSessions = () => {
  const context = useFastGPT()
  
  return {
    chatSessions: context.chatSessions,
    selectedSession: context.selectedSession,
    fetchChatSessions: context.fetchChatSessions,
    selectChatSession: context.selectChatSession,
    createChatSession: context.createChatSession,
    hasMoreSessions: context.hasMoreSessions,
    currentPage: context.currentPage
  }
}

// 导出API配置相关的hook
export const useApiConfig = () => {
  const context = useFastGPT()
  
  return {
    isConfigured: context.isConfigured,
    configureApi: context.configureApi,
    currentUser: context.currentUser,
    setCurrentUser: context.setCurrentUser
  }
} 