// @ts-nocheck
/**
 * FastGPT API Configuration
 */

// Default API configuration
export const DEFAULT_API_CONFIG = {
  // API endpoint URL - using public URL, not sensitive
  baseUrl: "https://zktecoaihub.com/api",

  // Whether to use proxy - default enabled
  useProxy: true,

  // Retry count
  maxRetries: 3,

  // Request timeout (milliseconds)
  timeout: 60000,

  // Test connection timeout (milliseconds)
  testTimeout: 15000,
}

export const FastGPTConfig = {
  apiUrl: "https://api.fastgpt.in",
  apiKey: "", // Empty string, will be filled by server-side code
  defaultModel: "gpt-3.5-turbo",
  defaultAgentId: "", // Default agent ID
  useProxy: true, // Whether to use proxy
  maxTokens: 2048,
  temperature: 0.7,
}

// Local storage key names
export const STORAGE_KEYS = {
  API_CONFIG: "ai_chat_api_config",
  API_URL: "ai_chat_api_url",
  API_KEY: "ai_chat_api_key",
  USE_PROXY: "ai_chat_use_proxy",
  CURRENT_USER: "currentUser",
  CHAT_HISTORY: "ai_chat_history",
  SETTINGS: "ai_chat_settings",
  THEME: "ai_chat_theme",
  LANGUAGE: "ai_chat_language",
  DEFAULT_AGENT_INITIALIZED: "default_agent_initialized",
}

// Proxy configuration
export const PROXY_CONFIG = {
  // Proxy route
  route: "/api/proxy",

  // Get proxy URL
  getProxyUrl: (url: string) => {
    // If already a relative URL, return directly
    if (url.startsWith("/api/")) return url

    // Convert external URL to access through local proxy
    // Remove protocol part
    const urlWithoutProtocol = url.replace(/^https?:\/\//, "")
    return `/api/proxy?url=${encodeURIComponent(urlWithoutProtocol)}`
  },
}

// Import unified error messages
import { ERROR_MESSAGES } from '../lib/constants';

// Re-export for backward compatibility
export { ERROR_MESSAGES };

// Model types
export const MODEL_TYPES = {
  FASTGPT: "fastgpt",
  CUSTOM: "custom",
  OPENAI: "openai",
}

// Agent status
export const AGENT_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
}

// Helper functions for client-side
export const fastGPTConfig = {
  // Default to using proxy to avoid CORS issues
  useProxy: true,

  // Default API URL - this is not sensitive as it's just a domain
  defaultApiUrl: "https://zktecoaihub.com",

  // Function to get the API URL from storage or default
  getApiUrl: () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEYS.API_URL) || "https://zktecoaihub.com"
    }
    return "https://zktecoaihub.com"
  },

  // Function to check if proxy is enabled
  isProxyEnabled: () => {
    if (typeof window !== "undefined") {
      const value = localStorage.getItem(STORAGE_KEYS.USE_PROXY)
      return value === null ? true : value === "true"
    }
    return true
  },

  // Function to set proxy status
  setProxyEnabled: (enabled: boolean) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.USE_PROXY, enabled.toString())
    }
  },

  // Function to set API URL
  setApiUrl: (url: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.API_URL, url)
    }
  },
}
