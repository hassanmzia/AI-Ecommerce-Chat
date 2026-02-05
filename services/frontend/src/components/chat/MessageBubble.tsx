import ReactMarkdown from 'react-markdown';
import { Bot, User, AlertCircle, CheckCheck, Clock, Wrench } from 'lucide-react';
import clsx from 'clsx';
import { formatMessageTime } from '@/utils/formatters';
import type { ChatMessage } from '@/types';

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-neutral-100 text-neutral-500 text-xs px-4 py-1.5 rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'flex items-end gap-2 mb-4 animate-slide-up',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={clsx(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-primary-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message content */}
      <div className={clsx('flex flex-col', isUser ? 'items-end' : 'items-start')}>
        {/* Tool calls indicator */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-1.5 space-y-1">
            {message.toolCalls.map((tool) => (
              <div
                key={tool.id}
                className="flex items-center gap-1.5 text-xs text-neutral-500 bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5"
              >
                <Wrench className="w-3 h-3" />
                <span className="font-medium">{tool.name}</span>
                <span
                  className={clsx(
                    'px-1.5 py-0.5 rounded text-[10px] font-medium',
                    tool.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-700'
                      : tool.status === 'running'
                      ? 'bg-blue-100 text-blue-700'
                      : tool.status === 'error'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-neutral-100 text-neutral-600'
                  )}
                >
                  {tool.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Bubble */}
        <div className={isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'}>
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          ) : (
            <div className="text-sm prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside my-2 space-y-1">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside my-2 space-y-1">
                      {children}
                    </ol>
                  ),
                  code: ({ className, children, ...props }) => {
                    const isInline = !className;
                    if (isInline) {
                      return (
                        <code className="bg-neutral-100 text-primary-700 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children }) => (
                    <pre className="bg-neutral-900 text-neutral-100 p-3 rounded-lg my-2 overflow-x-auto text-xs">
                      {children}
                    </pre>
                  ),
                  a: ({ children, href }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 underline hover:text-primary-700"
                    >
                      {children}
                    </a>
                  ),
                  h1: ({ children }) => (
                    <h1 className="text-base font-bold mt-3 mb-1">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-sm font-bold mt-2 mb-1">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Timestamp and status */}
        <div
          className={clsx(
            'flex items-center gap-1.5 mt-1 px-1',
            isUser ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          <span className="text-[10px] text-neutral-400">
            {formatMessageTime(message.timestamp)}
          </span>
          {isUser && message.status && (
            <>
              {message.status === 'sending' && (
                <Clock className="w-3 h-3 text-neutral-400" />
              )}
              {message.status === 'sent' && (
                <CheckCheck className="w-3 h-3 text-primary-500" />
              )}
              {message.status === 'error' && (
                <AlertCircle className="w-3 h-3 text-red-500" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
