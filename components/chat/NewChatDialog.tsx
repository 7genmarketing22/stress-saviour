"use client";

import { useState, useEffect } from "react";
import { useChat } from "@/contexts/ChatContext";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { X, Search, MessageSquare, AlertCircle } from "lucide-react";
import type { ChatParticipant } from "@/types/chat";

interface NewChatDialogProps {
  open: boolean;
  onClose: () => void;
  allowedRoles: Array<"patient" | "doctor" | "admin" | "super_admin">;
}

export function NewChatDialog({ open, onClose, allowedRoles }: NewChatDialogProps) {
  const { startConversation, searchUsers } = useChat();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ChatParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setError(null);
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchUsers(query, allowedRoles);
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, allowedRoles, searchUsers]);

  const handleStart = async (user: ChatParticipant) => {
    setStarting(user.id);
    setError(null);
    try {
      await startConversation(user.id);
      handleClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to open conversation. Please try again.";
      setError(msg);
    } finally {
      setStarting(null);
    }
  };

  const handleClose = () => {
    setQuery("");
    setResults([]);
    setError(null);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="fixed inset-x-4 top-1/4 z-50 max-w-md mx-auto bg-card border border-border rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-base font-semibold">New Conversation</h3>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-4 mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Search */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => { setQuery(e.target.value); setError(null); }}
              placeholder="Search by name…"
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-muted/50 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto scrollbar-hide px-2 pb-3">
          {loading && (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && results.length === 0 && query.trim() && !error && (
            <div className="flex flex-col items-center py-8 gap-2 text-center">
              <MessageSquare className="w-6 h-6 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No users found for "{query}"</p>
            </div>
          )}

          {!loading && !query.trim() && (
            <p className="text-center text-xs text-muted-foreground py-6">
              Search for a {allowedRoles.join(" or ")} to start chatting
            </p>
          )}

          {results.map((user) => (
            <button
              key={user.id}
              onClick={() => handleStart(user)}
              disabled={starting === user.id || starting !== null}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors text-left disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <UserAvatar
                name={user.full_name}
                avatarUrl={user.avatar_url}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user.full_name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
              </div>
              {starting === user.id ? (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <span className="text-xs text-primary font-medium shrink-0 opacity-0 group-hover:opacity-100">
                  Chat →
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
