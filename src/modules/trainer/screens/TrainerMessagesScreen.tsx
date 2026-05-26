import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, PenSquare, X } from 'lucide-react';
import MobileShell from '../../../components/MobileShell';
import TrainerBottomNav from '../components/TrainerBottomNav';
import { useWellness } from '../../../context/WellnessContext';
import ProfileMenu from '../../../components/ProfileMenu';
import { getMessageThreads, getTrainerClients, type TrainerClient } from '../../../services/supabaseService';
import { formatDate } from '@/utils/dateUtils';

interface MessageThread {
  other_user_id: string;
  other_user_name: string;
  client_id: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

function formatRelativeTime(isoString: string): string {
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHours < 24) {
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();
    if (isToday) return 'Today';
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export default function TrainerMessagesScreen() {
  const navigate = useNavigate();
  const { userId } = useWellness();

  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Compose ("New Message") flow — pick an active client to start a conversation.
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [clients, setClients] = useState<TrainerClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState('');

  async function openCompose() {
    setIsComposeOpen(true);
    if (!userId || clients.length > 0) return;
    setClientsLoading(true);
    setClientsError('');
    try {
      const data = await getTrainerClients(userId);
      setClients(data);
    } catch (err: unknown) {
      setClientsError(err instanceof Error ? err.message : 'Failed to load clients.');
    } finally {
      setClientsLoading(false);
    }
  }

  function startConversation(clientId: string) {
    setIsComposeOpen(false);
    navigate(`/trainer/messages/${clientId}`, { state: { clientId } });
  }

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;

    async function fetchThreads() {
      setIsLoading(true);
      setError('');
      try {
        const res = await getMessageThreads(userId!);
        if (!isMounted) return;
        if (res.error) throw new Error(res.error);
        setThreads(res.data);
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load messages.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchThreads();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const unreadTotal = threads.reduce((sum, t) => sum + t.unread_count, 0);

  return (
    <MobileShell className="bg-[#F2F8F7]">
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Header */}
        <div
          className="px-5 pt-10 pb-5 rounded-b-3xl shadow-sm text-white"
          style={{ background: 'linear-gradient(135deg, #0d9488 0%, #7c3aed 100%)' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">Messages</h1>
              {unreadTotal > 0 && !isLoading && (
                <p className="text-white/80 text-sm font-medium">{unreadTotal} unread</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openCompose}
                className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold bg-white/15 text-white active:scale-95 transition-transform"
                aria-label="New message"
              >
                <PenSquare size={16} />
                New
              </button>
              <ProfileMenu />
            </div>
          </div>
        </div>

        <div className="px-4 mt-4 space-y-2">
          {/* Error */}
          {error && (
            <div
              className="p-3 rounded-xl text-sm border"
              style={{ backgroundColor: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}
            >
              {error}
            </div>
          )}

          {/* Loading skeletons */}
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3 animate-pulse"
              >
                <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-2/5" />
                  <div className="h-3 bg-gray-200 rounded w-3/5" />
                </div>
                <div className="h-3 bg-gray-200 rounded w-12" />
              </div>
            ))}

          {/* Thread list */}
          {!isLoading && !error && threads.length > 0 &&
            threads.map(thread => {
              const initials = getInitials(thread.other_user_name);
              const hasUnread = thread.unread_count > 0;

              return (
                <button
                  key={thread.other_user_id}
                  type="button"
                  onClick={() =>
                    navigate(`/trainer/messages/${thread.other_user_id}`, {
                      state: { clientId: thread.client_id },
                    })
                  }
                  className="w-full rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3 active:scale-[0.98] transition-transform text-left"
                  style={{ backgroundColor: hasUnread ? '#f0fdfa' : '#ffffff' }}
                >
                  {/* Avatar */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                    style={{ backgroundColor: '#ccfbf1', color: '#0f766e' }}
                  >
                    {initials}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm text-gray-900 truncate"
                      style={{ fontWeight: hasUnread ? 700 : 500 }}
                    >
                      {thread.other_user_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {thread.last_message}
                    </p>
                  </div>

                  {/* Right side: time + badge */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-xs text-gray-400">
                      {formatRelativeTime(thread.last_message_at)}
                    </span>
                    {hasUnread && (
                      <span
                        className="flex items-center justify-center text-white text-[10px] font-bold rounded-full"
                        style={{
                          minWidth: '18px',
                          height: '18px',
                          backgroundColor: '#0d9488',
                          padding: '0 4px',
                        }}
                      >
                        {thread.unread_count > 99 ? '99+' : thread.unread_count}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

          {/* Empty state */}
          {!isLoading && !error && threads.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: '#f0fdfa' }}
              >
                <MessageSquare size={28} style={{ color: '#0d9488' }} />
              </div>
              <p className="text-gray-500 text-sm mb-5">
                No messages yet — start a conversation with a client
              </p>
              <button
                type="button"
                onClick={openCompose}
                className="flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white active:scale-[0.98] transition-transform"
                style={{ backgroundColor: '#0d9488' }}
              >
                <PenSquare size={16} />
                New Message
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Compose sheet — pick an active client to start a conversation */}
      {isComposeOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={() => setIsComposeOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-3xl max-h-[75vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">New Message</h2>
              <button
                type="button"
                onClick={() => setIsComposeOpen(false)}
                className="p-1 rounded-full text-gray-400 active:scale-95 transition-transform"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>

            <div className="overflow-y-auto px-4 py-3 space-y-2">
              {clientsLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                    <div className="w-11 h-11 rounded-full bg-gray-200 shrink-0" />
                    <div className="h-4 bg-gray-200 rounded w-2/5" />
                  </div>
                ))}

              {!clientsLoading && clientsError && (
                <div
                  className="p-3 rounded-xl text-sm border"
                  style={{ backgroundColor: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}
                >
                  {clientsError}
                </div>
              )}

              {!clientsLoading && !clientsError && clients.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">
                  No active clients to message yet.
                </p>
              )}

              {!clientsLoading && !clientsError &&
                clients.map(client => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => startConversation(client.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl active:bg-gray-50 transition-colors text-left"
                  >
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                      style={{ backgroundColor: '#ccfbf1', color: '#0f766e' }}
                    >
                      {getInitials(client.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {client.full_name}
                      </p>
                      {client.city && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{client.city}</p>
                      )}
                    </div>
                  </button>
                ))}
            </div>

            <div style={{ height: 'calc(env(safe-area-inset-bottom) + 12px)' }} />
          </div>
        </div>
      )}

      <TrainerBottomNav />
    </MobileShell>
  );
}
