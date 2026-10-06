import { ChatThread } from "@/features/chat/components/chat-thread";

export default async function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  return <ChatThread key={id} conversationId={id} />;
}
