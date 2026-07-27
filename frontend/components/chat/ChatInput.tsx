"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, CornerDownLeft } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea to fit text
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    
    onSendMessage(input.trim());
    setInput("");
    
    // Focus back on textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex items-end gap-2 p-3 rounded-2xl border border-border bg-surface shadow-sm focus-within:ring-1 focus-within:ring-accent focus-within:border-accent transition-all duration-200"
    >
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a business question... (e.g. 'Show mining sector performance')"
        rows={1}
        disabled={disabled}
        className="flex-1 max-h-40 min-h-[24px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none pr-12 pl-1 leading-normal py-1"
        style={{ height: "auto" }}
      />
      
      <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
        {/* Helper Enter key indicator */}
        <span className="hidden md:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground bg-border/40 px-1.5 py-0.5 rounded font-mono select-none">
          <span>Enter</span>
          <CornerDownLeft className="h-2 w-2" />
        </span>

        <button
          type="submit"
          disabled={!input.trim() || disabled}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 disabled:bg-border disabled:text-muted-foreground disabled:cursor-not-allowed transition-all cursor-pointer focus:outline-none"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
