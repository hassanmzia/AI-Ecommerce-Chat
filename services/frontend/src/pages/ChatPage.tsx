import { useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import ChatWindow from '@/components/chat/ChatWindow';
import ChatSidebar from '@/components/chat/ChatSidebar';
import useChat from '@/hooks/useChat';

export default function ChatPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const {
    conversations,
    currentConversation,
    selectConversation,
    createNewConversation,
    deleteConversation,
  } = useChat();

  return (
    <div className="flex w-full h-[calc(100vh-4rem)] bg-neutral-50">
      {/* Sidebar toggle for mobile */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed bottom-4 left-4 z-50 w-12 h-12 bg-primary-600 text-white rounded-xl shadow-lg flex items-center justify-center hover:bg-primary-700 transition-colors"
      >
        {isSidebarOpen ? (
          <PanelLeftClose className="w-5 h-5" />
        ) : (
          <PanelLeftOpen className="w-5 h-5" />
        )}
      </button>

      {/* Sidebar */}
      <div
        className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 transition-transform duration-300 absolute lg:relative z-40 lg:z-0 h-full`}
      >
        <ChatSidebar
          conversations={conversations}
          currentConversationId={currentConversation?.id}
          onSelectConversation={(id) => {
            selectConversation(id);
            if (window.innerWidth < 1024) {
              setIsSidebarOpen(false);
            }
          }}
          onNewConversation={() => {
            createNewConversation();
            if (window.innerWidth < 1024) {
              setIsSidebarOpen(false);
            }
          }}
          onDeleteConversation={deleteConversation}
        />
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Chat window */}
      <ChatWindow />
    </div>
  );
}
