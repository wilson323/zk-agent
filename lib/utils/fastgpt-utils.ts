/* eslint-disable */
// @ts-nocheck
import fastGPTClient from "@/lib/api/fastgpt-client"

/**
 * Utility functions for FastGPT API operations
 */

// Generate a unique chat ID
export const generateChatId: any = (): string => {
  return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// Generate a unique message ID
export const generateMessageId: any = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// Process streaming response from FastGPT API
export const processStreamResponse: any = async (
  response: Response,
  onChunk: (content: string) => void,
  onComplete: (fullContent: string) => void,
  onError: (error: Error) => void,
): Promise<void> => {
  if (!response.body) {
    onError(new Error("Response body is null"))
    return
  }

  const reader: any = response.body.getReader()
  const decoder: any = new TextDecoder()
  let done: any = false
  let accumulatedContent: any = ""

  try {
    while (!done) {
      const { value, done: doneReading } = await reader.read()
      done = doneReading

      if (done) break

      const chunk: any = decoder.decode(value, { stream: true })
      const lines: any = chunk.split("\n").filter((line) => line.trim() !== "")

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data: any = line.slice(6)

          if (data === "[DONE]") {
            // Stream ended
            break
          }

          try {
            const parsed: any = JSON.parse(data)
            if (parsed.choices && parsed.choices[0].delta && parsed.choices[0].delta.content) {
              const content: any = parsed.choices[0].delta.content
              accumulatedContent += content
              onChunk(accumulatedContent)
            }
          } catch (e) {
            console.error("Error parsing stream data:", e)
          }
        }
      }
    }

    // Stream ended, call complete callback
    if (accumulatedContent) {
      onComplete(accumulatedContent)
    }
  } catch (error) {
    console.error("Error processing stream:", error)
    onError(error instanceof Error ? error : new Error("Unknown error processing stream"))
  } finally {
    reader.releaseLock()
  }
}

// Send a chat message to FastGPT API
export const sendChatMessage: any = async (
  appId: string,
  chatId: string,
  messages: Array<{ role: string; content: string }>,
  systemPrompt?: string,
  userId = "anonymous",
  stream = true,
  detail = false,
): Promise<Response> => {
  // Prepare request parameters
  const params: any = {
    model: appId,
    messages,
    stream,
    detail,
    chatId,
    responseChatItemId: `resp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    variables: {
      userId,
    },
  }

  // Add system message if exists
  if (systemPrompt) {
    params.system = systemPrompt
  }

  // Send request to FastGPT API
  return fastGPTClient.chatCompletions(params)
}

// Get question suggestions ("Guess what you want to ask")
export const getQuestionSuggestions: any = async (
  appId: string,
  chatId: string,
  model = "GPT-4o-mini",
): Promise<string[]> => {
  try {
    const result: any = await fastGPTClient.createQuestionGuide(appId, chatId, {
      open: true,
      model,
      customPrompt:
        "You are a helpful assistant. Based on the conversation history, suggest 3 follow-up questions the user might want to ask.",
    })

    return Array.isArray(result) ? result : []
  } catch (error) {
    console.error("Failed to get question suggestions:", error)
    return []
  }
}

export default {
  generateChatId,
  generateMessageId,
  processStreamResponse,
  sendChatMessage,
  getQuestionSuggestions,
}
