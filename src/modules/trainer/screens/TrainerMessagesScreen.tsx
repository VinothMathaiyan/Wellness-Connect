import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, PenSquare, ShieldCheck, X } from 'lucide-react';
import MobileShell from '../../../components/MobileShell';
import TrainerBottomNav from '../components/TrainerBottomNav';
import { useWellness } from '../../../context/WellnessContext';
import ProfileMenu from '../../../components/ProfileMenu';
import { getMessageThreads, getTrainerClients, getAssessorId, type TrainerClient } from '../../../services/supabaseService';
import ScreenHeader from '@/components/ScreenHeader';
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

  // Compose ("New Message") flow — pick a recipient: an active+cleared client,
  // or the Assessment Team (general team message, clientId null).
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [clients, setClients] = useState<TrainerClient[]>([]);
  const [assessorId, setAssessorId] = useState<string | null>(null);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState('');

  async function openCompose() {
    setIsComposeOpen(true);
    if (!userId || (clients.length > 0 || assessorId)) return;
    setClientsLoading(true);
    setClientsError('');
    try {
      const [data, assessor] = await Promise.all([
        getTrainerClients(userId),
        getAssessorId(),
      ]);
      setClients(data);
      setAssessorId(assessor);
    } catch (err: unknown) {
      setClientsError(err instanceof Error ? err.message : 'Failed to load clients.');
    } finally {
      setClientsLoading(false);
    }
  }

  function startConversation(clientId: string, recipientName: string) {
    setIsComposeOpen(false);
    navigate(`/trainer/messages/${clientId}`, {
      state: { clientId, recipientName, recipientRole: 'client' },
    });
  }

  // Message the Assessment Team — general team message (no client subject).
  function startTeamConversation(teamId: string, recipientName: string) {
    setIsComposeOpen(false);
    navigate(`/trainer/messages/${teamId}`, {
      state: { clientId: null, recipientName, recipientRole: 'assessor' },
    });
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
        <ScreenHeader
          variant="sub"
          title="Messages"
          subtitle={unreadTotal > 0 && !isLoading ? `${unreadTotal} unread` : undefined}
          avatar={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openCompose}
                className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold bg-gray-100 text-gray-700 active:scale-95 transition-transform"
                aria-label="New message"
              >
                <PenSquare size={16} />
                New
              </button>
              <ProfileMenu />
            </div>
          }
        />

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

      {/* Compose modal (centered overlay) — pick an active client to start a conversation */}
      {isComposeOpen && (
        <div
          onClick={() => setIsComposeOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90%',
              maxWidth: '400px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '0',
              zIndex: 1001,
              maxHeight: '70vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>New Message</h2>
              <button
                type="button"
                onClick={() => setIsComposeOpen(false)}
                aria-label="Close"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Client list (scrollable) */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {clientsLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse"
                    style={{
                      padding: '14px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      borderBottom: '1px solid #f3f4f6',
                    }}
                  >
                    <div className="rounded-full bg-gray-200" style={{ width: '40px', height: '40px' }} />
                    <div className="h-4 bg-gray-200 rounded" style={{ width: '40%' }} />
                  </div>
                ))}

              {!clientsLoading && clientsError && (
                <div
                  style={{
                    margin: '16px 20px',
                    padding: '12px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    border: '1px solid #fecaca',
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                  }}
                >
                  {clientsError}
                </div>
              )}

              {!clientsLoading && !clientsError && (
                <>
                  {/* Group: Assessment Team (general team message — clientId null) */}
                  <p
                    style={{
                      padding: '12px 20px 6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: '#6b7280',
                    }}
                  >
                    Assessment Team
                  </p>
                  {assessorId ? (
                    <div
                      onClick={() => startTeamConversation(assessorId, 'Assessment Team')}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#ffffff')}
                      style={{
                        padding: '14px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        borderBottom: '1px solid #f3f4f6',
                        cursor: 'pointer',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '9999px',
                          backgroundColor: '#166534',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <ShieldCheck size={20} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                          Assessment Team
                        </p>
                        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                          Wellness assessors
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: '#9ca3af', fontSize: '13px', padding: '4px 20px 12px' }}>
                      Assessment team is unavailable right now.
                    </p>
                  )}

                  {/* Group: My Clients (active + assessment-cleared) */}
                  <p
                    style={{
                      padding: '12px 20px 6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: '#6b7280',
                    }}
                  >
                    My Clients
                  </p>
                </>
              )}

              {!clientsLoading && !clientsError && clients.length === 0 && (
                <p style={{ color: '#9ca3af', fontSize: '13px', padding: '4px 20px 12px' }}>
                  No active clients to message yet.
                </p>
              )}

              {!clientsLoading && !clientsError &&
                clients.map(client => (
                  <div
                    key={client.id}
                    onClick={() => startConversation(client.id, client.full_name)}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#ffffff')}
                    style={{
                      padding: '14px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    {/* Initials avatar */}
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '9999px',
                        backgroundColor: '#0d9488',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(client.full_name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#111827',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {client.full_name}
                      </p>
                      {client.city && (
                        <p
                          style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            marginTop: '2px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {client.city}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      <TrainerBottomNav />
    </MobileShell>
  );
}
