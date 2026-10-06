import type { InfiniteData } from "@tanstack/react-query";
import type { MessageDto } from "@/lib/api/types";

/** A message as held in the client cache; optimistic messages carry a `temp-` id until acknowledged. */
export interface ChatMessage extends MessageDto {
  pending?: boolean;
  failed?: boolean;
}

/** Infinite query data: `pages[0]` is the newest page, each page ordered oldest → newest. */
export type MessagesData = InfiniteData<ChatMessage[], string | undefined>;

export const MESSAGES_PAGE_SIZE = 30;

export function isTempId(id: string): boolean {
  return id.startsWith("temp-");
}

export function createOptimisticMessage(conversationId: string, senderId: string, content: string): ChatMessage {
  const random = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return {
    id: `temp-${random}`,
    conversationId,
    senderId,
    content,
    createdAt: new Date().toISOString(),
    readAt: null,
    pending: true,
  };
}

function mapPages(data: MessagesData, fn: (page: ChatMessage[]) => ChatMessage[]): MessagesData {
  return { ...data, pages: data.pages.map(fn) };
}

function hasMessage(data: MessagesData, id: string): boolean {
  return data.pages.some((page) => page.some((m) => m.id === id));
}

/** Oldest → newest across all loaded pages. */
export function flattenMessages(data: { pages: ChatMessage[][] } | undefined): ChatMessage[] {
  if (!data) return [];
  return [...data.pages].reverse().flat();
}

/** Appends an optimistic message to the newest page. */
export function addOptimistic(data: MessagesData | undefined, message: ChatMessage): MessagesData | undefined {
  if (!data) return data;
  const [newest = [], ...rest] = data.pages;
  return { ...data, pages: [[...newest, message], ...rest] };
}

/**
 * Inserts a server-confirmed message. If an optimistic copy exists (`tempId`, or the oldest pending
 * message from the same sender with identical content) it is replaced in place; duplicates are ignored.
 */
export function upsertMessage(
  data: MessagesData | undefined,
  message: MessageDto,
  tempId?: string,
): MessagesData | undefined {
  if (!data) return data;
  if (hasMessage(data, message.id)) {
    return tempId ? removeMessage(data, tempId) : data;
  }
  const targetTempId =
    tempId ??
    flattenMessages(data).find(
      (m) => m.pending && isTempId(m.id) && m.senderId === message.senderId && m.content === message.content,
    )?.id;

  if (targetTempId && hasMessage(data, targetTempId)) {
    return mapPages(data, (page) => page.map((m) => (m.id === targetTempId ? { ...message } : m)));
  }
  const [newest = [], ...rest] = data.pages;
  return { ...data, pages: [[...newest, { ...message }], ...rest] };
}

export function removeMessage(data: MessagesData, id: string): MessagesData {
  return mapPages(data, (page) => page.filter((m) => m.id !== id));
}

export function markFailed(data: MessagesData | undefined, tempId: string): MessagesData | undefined {
  if (!data) return data;
  return mapPages(data, (page) => page.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)));
}

/** Marks every message *not* sent by the reader as read at `readAt`. */
export function applyReadReceipt(
  data: MessagesData | undefined,
  readerId: string,
  readAt: string,
): MessagesData | undefined {
  if (!data) return data;
  return mapPages(data, (page) =>
    page.map((m) => (m.senderId !== readerId && !m.readAt && !isTempId(m.id) ? { ...m, readAt } : m)),
  );
}
