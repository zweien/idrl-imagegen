"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { ChatSidebar } from "@/components/chat-sidebar";
import { GenerationConversation } from "@/components/generation-conversation";
import {
  getConversations,
  createConversation,
  updateConversation,
  saveMessages as storeSaveMessages,
} from "@/lib/conversation-store";

export function ConversationManager() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      const convs = await getConversations();
      if (convs.length > 0) {
        setActiveId(convs[0].id);
      } else {
        const id = crypto.randomUUID();
        await createConversation(id);
        setActiveId(id);
        setVersion((v) => v + 1);
      }
    })();
  }, []);

  const handleNewConversation = useCallback(async () => {
    const id = crypto.randomUUID();
    await createConversation(id);
    setActiveId(id);
    setVersion((v) => v + 1);
  }, []);

  const handleSelect = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const handleMessagesChange = useCallback(
    async (conversationId: string, messages: Array<Record<string, unknown>>) => {
      if (messages.length === 0) return;
      await storeSaveMessages(conversationId, messages as any);
      setVersion((v) => v + 1);
    },
    []
  );

  const handleFirstMessage = useCallback(async (conversationId: string, text: string) => {
    const title = text.length > 30 ? text.slice(0, 30) + "..." : text;
    await updateConversation(conversationId, { title });
    setVersion((v) => v + 1);
  }, []);

  return (
    <SidebarProvider>
      <ChatSidebar
        activeId={activeId}
        onSelect={handleSelect}
        onNew={handleNewConversation}
        version={version}
      />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <a href="/" className="text-lg font-bold">
            IDRL ImageGen
          </a>
          <nav className="ml-auto flex gap-4">
            <a
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              生图
            </a>
            <a
              href="/history"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              历史
            </a>
          </nav>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden">
          {activeId && (
            <GenerationConversation
              key={activeId}
              conversationId={activeId}
              onMessagesChange={(msgs) => handleMessagesChange(activeId, msgs as any)}
              onFirstMessage={(text) => handleFirstMessage(activeId, text)}
            />
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
