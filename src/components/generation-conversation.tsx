"use client";

import { useChat } from "@ai-sdk/react";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import { useStickToBottomContext } from "use-stick-to-bottom";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ai-elements/reasoning";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Suggestion } from "@/components/ai-elements/suggestion";
import { ImageGeneration } from "@/components/generation-message";
import { GenerationConfirmCard, type ConfirmParams } from "@/components/generation-confirm";
import { loadMessages, saveMessages } from "@/lib/conversation-store";

const streamdownPlugins = { cjk, code, math, mermaid };

const QUICK_PROMPTS = [
  "一只在月球上的猫",
  "赛博朋克城市夜景",
  "水彩画风格的花园",
  "未来科技感的机器人",
];

const transport = new DefaultChatTransport({
  api: "/api/chat",
});

function AutoScroll({ messages }: { messages: UIMessage[] }) {
  const { scrollToBottom } = useStickToBottomContext();
  const prevCountRef = useRef(0);
  const prevLengthRef = useRef(0);

  useEffect(() => {
    const count = messages.length;
    const totalParts = messages.reduce((sum, m) => sum + m.parts.length, 0);
    if (count !== prevCountRef.current || totalParts !== prevLengthRef.current) {
      scrollToBottom();
      prevCountRef.current = count;
      prevLengthRef.current = totalParts;
    }
  }, [messages, scrollToBottom]);

  return null;
}

interface GenerationConversationProps {
  conversationId: string;
  onMessagesChange: (messages: UIMessage[]) => void;
  onFirstMessage: (text: string) => void;
}

// 外层：先加载消息，再渲染内层
export function GenerationConversation({
  conversationId,
  onMessagesChange,
  onFirstMessage,
}: GenerationConversationProps) {
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    setInitialMessages(null);
    loadMessages(conversationId).then((saved) => {
      setInitialMessages(saved || []);
    });
  }, [conversationId]);

  if (initialMessages === null) return null;

  return (
    <GenerationConversationInner
      key={conversationId}
      conversationId={conversationId}
      initialMessages={initialMessages}
      onMessagesChange={onMessagesChange}
      onFirstMessage={onFirstMessage}
    />
  );
}

// 内层：useChat 用 initialMessages 初始化
function GenerationConversationInner({
  conversationId,
  initialMessages,
  onMessagesChange,
  onFirstMessage,
}: GenerationConversationProps & { initialMessages: UIMessage[] }) {
  const { messages, sendMessage, status, stop, addToolResult } = useChat({
    id: conversationId,
    transport,
    messages: initialMessages,
  });
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 用 ref 稳定回调引用，避免依赖变化导致无限循环
  const onMessagesChangeRef = useRef(onMessagesChange);
  onMessagesChangeRef.current = onMessagesChange;
  const onFirstMessageRef = useRef(onFirstMessage);
  onFirstMessageRef.current = onFirstMessage;

  // 消息变化时保存（非 streaming 状态）
  useEffect(() => {
    if (status === "submitted" || status === "streaming") return;
    if (messages.length > 0) {
      saveMessages(conversationId, messages);
      onMessagesChangeRef.current(messages);
    }
  }, [messages, status, conversationId]);

  const handleSubmit = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setError(null);
      setInput("");
      if (messages.length === 0) {
        onFirstMessageRef.current(text.trim());
      }
      try {
        await sendMessage({ text: text.trim() });
      } catch (e) {
        setError(e instanceof Error ? e.message : "发送失败，请重试");
      }
    },
    [sendMessage, messages.length]
  );

  const isEmpty = messages.length === 0;
  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto max-w-3xl">
          <AutoScroll messages={messages} />
          {isEmpty ? (
            <div className="flex size-full flex-col items-center justify-center gap-6">
              <div className="space-y-2 text-center">
                <h1 className="text-2xl font-bold">IDRL ImageGen</h1>
                <p className="text-muted-foreground">
                  描述你想要生成的图片，AI 会帮你创作
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {QUICK_PROMPTS.map((text) => (
                  <Suggestion
                    key={text}
                    suggestion={text}
                    onClick={(s) => handleSubmit(s)}
                  />
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {message.parts.map((part, i) => {
                    if (part.type === "text" && part.text) {
                      return (
                        <Streamdown key={i} plugins={streamdownPlugins}>
                          {part.text}
                        </Streamdown>
                      );
                    }

                    if (part.type === "reasoning") {
                      const isStreaming = !part.text;
                      return (
                        <Reasoning
                          key={i}
                          isStreaming={isStreaming}
                          defaultOpen={true}
                        >
                          <ReasoningTrigger />
                          <ReasoningContent>
                            {part.text || ""}
                          </ReasoningContent>
                        </Reasoning>
                      );
                    }

                    if (part.type === "tool-generateImage") {
                      const output = part.output as Record<string, string> | undefined;

                      if (part.state === "output-available" && output?.taskId) {
                        return (
                          <div key={i} className="space-y-3">
                            <Tool defaultOpen={false}>
                              <ToolHeader
                                type={part.type}
                                state={part.state}
                                title="生成图片"
                              />
                              <ToolContent>
                                {"input" in part && part.input != null && (
                                  <ToolInput input={part.input as Record<string, unknown>} />
                                )}
                                <ToolOutput
                                  output={part.output as any}
                                  errorText={
                                    "errorText" in part
                                      ? (part as any).errorText
                                      : undefined
                                  }
                                />
                              </ToolContent>
                            </Tool>
                            <ImageGeneration taskId={output.taskId} />
                          </div>
                        );
                      }

                      if (part.state === "output-available" && output?.cancelled) {
                        return null;
                      }

                      if (part.state === "input-available") {
                        return (
                          <GenerationConfirmCard
                            key={i}
                            input={part.input as { prompt: string; size?: string; enhancement?: boolean }}
                            onConfirm={async (params: ConfirmParams) => {
                              try {
                                const res = await fetch("/api/generate", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify(params),
                                });
                                if (!res.ok) {
                                  const err = await res.json().catch(() => ({}));
                                  throw new Error(err.error || `请求失败 (${res.status})`);
                                }
                                const data = await res.json();
                                addToolResult({
                                  tool: "generateImage",
                                  toolCallId: part.toolCallId,
                                  output: { taskId: data.taskId, status: "queued" },
                                });
                              } catch (e) {
                                setError(e instanceof Error ? e.message : "生图请求失败");
                              }
                            }}
                            onCancel={() => {
                              addToolResult({
                                tool: "generateImage",
                                toolCallId: part.toolCallId,
                                output: { cancelled: true },
                              });
                            }}
                          />
                        );
                      }

                      return (
                        <Tool key={i} defaultOpen={true}>
                          <ToolHeader
                            type={part.type}
                            state={part.state}
                            title="生成图片"
                          />
                        </Tool>
                      );
                    }

                    return null;
                  })}
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {error && (
        <div className="mx-auto max-w-3xl px-4 pt-2">
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        </div>
      )}
      <div className="shrink-0 border-t p-4">
        <div className="mx-auto max-w-3xl">
          <PromptInput
            onSubmit={async ({ text }) => {
              await handleSubmit(text);
            }}
            className="rounded-2xl border shadow-sm"
          >
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              placeholder="描述你想要生成的图片..."
            />
            <PromptInputFooter>
              <div />
              <PromptInputSubmit
                status={isLoading ? "submitted" : "ready"}
                onStop={stop}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
