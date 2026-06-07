import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Inbox, ChevronDown, ChevronUp, Clock, Save, Loader2 } from "lucide-react";

type ContactStatus = "open" | "in_progress" | "resolved";
type FilterTab = "all" | ContactStatus;

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const STATUS_BADGE: Record<ContactStatus, string> = {
  open: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
  in_progress: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
  resolved: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800",
};

const STATUS_LABEL: Record<ContactStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
};

export default function ContactMessagesPage() {
  const messages = useQuery(api.contact.getContactMessages);
  const updateStatus = useMutation(api.contact.updateContactStatus);

  const [filter, setFilter] = useState<FilterTab>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  if (messages === undefined) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Loading contact messages...</p>
      </div>
    );
  }

  const filtered = messages.filter(
    (m) => filter === "all" || m.status === filter
  );

  const counts: Record<FilterTab, number> = {
    all: messages.length,
    open: messages.filter((m) => m.status === "open").length,
    in_progress: messages.filter((m) => m.status === "in_progress").length,
    resolved: messages.filter((m) => m.status === "resolved").length,
  };

  const tabs: { value: FilterTab; label: string }[] = [
    { value: "all", label: "All" },
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In Progress" },
    { value: "resolved", label: "Resolved" },
  ];

  const handleStatusUpdate = async (
    messageId: Id<"contactMessages">,
    newStatus: ContactStatus
  ) => {
    setUpdatingStatus(messageId);
    try {
      await updateStatus({ messageId, status: newStatus });
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleSaveNote = async (messageId: Id<"contactMessages">) => {
    setSavingNote(messageId);
    try {
      const note = adminNotes[messageId] ?? "";
      await updateStatus({
        messageId,
        status:
          messages.find((m) => m._id === messageId)?.status ?? "open",
        adminNote: note,
      });
    } catch (err) {
      console.error("Failed to save note:", err);
    } finally {
      setSavingNote(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Inbox className="w-5 h-5" />
          Contact Messages
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage contact form submissions from users and visitors.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === tab.value
                ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-70">({counts[tab.value]})</span>
          </button>
        ))}
      </div>

      {/* Messages */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            No messages
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {filter === "all"
              ? "No contact messages have been submitted yet."
              : `No ${STATUS_LABEL[filter as ContactStatus].toLowerCase()} messages.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((msg) => {
            const isExpanded = expandedId === msg._id;
            const status = msg.status as ContactStatus;
            return (
              <div
                key={msg._id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
              >
                {/* Card header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[status]}`}
                        >
                          {STATUS_LABEL[status]}
                        </span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {msg.subject}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {msg.name}
                        </span>
                        <span>·</span>
                        <span>{msg.email}</span>
                        <span>·</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            msg.source === "dashboard"
                              ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {msg.source === "dashboard"
                            ? "From Dashboard"
                            : "From Landing Page"}
                        </span>
                      </div>
                      {msg.projectId && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Project ID: {msg.projectId}
                        </p>
                      )}
                      {!isExpanded && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                          {msg.message.length > 150
                            ? msg.message.slice(0, 150) + "..."
                            : msg.message}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(msg._creationTime)}
                      </span>
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : msg._id)
                      }
                      className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3 h-3" /> Collapse
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3" /> View full
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-2">
                      {status === "open" && (
                        <>
                          <button
                            onClick={() =>
                              handleStatusUpdate(msg._id, "in_progress")
                            }
                            disabled={updatingStatus === msg._id}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50"
                          >
                            {updatingStatus === msg._id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              "Mark In Progress"
                            )}
                          </button>
                          <button
                            onClick={() =>
                              handleStatusUpdate(msg._id, "resolved")
                            }
                            disabled={updatingStatus === msg._id}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50"
                          >
                            Mark Resolved
                          </button>
                        </>
                      )}
                      {status === "in_progress" && (
                        <button
                          onClick={() =>
                            handleStatusUpdate(msg._id, "resolved")
                          }
                          disabled={updatingStatus === msg._id}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50"
                        >
                          {updatingStatus === msg._id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            "Mark Resolved"
                          )}
                        </button>
                      )}
                      {status === "resolved" && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                          Resolved
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700/30 space-y-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Full Message
                      </p>
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                        {msg.message}
                      </p>
                    </div>

                    {msg.resolvedAt && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Resolved at:{" "}
                        {new Date(msg.resolvedAt).toLocaleString("en-IN")}
                      </p>
                    )}

                    {/* Admin note */}
                    <div>
                      <label
                        htmlFor={`admin-note-${msg._id}`}
                        className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block"
                      >
                        Admin Note (internal)
                      </label>
                      <textarea
                        id={`admin-note-${msg._id}`}
                        rows={2}
                        value={
                          adminNotes[msg._id] !== undefined
                            ? adminNotes[msg._id]
                            : msg.adminNote || ""
                        }
                        onChange={(e) =>
                          setAdminNotes({
                            ...adminNotes,
                            [msg._id]: e.target.value,
                          })
                        }
                        placeholder="Add an internal note..."
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => handleSaveNote(msg._id)}
                          disabled={savingNote === msg._id}
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors disabled:opacity-50"
                        >
                          {savingNote === msg._id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Save className="w-3 h-3" />
                          )}
                          Save Note
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
