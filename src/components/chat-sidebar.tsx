"use client";

import { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  getConversations,
  deleteConversation,
  type ConversationMeta,
} from "@/lib/conversation-store";
import { MessageSquarePlus, Trash2 } from "lucide-react";

interface ChatSidebarProps {
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  version: number;
}

export function ChatSidebar({ activeId, onSelect, onNew, version }: ChatSidebarProps) {
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);

  useEffect(() => {
    getConversations().then(setConversations);
  }, [version, activeId]);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await deleteConversation(id);
    if (id === activeId) {
      const remaining = await getConversations();
      if (remaining.length > 0) {
        onSelect(remaining[0].id);
      } else {
        onNew();
      }
    }
    setConversations(await getConversations());
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-3">
        <Button onClick={onNew} className="w-full justify-start gap-2" variant="outline">
          <MessageSquarePlus className="size-4" />
          新建对话
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>对话历史</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {conversations.map((conv) => (
                <SidebarMenuItem key={conv.id}>
                  <SidebarMenuButton
                    isActive={conv.id === activeId}
                    onClick={() => onSelect(conv.id)}
                    className="truncate"
                  >
                    <span className="truncate">{conv.title}</span>
                  </SidebarMenuButton>
                  <SidebarMenuAction onClick={(e) => handleDelete(conv.id, e)}>
                    <Trash2 className="size-4" />
                  </SidebarMenuAction>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <p className="text-xs text-muted-foreground">IDRL ImageGen</p>
      </SidebarFooter>
    </Sidebar>
  );
}
