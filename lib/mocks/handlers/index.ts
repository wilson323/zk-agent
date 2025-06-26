/* eslint-disable */
// @ts-nocheck
/**
 * @file Mock Handlers Index
 * @description 集中管理所有Mock API处理器
 * @author ZK-Agent Team A
 * @date 2024-12-19
 */

import { agentsHandlers } from './agents'
import { chatHandlers } from './chat'
import { cadHandlers } from './cad'
import { posterHandlers } from './poster'
import { authHandlers } from './auth'

// 导出所有处理器
export const handlers: any = [
  ...agentsHandlers,
  ...chatHandlers,
  ...cadHandlers,
  ...posterHandlers,
  ...authHandlers
]

// 按模块导出，便于按需使用
export { agentsHandlers as any, chatHandlers as any, cadHandlers as any, posterHandlers as any, authHandlers as any } 