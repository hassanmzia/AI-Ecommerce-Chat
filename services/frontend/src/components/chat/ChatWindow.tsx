import { useState, useRef, useEffect } from 'react';
import { Send, Bot, Wifi, WifiOff, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import MessageBubble from './MessageBubble';
import SuggestedPrompts from './SuggestedPrompts';
import useChat from '@/hooks/useChat';
import { useWebSocket } from '@/hooks/useWebSocket';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function ChatWindow() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isTyping,
    isSending,
    sendMessage,
    handleInputChange,
    currentConversation,
  } = useChat();

  const { isConnected } = useWebSocket();

  const MAX_CHARS = 2000;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Focus input on mount and conversation change
  useEffect(() => {
    inputRef.current?.focus();
  }, [currentConversation?.id]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    setInput('');
    await sendMessage(trimmed);

    // Re-focus input after sending
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInputValueChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const value = e.target.value;
    if (value.length <= MAX_CHARS) {
      setInput(value);
      handleInputChange(value.length > 0);
    }
  };

  const handlePromptSelect = (prompt: string) => {
    setInput(prompt);
    sendMessage(prompt);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex-1 flex flex-col bg-white h-full">
      {/* Chat header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-neutral-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-800">
              AI Shopping Assistant
            </h2>
            <div className="flex items-center gap-1.5">
              <div
                className={clsx(
                  'w-1.5 h-1.5 rounded-full',
                  isConnected ? 'bg-emerald-500' : 'bg-neutral-400'
                )}
              />
              <span className="text-xs text-neutral-500">
                {isConnected ? 'Online' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-emerald-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-neutral-400" />
          )}
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4"
      >
        {!hasMessages ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-neutral-800 mb-2">
              How can I help you today?
            </h3>
            <p className="text-sm text-neutral-500 text-center max-w-md mb-8">
              I can help you find products, track orders, answer questions about
              your account, and much more. Choose a topic below or type your
              question.
            </p>
            <SuggestedPrompts onSelect={handlePromptSelect} />
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-end gap-2 mb-4 animate-fade-in">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="chat-bubble-assistant">
                  <div className="typing-indicator">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-neutral-200 bg-white px-6 py-4">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputValueChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                rows={1}
                className="w-full resize-none px-4 py-3 pr-12 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent focus:bg-white transition-all"
                style={{
                  minHeight: '48px',
                  maxHeight: '120px',
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                }}
                disabled={isSending}
              />
              {/* Character count */}
              <div className="absolute right-3 bottom-1.5">
                <span
                  className={clsx(
                    'text-[10px]',
                    input.length > MAX_CHARS * 0.9
                      ? 'text-red-500'
                      : 'text-neutral-400'
                  )}
                >
                  {input.length}/{MAX_CHARS}
                </span>
              </div>
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              className={clsx(
                'flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200',
                input.trim() && !isSending
                  ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-md hover:shadow-lg'
                  : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
              )}
            >
              {isSending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>
        <p className="text-[10px] text-neutral-400 text-center mt-2">
          AI assistant may produce inaccurate information. Verify important details.
        </p>
      </div>
    </div>
  );
}
