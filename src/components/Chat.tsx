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
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-1/3 border-r border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface/40 flex flex-col">
          <div className="p-5 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface flex items-center gap-3">
            <button onClick={onClose} className="p-2 -ml-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-dark-surface-2 rounded-full transition-colors" title="Back">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {!conversations || conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center text-gray-500 dark:text-gray-400">
                <span className="text-4xl mb-3 opacity-50">📭</span>
                <p>No conversations yet.</p>
              </div>
            ) : (
              <>
                {conversations.map(c => (
                <div 
                  key={c._id}
                  onClick={() => setSelectedConversationId(c._id)}
                  className={`p-4 border-b border-gray-100 dark:border-dark-border cursor-pointer transition-colors ${selectedConversationId === c._id ? 'bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-white dark:hover:bg-dark-surface/60'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={`font-semibold truncate pr-2 ${c.unreadCount > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                      {c.otherUserName}
                    </h3>
                    {c.unreadCount > 0 && (
                      <span className="bg-primary-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-baseline gap-2">
                    <p className={`text-sm truncate flex-1 ${c.unreadCount > 0 ? 'text-gray-800 dark:text-gray-200 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                      {c.lastMessage || "No messages yet"}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                      {new Date(c.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                ))}
                {status === "CanLoadMore" && (
                  <button 
                    onClick={() => loadMore(20)}
                    className="w-full p-4 text-primary-600 dark:text-primary-400 hover:bg-white dark:hover:bg-dark-surface text-sm font-medium transition-colors"
                  >
                    Load More
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-white dark:bg-dark-bg relative">
          {selectedConversationId ? (
            <ChatWindow 
              conversationId={selectedConversationId} 
              currentUserId={currentUserId}
              recipientName={selectedConversation?.otherUserName || "User"}
              onClose={onClose}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
              <span className="text-6xl mb-6 opacity-30">💬</span>
              <p className="text-lg font-medium text-gray-600 dark:text-gray-300">Select a conversation to start chatting</p>
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async (e: React.FormEvent | React.KeyboardEvent) => {
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize height of textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [newMessage]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-bg w-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-dark-border flex justify-between items-center bg-white dark:bg-dark-surface z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center font-bold text-xl shadow-inner border border-primary-100 dark:border-primary-800/50">
            {recipientName?.[0] || "U"}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight mb-0.5">{recipientName}</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Online</p>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="md:hidden p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-gray-50 dark:bg-dark-surface-2 rounded-full transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-gray-50 dark:bg-dark-bg relative">
        {/* Subtle patterned background for professional feel */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none" style={{ backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiIGZpbGw9Im5vbmUiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiIgZmlsbD0iIzAwMCIvPgo8L3N2Zz4=')" }}></div>
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
                  <span className="bg-white/95 dark:bg-dark-surface/95 backdrop-blur-sm text-gray-500 dark:text-gray-300 text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full shadow-sm font-semibold border border-gray-100 dark:border-dark-border">
                    {dateString}
                  </span>
                </div>
              )}
              <div className={`flex relative z-10 ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`relative max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm ${
                  isMe ? "bg-primary-600 text-white rounded-tr-none dark:bg-primary-950/40 dark:text-gray-100 dark:border dark:border-primary-800/30" 
                       : "bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-dark-border rounded-tl-none"
                }`}>

                  {msg.attachmentUrl && (
                    <div className="mb-3">
                      {msg.attachmentUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <div className="rounded-xl overflow-hidden border border-black/5 dark:border-white/5">
                          <img src={msg.attachmentUrl} alt="Attachment" className="max-w-full max-h-64 object-cover hover:opacity-90 transition-opacity cursor-pointer" />
                        </div>
                      ) : (
                        <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                          isMe ? 'bg-primary-700/40 dark:bg-primary-900/30 hover:bg-primary-700/60 text-white' 
                               : 'bg-gray-50 dark:bg-dark-surface-2 hover:bg-gray-100 dark:hover:bg-dark-border text-gray-800 dark:text-gray-200 border border-gray-200/50 dark:border-dark-border'
                        }`}>
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isMe ? 'bg-white/20 text-white' : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          </div>
                          <span className="text-sm font-medium underline decoration-white/30 hover:decoration-white truncate max-w-[200px]">Document Attached</span>
                        </a>
                      )}
                    </div>
                  )}
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                  <p className={`text-[10px] mt-1.5 flex items-center justify-end gap-1 ${isMe ? "text-primary-100/90 dark:text-primary-400/80" : "text-gray-400 dark:text-gray-500"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isMe && (
                      <span className={msg.seen ? "text-white dark:text-primary-400" : "text-primary-300/80"}>
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
      <div className="p-4 bg-white dark:bg-dark-surface border-t border-gray-200 dark:border-dark-border z-10">
        {selectedFile && (
          <div className="mb-3 flex items-center gap-3 bg-gray-50 dark:bg-dark-surface-2 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-dark-border w-fit max-w-full">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            </div>
            <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-300 flex-1">{selectedFile.name}</span>
            <button type="button" onClick={() => setSelectedFile(null)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-full hover:bg-white dark:hover:bg-dark-bg transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        )}
        <div className="flex items-end gap-2.5">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-gray-500 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-dark-surface-2 rounded-full transition-colors flex-shrink-0"
              title="Attach file"
            >
              <svg className="w-5 h-5 transform -rotate-45" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
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
            <button
              type="button"
              className="p-3 text-gray-500 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-dark-surface-2 rounded-full transition-colors flex-shrink-0"
              title="Add emoji"
              onClick={() => toast.info("Emoji picker coming soon! You can use system emoji keyboard (Win + .)")}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
          <div className="flex-1 bg-gray-50 dark:bg-dark-surface-2 rounded-2xl border border-gray-200 dark:border-dark-border overflow-hidden flex items-end focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500 transition-all max-h-[150px]">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              rows={1}
              className="flex-1 px-4 py-3 bg-transparent focus:outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none max-h-[120px] overflow-y-auto leading-relaxed"
            />
          </div>
          <button 
            onClick={(e) => handleSend(e)}
            disabled={(!newMessage.trim() && !selectedFile) || isUploading}
            className={`p-3 text-white rounded-full transition-all shadow-md flex-shrink-0 flex items-center justify-center h-11 w-11 ${
              isUploading
                ? "bg-primary-600 opacity-100 cursor-wait"
                : (!newMessage.trim() && !selectedFile)
                  ? "bg-gray-400 dark:bg-gray-600 opacity-50 cursor-not-allowed"
                  : "bg-primary-600 hover:bg-primary-700 active:scale-[0.97]"
            }`}
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 transform translate-x-[1px]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}