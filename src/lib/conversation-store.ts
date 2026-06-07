import type { UIMessage } from "ai";

export interface ConversationMeta {
  id: string;
  title: string;
  createdAt: string;
  lastMessageAt: string;
}

export async function getConversations(): Promise<ConversationMeta[]> {
  const res = await fetch("/api/conversations");
  if (!res.ok) return [];
  return res.json();
}

export async function createConversation(id: string): Promise<ConversationMeta> {
  const res = await fetch("/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  return res.json();
}

export async function updateConversation(
  id: string,
  updates: Partial<Pick<ConversationMeta, "title" | "lastMessageAt">>
): Promise<void> {
  await fetch(`/api/conversations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
}

export async function deleteConversation(id: string): Promise<void> {
  await fetch(`/api/conversations/${id}`, { method: "DELETE" });
}

export async function saveMessages(conversationId: string, messages: UIMessage[]): Promise<void> {
  await fetch(`/api/conversations/${conversationId}/messages`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });
}

export async function loadMessages(conversationId: string): Promise<UIMessage[] | null> {
  try {
    const res = await fetch(`/api/conversations/${conversationId}/messages`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return data as UIMessage[];
  } catch {
    return null;
  }
}
