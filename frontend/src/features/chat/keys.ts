export const chatKeys = {
  all: ["chat"] as const,
  conversations: () => [...chatKeys.all, "conversations"] as const,
  conversation: (id: string) => [...chatKeys.all, "conversation", id] as const,
  messages: (id: string) => [...chatKeys.all, "messages", id] as const,
  unreadCount: () => [...chatKeys.all, "unread-count"] as const,
};

/** The conversation currently open on screen (used to suppress toasts / unread bumps). */
let activeConversationId: string | null = null;

export const activeConversation = {
  get: () => activeConversationId,
  set: (id: string | null) => {
    activeConversationId = id;
  },
};
