"use client";

import { useEffect, useRef } from "react";
import { Terminal, Sparkles, RefreshCw } from "lucide-react";
import { ChatMessage } from "../../types";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import LoadingIndicator from "./LoadingIndicator";
import ErrorBanner from "./ErrorBanner";
import ExamplePrompts from "./ExamplePrompts";

interface ChatWindowProps {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  onSendMessage: (message: string) => void;
  onReset: () => void;
}

export default function ChatWindow({
  messages,
  loading,
  error,
  onSendMessage,
  onReset
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom of the chat list
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {!hasMessages ? (
            /* Welcome / Empty State Page */
            <div className="flex flex-col items-center justify-center text-center py-12 md:py-20 max-w-xl mx-auto space-y-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface border border-border text-accent shadow-sm">
                <Terminal className="h-7 w-7 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Skylark business Intelligence Agent
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Welcome to your analyst workspace. Ask commercial or operational questions about the
                  <strong className="text-foreground/90 font-medium"> Deals</strong> and
                  <strong className="text-foreground/90 font-medium"> Work Orders</strong> boards, and get grounded, founder-ready answers instantly.
                </p>
              </div>
              <div className="w-full">
                <ExamplePrompts onSelectPrompt={onSendMessage} />
              </div>
            </div>
          ) : (
            /* Messages List */
            <div className="flex flex-col gap-2">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </div>
          )}

          {/* Loading state indicator */}
          {loading && (
            <div className="flex justify-start pl-11">
              <LoadingIndicator />
            </div>
          )}

          {/* Error Banner inside window */}
          {error && <ErrorBanner message={error} />}
          
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input controls bottom bar */}
      <div className="border-t border-border bg-background p-4 md:px-6">
        <div className="max-w-3xl mx-auto space-y-3">
          <ChatInput onSendMessage={onSendMessage} disabled={loading} />
          
          {hasMessages && (
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-accent" />
                <span>All answers are grounded strictly in Deals and Work Orders.</span>
              </span>
              <button
                onClick={onReset}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-accent font-medium bg-transparent border-0 cursor-pointer focus:outline-none"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Reset Conversation</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
