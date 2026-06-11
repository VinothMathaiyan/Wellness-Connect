import { useEffect, useRef, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Send } from 'lucide-react';
import ScreenHeader from '@/components/ScreenHeader';
import { useWellness } from '../../../context/WellnessContext';
import {
  getMessageThread,
  markMessagesRead,
  sendAssessmentMessage,
  type AssessmentMessage,
} from '../../../services/supabaseService';

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export interface MessageThreadViewProps {
  /** The other participant in the thread. */
  otherUserId: string;
  /** Name hint (e.g. from the compose picker) so a brand-new thread shows the
      right header immediately instead of "Conversation". */
  initialName?: string;
  /** Back handler — shown in the header when provided (mobile route usage). */
  onBack?: () => void;
  /** Header avatar slot (mobile route passes ProfileMenu; inline usage omits). */
  avatar?: ReactNode;
  /** Reserve space above the fixed mobile bottom nav (mobile route usage). */
  reserveBottomNavSpace?: boolean;
  /** Rendered at the end of the flex column (mobile route passes the bottom nav). */
  bottomNav?: ReactNode;
}

/**
 * Reusable assessor message-thread view (header + messages + composer).
 * Used by MessageThreadScreen (mobile push-navigation route) and inline by
 * MessagesScreen at lg: (master-detail). Data flow is identical in both
 * usages: getMessageThread + markMessagesRead on mount / otherUserId change,
 * sendAssessmentMessage (with the thread-derived clientId) on send.
 */
export default function MessageThreadView({
  otherUserId,
  initialName,
  onBack,
  avatar,
  reserveBottomNavSpace = false,
  bottomNav,
}: MessageThreadViewProps) {
  const { userId: assessorId } = useWellness();

  const [messages, setMessages] = useState<AssessmentMessage[]>([]);
  const [otherName, setOtherName] = useState(initialName ?? '');
  const [clientId, setClientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!assessorId || !otherUserId) return;

    let isMounted = true;

    async function fetchThread() {
      setIsLoading(true);
      setError('');
      try {
        const [threadRes] = await Promise.all([
          getMessageThread(assessorId!, otherUserId!),
          markMessagesRead(assessorId!, otherUserId!),
        ]);

        if (!isMounted) return;

        if (threadRes.error) throw new Error(threadRes.error);

        const msgs = threadRes.data;
        setMessages(msgs);

        // Derive other user's name and clientId from messages
        if (msgs.length > 0) {
          const fromOther = msgs.find(m => m.from_user_id === otherUserId);
          if (fromOther) {
            setOtherName(fromOther.from_name);
          } else {
            // All messages are from me — fall back to the picker-provided name.
            setOtherName(initialName ?? 'Conversation');
          }
          // Pick clientId from first available
          const withClient = msgs.find(m => m.client_id !== null);
          if (withClient) setClientId(withClient.client_id);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load thread.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchThread();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessorId, otherUserId]);

  // Scroll to bottom when messages load or change
  useEffect(() => {
    if (!isLoading) {
      scrollToBottom();
    }
  }, [isLoading, messages.length, scrollToBottom]);

  async function handleSend() {
    const text = inputText.trim();
    if (!text || !assessorId || !otherUserId || isSending) return;

    setSendError('');

    // Optimistic message
    const optimisticMsg: AssessmentMessage = {
      id: `optimistic-${Date.now()}`,
      from_user_id: assessorId,
      from_name: 'Me',
      to_user_id: otherUserId,
      client_id: clientId,
      message: text,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setInputText('');
    setIsSending(true);
    scrollToBottom();

    const res = await sendAssessmentMessage(
      assessorId,
      otherUserId,
      text,
      clientId ?? undefined,
    );

    setIsSending(false);

    if (!res.success) {
      // Revert optimistic message and restore input
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setInputText(text);
      setSendError(res.error ?? 'Failed to send message. Please try again.');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Group consecutive messages from the same sender
  type GroupedMessage = AssessmentMessage & { isGrouped: boolean };

  const grouped: GroupedMessage[] = messages.map((msg, idx) => ({
    ...msg,
    isGrouped: idx > 0 && messages[idx - 1].from_user_id === msg.from_user_id,
  }));

  return (
    <div className="flex flex-col w-full" style={{ height: '100vh', maxHeight: '100dvh' }}>
      {/* Header */}
      <div className="shrink-0">
        <ScreenHeader
          variant="sub"
          title={otherName || (isLoading ? '...' : 'Conversation')}
          subtitle="Assessment conversation"
          onBack={onBack}
          avatar={avatar}
        />
      </div>

      {/* Message area */}
      <div className={`flex-1 overflow-y-auto px-4 py-4 ${reserveBottomNavSpace ? 'pb-36' : 'pb-4'}`}>
        {/* Loading skeletons */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className="h-10 rounded-2xl animate-pulse bg-gray-200"
                  style={{ width: `${40 + (i % 3) * 20}%` }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div
            className="p-3 rounded-xl text-sm border text-center"
            style={{ backgroundColor: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}
          >
            {error}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <p className="text-gray-400 text-sm">No messages yet. Say hello!</p>
          </div>
        )}

        {/* Messages */}
        {!isLoading && !error && grouped.map(msg => {
          const isFromMe = msg.from_user_id === assessorId;

          return (
            <div
              key={msg.id}
              className={`flex ${isFromMe ? 'justify-end' : 'justify-start'} ${msg.isGrouped ? 'mt-1' : 'mt-4'}`}
            >
              <div
                className="max-w-[75%] px-4 py-2.5 rounded-2xl"
                style={
                  isFromMe
                    ? { backgroundColor: '#0d9488', color: '#ffffff' }
                    : { backgroundColor: '#e5e7eb', color: '#111827' }
                }
              >
                <p className="text-sm leading-snug break-words">{msg.message}</p>
                <p
                  className="text-[10px] mt-1"
                  style={
                    isFromMe
                      ? { color: 'rgba(255,255,255,0.65)', textAlign: 'right' }
                      : { color: '#9ca3af', textAlign: 'left' }
                  }
                >
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Send error */}
      {sendError && (
        <div
          className="mx-4 mb-1 px-3 py-2 rounded-xl text-xs border"
          style={{ backgroundColor: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}
        >
          {sendError}
        </div>
      )}

      {/* Input bar — fixed above bottom nav on mobile */}
      <div
        className="shrink-0 px-4 py-3 bg-white border-t border-gray-100"
        style={reserveBottomNavSpace ? { paddingBottom: 'calc(64px + env(safe-area-inset-bottom) + 8px)' } : undefined}
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-400 focus:bg-white transition-colors"
            disabled={isSending}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim() || isSending}
            className="flex items-center justify-center w-10 h-10 rounded-full shrink-0 transition-colors active:scale-95"
            style={{
              backgroundColor:
                !inputText.trim() || isSending ? '#d1d5db' : '#0d9488',
              color: '#ffffff',
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {bottomNav}
    </div>
  );
}
