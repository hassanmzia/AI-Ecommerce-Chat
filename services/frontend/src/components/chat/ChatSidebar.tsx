import { Plus, Trash2, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import { formatChatDate, truncateText, groupByDate } from '@/utils/formatters';
import type { Conversation } from '@/types';

interface ChatSidebarProps {
  conversations: Conversation[];
  currentConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
}

export default function ChatSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: ChatSidebarProps) {
  // Group conversations by date
  const grouped = conversations.reduce<Record<string, Conversation[]>>(
    (acc, convo) => {
      const group = groupByDate(convo.updatedAt || convo.createdAt);
      if (!acc[group]) acc[group] = [];
      acc[group].push(convo);
      return acc;
    },
    {}
  );

  const groupOrder = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older'];

  return (
    <div className="w-72 bg-neutral-50 border-r border-neutral-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200">
        <button
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-2 btn-primary text-sm py-2.5"
        >
          <Plus className="w-4 h-4" />
          New Conversation
        </button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-neutral-400">
            <MessageSquare className="w-10 h-10 mb-2" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Start a new chat</p>
          </div>
        ) : (
          <div className="py-2">
            {groupOrder.map((group) => {
              const convos = grouped[group];
              if (!convos || convos.length === 0) return null;

              return (
                <div key={group} className="mb-2">
                  <h3 className="px-4 py-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    {group}
                  </h3>
                  {convos.map((convo) => (
                    <div
                      key={convo.id}
                      className={clsx(
                        'group flex items-center mx-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors duration-150',
                        convo.id === currentConversationId
                          ? 'bg-primary-50 border border-primary-200'
                          : 'hover:bg-neutral-100'
                      )}
                      onClick={() => onSelectConversation(convo.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p
                            className={clsx(
                              'text-sm font-medium truncate',
                              convo.id === currentConversationId
                                ? 'text-primary-700'
                                : 'text-neutral-800'
                            )}
                          >
                            {convo.title || 'New Conversation'}
                          </p>
                          <span className="text-[10px] text-neutral-400 flex-shrink-0 ml-2">
                            {formatChatDate(convo.updatedAt || convo.createdAt)}
                          </span>
                        </div>
                        {convo.lastMessage && (
                          <p className="text-xs text-neutral-500 mt-0.5 truncate">
                            {truncateText(convo.lastMessage, 45)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(convo.id);
                        }}
                        className="ml-1 p-1.5 opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
