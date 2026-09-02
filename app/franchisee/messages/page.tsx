"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import {
  MessageSquare,
  Send,
  Search,
  CheckCheck,
  Wifi,
  WifiOff,
  RefreshCw,
  ArrowLeft,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/context/user-context";
import { useStudents } from "@/hooks/api/student.hooks";
import { API_BASE_URL } from "@/lib/config";

interface MessageItem {
  id?: number;
  studentId: number;
  parentName: string;
  studentName: string;
  parentRollNo: string;
  franchiseId: string;
  recipientType: string;
  senderRole: string;
  content: string;
  isRead?: boolean;
  createdAt: string;
}

interface ParentThread {
  studentId: number;
  parentName: string;
  studentName: string;
  parentRollNo: string;
  franchiseId: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  messages: MessageItem[];
}

function getSocketUrl(): string {
  if (typeof window === "undefined") return "http://localhost:5500";
  if (process.env.NEXT_PUBLIC_SOCKET_URL?.trim()) {
    return process.env.NEXT_PUBLIC_SOCKET_URL.trim();
  }
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:5500";
  }
  return process.env.NEXT_PUBLIC_API_URL?.trim() || window.location.origin;
}

export default function FranchiseParentMessagesPage() {
  const { user } = useUser();
  const franchiseId = user?.franchiseId ?? "";
  const { students: realStudents = [] } = useStudents();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [dbThreads, setDbThreads] = useState<ParentThread[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Fetch real threads from backend DB via API_BASE_URL proxy (/api/proxy)
  const fetchThreads = useCallback(async () => {
    if (!franchiseId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE_URL}/communications/messages/franchise/${franchiseId}`
      );
      if (res.ok) {
        const json = await res.json();
        const rawThreads = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
        setDbThreads(rawThreads);
      }
    } catch {
      // Server might be down
    }
    setLoading(false);
  }, [franchiseId]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // Combine enrolled students from roster with DB chat threads so EVERY student appears in left sidebar
  const threads = useMemo<ParentThread[]>(() => {
    const threadMap = new Map<number, ParentThread>();

    // 1. First add threads from DB (which have active messages)
    for (const t of dbThreads) {
      threadMap.set(t.studentId, t);
    }

    // 2. Then add enrolled students from roster if they don't have a DB thread yet
    for (const s of realStudents) {
      if (!threadMap.has(s.id)) {
        const parentName =
          (s as any).parentName ||
          (s as any).guardianName ||
          (s as any).fatherName ||
          `Parent of ${s.name}`;
        const rollNo = s.rollNo || `ST/AB/772/0000${s.id}`;

        threadMap.set(s.id, {
          studentId: s.id,
          parentName,
          studentName: s.name,
          parentRollNo: rollNo,
          franchiseId,
          lastMessage: "No messages yet",
          lastMessageAt: (s as any).createdAt || new Date().toISOString(),
          unreadCount: 0,
          messages: [],
        });
      }
    }

    // Sort by latest message date
    return Array.from(threadMap.values()).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  }, [dbThreads, realStudents, franchiseId]);

  // Set default selected student if none is selected
  useEffect(() => {
    if (threads.length > 0 && !selectedStudentId) {
      setSelectedStudentId(threads[0].studentId);
    }
  }, [threads, selectedStudentId]);

  // Helper to merge an incoming message into threads avoiding duplicates
  const mergeIncomingMessage = useCallback((msg: MessageItem, isUnread = false) => {
    setDbThreads((prev) => {
      const idx = prev.findIndex((t) => t.studentId === msg.studentId);
      if (idx !== -1) {
        const updated = [...prev];
        const thread = { ...updated[idx] };

        // Check if message already exists by ID or by content + role + timing
        const existingIdx = thread.messages.findIndex((m) => {
          if (m.id && msg.id && m.id === msg.id) return true;
          if (m.content === msg.content && m.senderRole === msg.senderRole) {
            const timeDiff = Math.abs(
              new Date(m.createdAt).getTime() - new Date(msg.createdAt).getTime()
            );
            return timeDiff < 10000; // within 10 seconds
          }
          return false;
        });

        if (existingIdx !== -1) {
          // Update existing message with actual ID/timestamp
          const updatedMessages = [...thread.messages];
          updatedMessages[existingIdx] = { ...updatedMessages[existingIdx], ...msg };
          thread.messages = updatedMessages;
        } else {
          // Append new message
          thread.messages = [...thread.messages, msg];
          if (isUnread) thread.unreadCount += 1;
        }

        thread.lastMessage = msg.content;
        thread.lastMessageAt = msg.createdAt;
        updated[idx] = thread;
        return updated;
      }

      // New thread
      return [
        {
          studentId: msg.studentId,
          parentName: msg.parentName,
          studentName: msg.studentName,
          parentRollNo: msg.parentRollNo,
          franchiseId: msg.franchiseId,
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt,
          unreadCount: isUnread ? 1 : 0,
          messages: [msg],
        },
        ...prev,
      ];
    });
  }, []);

  // Connect Socket.io to backend
  useEffect(() => {
    if (!franchiseId) return;

    const socketUrl = getSocketUrl();
    const newSocket = io(`${socketUrl}/messaging`, {
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
      newSocket.emit("join_franchise_room", { franchiseId });
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
    });

    newSocket.on("new_parent_message", (msg: MessageItem) => {
      toast.info(`New message from ${msg.parentName}`, {
        description: msg.content.substring(0, 80),
      });
      mergeIncomingMessage(msg, true);
    });

    newSocket.on("new_franchise_reply", (msg: MessageItem) => {
      mergeIncomingMessage(msg, false);
    });

    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  }, [franchiseId, mergeIncomingMessage]);

  // Scroll to bottom on message updates
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threads, selectedStudentId]);

  const activeThread = threads.find((t) => t.studentId === selectedStudentId);

  const handleSendReply = async () => {
    if (!replyText.trim() || !activeThread || !franchiseId) return;

    const content = replyText.trim();
    setReplyText("");

    const newMsg: MessageItem = {
      studentId: activeThread.studentId,
      parentName: activeThread.parentName,
      studentName: activeThread.studentName,
      parentRollNo: activeThread.parentRollNo,
      franchiseId,
      recipientType: "franchise",
      senderRole: "franchisee",
      content,
      createdAt: new Date().toISOString(),
    };

    // Optimistic UI update
    mergeIncomingMessage(newMsg, false);

    // Emit via socket if connected; fallback to REST if socket disconnected
    if (socket && isConnected) {
      socket.emit("franchise_reply", {
        studentId: activeThread.studentId,
        parentName: activeThread.parentName,
        studentName: activeThread.studentName,
        parentRollNo: activeThread.parentRollNo,
        franchiseId,
        content,
      });
    } else {
      try {
        await fetch(`${API_BASE_URL}/communications/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newMsg),
        });
      } catch {
        toast.error("Failed to send message");
      }
    }
  };

  const handleDeleteSingleMessage = async (msgId: number) => {
    try {
      await fetch(`${API_BASE_URL}/communications/messages/${msgId}`, {
        method: "DELETE",
      });
      setDbThreads((prev) =>
        prev.map((t) => ({
          ...t,
          messages: t.messages.filter((m) => m.id !== msgId),
        }))
      );
      toast.success("Message deleted");
    } catch {
      toast.error("Could not delete message");
    }
  };

  const handleClearChat = async (studentId: number) => {
    if (!confirm("Are you sure you want to clear this entire conversation?")) return;
    try {
      await fetch(`${API_BASE_URL}/communications/messages/student/${studentId}`, {
        method: "DELETE",
      });
      setDbThreads((prev) => prev.filter((t) => t.studentId !== studentId));
      toast.success("Chat cleared");
    } catch {
      toast.error("Could not clear chat");
    }
  };

  const filteredThreads = threads.filter(
    (t) =>
      t.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.parentRollNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) return "Today";
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  // Group messages by date for date headers
  const renderMessages = (messages: MessageItem[]) => {
    const elements: React.ReactNode[] = [];
    let lastDate = "";

    messages.forEach((m, idx) => {
      const dateStr = formatDate(m.createdAt);
      if (dateStr !== lastDate) {
        lastDate = dateStr;
        elements.push(
          <div key={`date-${idx}`} className="flex justify-center my-3">
            <span className="rounded-full bg-slate-200 px-3 py-1 text-[10px] font-bold text-slate-600">
              {dateStr}
            </span>
          </div>
        );
      }

      const isParent = m.senderRole === "parent";
      const time = formatTime(m.createdAt);

      elements.push(
        <div
          key={m.id ? `msg-${m.id}` : `msg-tmp-${idx}-${m.createdAt}`}
          className={`group flex mb-2 ${isParent ? "justify-start" : "justify-end"}`}
        >
          <div
            className={`relative max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
              isParent
                ? "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                : "bg-primary text-white rounded-tr-none"
            }`}
          >
            {isParent && (
              <p className="text-[10px] font-extrabold text-primary/80 mb-1">
                {m.parentName}
              </p>
            )}
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap pr-4">
              {m.content}
            </p>
            <div
              className={`flex items-center justify-end gap-1 mt-1 ${
                isParent ? "text-slate-400" : "text-white/60"
              }`}
            >
              <span className="text-[10px]">{time}</span>
              {!isParent && <CheckCheck className="h-3 w-3" />}
              {m.id && (
                <button
                  onClick={() => handleDeleteSingleMessage(m.id!)}
                  title="Delete message"
                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 p-0.5 rounded hover:bg-black/10"
                >
                  <Trash2 className="h-3 w-3 text-red-400 hover:text-red-600" />
                </button>
              )}
            </div>
          </div>
        </div>
      );
    });

    return elements;
  };

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col bg-slate-50 p-4 md:p-6">
      {/* Header Banner */}
      <div className="shrink-0 mb-4 flex flex-col justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm border border-slate-200/80 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900">
              Parent Messages
            </h1>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                isConnected
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3 text-emerald-600 animate-pulse" />{" "}
                  Live
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-amber-500" /> Offline
                </>
              )}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time messaging with parents of enrolled students
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchThreads();
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Main Chat Layout */}
      <div className="grid flex-1 min-h-0 grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-12">
        {/* Left: Thread List Sidebar */}
        <div
          className={`flex flex-col min-h-0 h-full overflow-hidden border-b border-slate-200 md:col-span-4 md:border-b-0 md:border-r ${
            activeThread ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Search Bar */}
          <div className="shrink-0 border-b border-slate-100 p-3 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search conversations or students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-slate-100 py-2 pl-9 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-slate-300"
              />
            </div>
          </div>

          {/* Thread List Scroll Container */}
          <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-100 bg-white">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />
                <p className="mt-2 text-xs text-slate-400">Loading roster...</p>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-500">
                  No conversations found
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Enrolled students will appear here
                </p>
              </div>
            ) : (
              filteredThreads.map((t) => {
                const isSelected = t.studentId === selectedStudentId;
                const time = t.messages.length > 0 ? formatTime(t.lastMessageAt) : "";

                return (
                  <button
                    key={t.studentId}
                    onClick={() => {
                      setSelectedStudentId(t.studentId);
                      setDbThreads((prev) =>
                        prev.map((item) =>
                          item.studentId === t.studentId
                            ? { ...item, unreadCount: 0 }
                            : item
                        )
                      );
                    }}
                    className={`flex w-full items-start gap-3 p-3.5 text-left transition-all hover:bg-slate-50 ${
                      isSelected
                        ? "bg-slate-100/90 border-l-4 border-l-primary"
                        : ""
                    }`}
                  >
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {t.parentName.charAt(0).toUpperCase()}
                      {t.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-extrabold text-white">
                          {t.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="truncate text-xs font-extrabold text-slate-900">
                          {t.parentName}
                        </h4>
                        {time && (
                          <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-1">
                            {time}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-primary/80 mt-0.5">
                        <span className="truncate">{t.studentName}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500 font-mono text-[10px] shrink-0">
                          {t.parentRollNo}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {t.lastMessage}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Chat */}
        <div
          className={`flex flex-col min-h-0 h-full overflow-hidden md:col-span-8 ${
            !activeThread ? "hidden md:flex" : "flex"
          }`}
        >
          {activeThread ? (
            <>
              {/* Chat Header */}
              <div className="shrink-0 flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-3.5 px-5">
                <div className="flex items-center gap-3">
                  {/* Back button on mobile */}
                  <button
                    onClick={() => setSelectedStudentId(null)}
                    className="md:hidden p-1 rounded-lg hover:bg-slate-200"
                  >
                    <ArrowLeft className="h-4 w-4 text-slate-600" />
                  </button>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-extrabold text-sm">
                    {activeThread.parentName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      {activeThread.parentName}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <span>{activeThread.studentName}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-600 bg-slate-200/60 px-1.5 py-0.5 rounded text-[10px]">
                        {activeThread.parentRollNo}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Clear Chat Button */}
                {activeThread.messages.length > 0 && (
                  <button
                    onClick={() => handleClearChat(activeThread.studentId)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-all"
                    title="Clear Chat History"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Clear Chat
                  </button>
                )}
              </div>

              {/* Chat Messages Scroll Container */}
              <div className="flex-1 overflow-y-auto min-h-0 p-4 md:p-6 bg-[#f0f2f5]">
                {activeThread.messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                    <User className="h-12 w-12 text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-600">
                      No messages yet with {activeThread.parentName}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Type a message below to start the conversation!
                    </p>
                  </div>
                ) : (
                  renderMessages(activeThread.messages)
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Input */}
              <div className="shrink-0 border-t border-slate-200 bg-white p-3.5 px-5">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendReply();
                  }}
                  className="flex items-center gap-3"
                >
                  <input
                    type="text"
                    placeholder={`Reply to ${activeThread.parentName}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 border border-transparent focus:border-slate-300"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" /> Send
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center text-slate-400">
              <MessageSquare className="h-12 w-12 text-slate-300 mb-3" />
              <p className="text-sm font-semibold">
                {threads.length === 0
                  ? "No enrolled students found"
                  : "Select a conversation"}
              </p>
              <p className="text-xs mt-1 text-slate-400">
                {threads.length === 0
                  ? "Enrolled students will appear here"
                  : "Choose a parent thread from the left to start chatting"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
