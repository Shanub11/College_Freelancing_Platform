import { useState, useEffect, useRef, Fragment } from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { compressImage } from "@/lib/imageUtils";
import { toast } from "sonner";

interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  initialConversation?: {
    projectId?: Id<"projectRequests">;
    clientId: Id<"users">;
    freelancerId: Id<"users">;
  } | null;
  currentUserId: Id<"users">;
}

export function ChatInterface({ isOpen, onClose, initialConversation, currentUserId }: ChatInterfaceProps) {
  const { results: conversations, status, loadMore } = usePaginatedQuery(
    api.chat.getConversations,
    {},
    { initialNumItems: 20 }
  );
  const getOrCreate = useMutation(api.chat.getOrCreateConversation);
  const markAsRead = useMutation(api.chat.markAsRead);
  
  const [selectedConversationId, setSelectedConversationId] = useState<Id<"conversations"> | null>(null);
  
  // Handle initial conversation request (e.g. from "Chat" button)
  useEffect(() => {
    const setupInitial = async () => {
      if (initialConversation && isOpen) {
        try {
          const payload: any = {
            clientId: initialConversation.clientId,
            freelancerId: initialConversation.freelancerId,
          };
          if (initialConversation.projectId) {
            payload.projectId = initialConversation.projectId;
          }
          const id = await getOrCreate(payload);
          setSelectedConversationId(id);
        } catch (err) {
          console.error("Failed to setup initial conversation:", err);
        }
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
          <div className="p-4 border-b bg-white flex items-center gap-3">
            <button onClick={onClose} className="text-gray-500 hover:text-blue-600 transition-colors" title="Back">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <h2 className="text-xl font-bold text-gray-800">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {!conversations || conversations.length === 0 ? (
              <p className="p-4 text-gray-500 text-center">No conversations yet.</p>
            ) : (
              <>
                {conversations.map(c => (
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
                ))}
                {status === "CanLoadMore" && (
                  <button 
                    onClick={() => loadMore(20)}
                    className="w-full p-4 text-blue-600 hover:bg-gray-100 text-sm font-medium transition-colors"
                  >
                    Load More
                  </button>
                )}
              </>
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
  const generateUploadUrl = useMutation(api.chat.generateUploadUrl);
  const validateUpload = useMutation(api.storage.validateUpload);
  
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;

    let attachmentId = undefined;
    if (selectedFile) {
      // Validate file size before attempting upload (max 5MB for chat attachments)
      const MAX_CHAT_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
      if (selectedFile.size > MAX_CHAT_FILE_SIZE) {
        toast.error(
          "File is too large. Maximum size for chat attachments is 5MB. " +
          "Please compress or resize the file and try again."
        );
        setSelectedFile(null);
        return;
      }
      setIsUploading(true);
      const compressedFile = await compressImage(selectedFile, 1200, 1200, 0.8);
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": compressedFile.type },
        body: compressedFile,
      });
      const { storageId } = await result.json();
      // SERVER-SIDE VALIDATION
      attachmentId = await validateUpload({
        storageId,
        category: "chat_attachment",
      });
    }

    await sendMessage({ conversationId, text: newMessage, attachment: attachmentId });
    setNewMessage("");
    setSelectedFile(null);
    setIsUploading(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-[80vh] md:h-[600px] bg-gray-50 dark:bg-dark-bg rounded-t-2xl md:rounded-2xl overflow-hidden relative shadow-2xl border border-gray-200 dark:border-dark-border">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-dark-border flex justify-between items-center bg-white dark:bg-dark-surface shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center font-bold text-lg">
            {recipientName?.[0] || "U"}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white leading-tight">{recipientName}</h3>
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">● Online</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-gray-50 dark:bg-dark-surface-2 rounded-full transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#e5ddd5] dark:bg-dark-bg relative" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgb3BhY2l0eT0iMC4wNSI+CjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiIGZpbGw9Im5vbmUiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiIgZmlsbD0iIzAwMCIvPgo8L3N2Zz4=')" }}>
        {messages?.map((msg, index) => {
          const isMe = msg.senderId === currentUserId;

          // Date separator logic
          const msgDate = new Date(msg.createdAt);
          const prevMsgDate = index > 0 ? new Date(messages[index - 1].createdAt) : null;
          const showDate = !prevMsgDate || msgDate.toDateString() !== prevMsgDate.toDateString();

          let dateString = "";
          if (showDate) {
            const today = new Date();
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            if (msgDate.toDateString() === today.toDateString()) {
              dateString = "Today";
            } else if (msgDate.toDateString() === yesterday.toDateString()) {
              dateString = "Yesterday";
            } else {
              dateString = msgDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            }
          }

          return (
            <Fragment key={msg._id}>
              {showDate && (
                <div className="flex justify-center my-4 sticky top-2 z-10">
                  <span className="bg-white/90 dark:bg-dark-surface/90 backdrop-blur-sm text-gray-600 dark:text-gray-300 text-[11px] uppercase tracking-wider px-3 py-1 rounded-full shadow-sm font-semibold">
                    {dateString}
                  </span>
                </div>
              )}
              <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`relative max-w-[85%] md:max-w-[70%] rounded-2xl px-3.5 py-2 shadow-sm ${
                  isMe ? "bg-[#dcf8c6] dark:bg-primary-900/40 text-gray-900 dark:text-white rounded-tr-none" 
                       : "bg-white dark:bg-dark-surface text-gray-900 dark:text-white border border-gray-100 dark:border-dark-border rounded-tl-none"
                }`}>
                  {/* Tail indicator */}
                  <div className={`absolute top-0 w-3 h-4 ${isMe ? "-right-2 text-[#dcf8c6] dark:text-primary-900/40" : "-left-2 text-white dark:text-dark-surface"}`}>
                    <svg viewBox="0 0 8 13" fill="currentColor"><path d={isMe ? "M0 0h8v13L0 0z" : "M8 0H0v13L8 0z"}/></svg>
                  </div>

                  {msg.attachmentUrl && (
                    <div className="mb-2">
                      {msg.attachmentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <div className="rounded-xl overflow-hidden border border-black/5">
                          <img src={msg.attachmentUrl} alt="Attachment" className="max-w-full max-h-64 object-cover hover:opacity-90 transition-opacity cursor-pointer" />
                        </div>
                      ) : (
                        <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-black/5 dark:bg-white/5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center text-primary-600 dark:text-primary-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          </div>
                          <span className="text-sm font-medium underline">Document Attached</span>
                        </a>
                      )}
                    </div>
                  )}
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                  <p className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${isMe ? "text-gray-500 dark:text-gray-400" : "text-gray-400"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isMe && (
                      <span className={msg.seen ? "text-blue-500" : "text-gray-400"}>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 4.5l-8 8-4-4" strokeLinecap="round" strokeLinejoin="round"/><path d="M17.5 4.5l-8 8-1.5-1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </Fragment>
          );
        })}
        <div ref={messagesEndRef} className="h-1" />
      </div>
      
      {/* Input Area */}
      <form onSubmit={handleSend} className="p-3 bg-gray-100 dark:bg-dark-surface border-t border-gray-200 dark:border-dark-border">
        {selectedFile && (
          <div className="mb-2 mx-2 flex items-center gap-2 bg-white dark:bg-dark-surface-2 p-2 rounded-xl shadow-sm border border-gray-200 dark:border-dark-border w-fit max-w-full">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            </div>
            <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-300 flex-1">{selectedFile.name}</span>
            <button type="button" onClick={() => setSelectedFile(null)} className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100 dark:hover:bg-dark-bg transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-200 dark:hover:bg-dark-surface-2 rounded-full transition-colors flex-shrink-0"
            title="Attach file"
          >
            <svg className="w-6 h-6 transform -rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
            }}
          />
          <div className="flex-1 bg-white dark:bg-dark-surface-2 rounded-2xl border border-gray-200 dark:border-dark-border shadow-sm overflow-hidden flex items-center">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 bg-transparent focus:outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
          <button 
            type="submit"
            disabled={(!newMessage.trim() && !selectedFile) || isUploading}
            className="p-3 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:bg-gray-400 dark:disabled:bg-gray-600 transition-colors shadow-md flex-shrink-0 flex items-center justify-center h-12 w-12"
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 transform translate-x-0.5 -translate-y-0.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}