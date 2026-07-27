/**
 * React Hook for managing conversational chat state.
 * Handles messages list, loading states, API calls, and errors.
 */
import { useState, useEffect, useCallback } from 'react';
import { ChatMessage } from '../types';
import { api } from '../services/api';

const generateUuid = (): string => {
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);

  // Initialize unique session identifier
  useEffect(() => {
    setConversationId(generateUuid());
  }, []);

  const sendChatMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: ChatMessage = {
      id: generateUuid(),
      role: 'user',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setError(null);

    try {
      const response = await api.sendChatMessage(content, conversationId);
      
      if (response.conversation_id) {
        setConversationId(response.conversation_id);
      }

      const assistantMessage: ChatMessage = {
        id: generateUuid(),
        role: 'assistant',
        content: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        data_complete: response.data_complete,
        structured_summary: response.structured_summary,
        missing_data_notes: response.missing_data_notes || undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('API Chat Error:', err);
      const friendlyMessage = err.detail || 'Could not connect to the analyst agent. Please make sure the backend server is running.';
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const resetChat = useCallback(() => {
    setMessages([]);
    setError(null);
    setConversationId(generateUuid());
  }, []);

  return {
    messages,
    loading,
    error,
    sendChatMessage,
    resetChat,
  };
};
export type UseChatReturn = ReturnType<typeof useChat>;
