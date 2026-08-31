import {
  getFileSourceType,
  getUrlSourceType,
} from "@/components/pulse/source-utils"
import type { PulseConversation, PulseSource } from "@/components/pulse/types"
import type { ConversationWithMessages } from "@/features/conversations"

export function toPulseConversation(
  conversation: ConversationWithMessages
): PulseConversation {
  return {
    id: conversation.id,
    title: conversation.title,
    model: conversation.model,
    isPinned: conversation.isPinned,
    isArchived: conversation.isArchived,
    lastMessageAt: conversation.lastMessageAt.toISOString(),
    createdAt: conversation.createdAt.toISOString(),
    messages: conversation.messages.map((message) => ({
      id: message.id,
      conversationId: message.conversationId,
      role: message.role,
      status: message.status,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    })),
  }
}

export function sourceTypeFromLabel(label: string): PulseSource["type"] {
  if (/^https?:\/\//i.test(label)) {
    return getUrlSourceType(label)
  }
  return getFileSourceType(label)
}

export function conversationToSource(
  conversation: PulseConversation
): PulseSource {
  const type = sourceTypeFromLabel(conversation.title)
  return {
    id: conversation.id,
    type,
    label: conversation.title,
    status: "indexed",
    conversationId: conversation.id,
    url: type === "website" || type === "youtube" ? conversation.title : undefined,
  }
}
