import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  initialConversation?: {
    projectId: Id<"projectRequests">;
    clientId: Id<"users">;
    freelancerId: Id<"users">;
  } | null;
  currentUserId: Id<"users">;
}

export function ChatInterface({ isOpen, onClose, initialConversation, currentUserId }: ChatInterfaceProps) {
  const conversations = useQuery(api.chat.getConversations) || [];
  const getOrCreate = useMutation(api.chat.getOrCreateConversation);
  const markAsRead = useMutation(api.chat.markAsRead);
  
  const [selectedConversationId, setSelectedConversationId] = useState<Id<"conversations"> | null>(null);
  
  // Handle initial conversation request (e.g. from "Chat" button)
  useEffect(() => {
    const setupInitial = async () => {
      if (initialConversation && isOpen) {
        const id = await getOrCreate(initialConversation);
        setSelectedConversationId(id);
      }
    };
    setupInitial();
  }, [initialConversation, isOpen]);

  // Mark as read when selecting a conversation
  useEffect(() => {
    if (selectedConversationId) {
      markAsRead({ conversationId: selectedConversationId });
    }
  }, [selectedConversationId]);

  if (!isOpen) return null;

  const selectedConversation = conversations.find(c => c._id === selectedConversationId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[80vh] flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-1/3 border-r bg-gray-50 flex flex-col">
          <div className="p-4 border-b bg-white flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Messages</h2>
            <button onClick={onClose} className="md:hidden text-gray-500">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="p-4 text-gray-500 text-center">No conversations yet.</p>
            ) : (
              conversations.map(c => (
                <div 
                  key={c._id}
                  onClick={() => setSelectedConversationId(c._id)}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-100 transition-colors ${selectedConversationId === c._id ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <h3 className={`font-semibold ${c.unreadCount > 0 ? 'text-black' : 'text-gray-700'}`}>
                      {c.otherUserName}
                    </h3>
                    {c.unreadCount > 0 && (
                      <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate mt-1">
                    {c.lastMessage || "No messages yet"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedConversationId ? (
            <ChatWindow 
              conversationId={selectedConversationId} 
              currentUserId={currentUserId}
              recipientName={selectedConversation?.otherUserName || "User"}
              onClose={onClose}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <span className="text-6xl mb-4">💬</span>
              <p>Select a conversation to start chatting</p>
              <button onClick={onClose} className="mt-4 text-blue-600 hover:underline">Close</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatWindow({ conversationId, currentUserId, recipientName, onClose }: { conversationId: Id<"conversations">, currentUserId: Id<"users">, recipientName: string, onClose: () => void }) {
  const messages = useQuery(api.chat.getMessages, { conversationId }) || [];
  const sendMessage = useMutation(api.chat.sendMessage);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    await sendMessage({ conversationId, text: newMessage });
    setNewMessage("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <>
      <div className="p-4 border-b flex justify-between items-center bg-white shadow-sm z-10">
        <h3 className="font-bold text-gray-800">{recipientName}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages?.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          return (
            <div key={msg._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${
                isMe ? "bg-blue-600 text-white rounded-br-none" : "bg-white text-gray-800 border rounded-bl-none"
              }`}>
                <p>{msg.text}</p>
                <p className={`text-[10px] mt-1 text-right ${isMe ? "text-blue-100" : "text-gray-400"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isMe && <span className="ml-1">{msg.seen ? "✓✓" : "✓"}</span>}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSend} className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </form>
    </>
  );
}