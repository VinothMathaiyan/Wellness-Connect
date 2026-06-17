import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, PenSquare, Search, X } from 'lucide-react';
import MobileShell from '../../../components/MobileShell';
import ProfileMenu from '@/components/ProfileMenu';
import ScreenHeader from '@/components/ScreenHeader';
import AssessmentBottomNav from '../components/AssessmentBottomNav';
import MessageThreadView from '../components/MessageThreadView';
import { useWellness } from '../../../context/WellnessContext';
import {
  getMessageThreads,
  getAllTrainers,
  getAllClients,
  type MessageRecipientOption,
} from '../../../services/supabaseService';
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
    // Check if same calendar day
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

export default function MessagesScreen() {
  const navigate = useNavigate();
  const { userId } = useWellness();

  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Compose ("New message") flow — assessor scope is open by design: address
  // any trainer or any client. Grouped Trainers / Clients.
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [trainerOptions, setTrainerOptions] = useState<MessageRecipientOption[]>([]);
  const [clientOptions, setClientOptions] = useState<MessageRecipientOption[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [recipientsError, setRecipientsError] = useState('');
  // Client-side filter for the recipient picker — no server round-trip.
  const [recipientSearch, setRecipientSearch] = useState('');

  async function openCompose() {
    setIsComposeOpen(true);
    setRecipientSearch('');
    if (trainerOptions.length > 0 || clientOptions.length > 0) return;
    setRecipientsLoading(true);
    setRecipientsError('');
    try {
      const [allTrainers, allClients] = await Promise.all([
        getAllTrainers(),
        getAllClients(),
      ]);
      setTrainerOptions(allTrainers);
      setClientOptions(allClients);
    } catch (err: unknown) {
      setRecipientsError(err instanceof Error ? err.message : 'Failed to load recipients.');
    } finally {
      setRecipientsLoading(false);
    }
  }

  // lg: master-detail — the thread shown inline beside the list. Mobile keeps
  // push navigation to /assessment/messages/:userId and never sets this.
  const [selectedThread, setSelectedThread] = useState<{
    id: string;
    name?: string;
  } | null>(null);

  const isDesktop = () =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

  function openThread(id: string, name?: string, role?: string) {
    if (isDesktop()) {
      // Inline selection: show thread beside the list. markMessagesRead runs
      // inside the thread view; mirror it locally so the row badge clears.
      setSelectedThread({ id, name });
      setThreads(prev =>
        prev.map(t => (t.other_user_id === id ? { ...t, unread_count: 0 } : t)),
      );
      return;
    }
    // Mobile: exactly the existing push-navigation behavior — nav state is only
    // passed from the compose picker (which supplies a role), as today.
    navigate(`/assessment/messages/${id}`, {
      state: role ? { recipientName: name, recipientRole: role } : undefined,
    });
  }

  function startConversation(
    recipientId: string,
    recipientName: string,
    recipientRole: string,
  ) {
    setIsComposeOpen(false);
    openThread(recipientId, recipientName, recipientRole);
  }

  // Filter both groups client-side, case-insensitive. Empty box → full lists.
  const recipientQuery = recipientSearch.trim().toLowerCase();
  const filteredTrainers = recipientQuery
    ? trainerOptions.filter(p => p.full_name.toLowerCase().includes(recipientQuery))
    : trainerOptions;
  const filteredClients = recipientQuery
    ? clientOptions.filter(p => p.full_name.toLowerCase().includes(recipientQuery))
    : clientOptions;

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
    <MobileShell className="bg-[#F2F8F7] lg:flex-row">
      {/* Inbox column — full width on mobile, fixed-width master column at lg: */}
      <div className="flex-1 overflow-y-auto pb-24 lg:flex-none lg:w-[400px] lg:h-screen lg:border-r lg:border-[#E5E7EB]">
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
                  onClick={() => openThread(thread.other_user_id, thread.other_user_name)}
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
              <p className="text-gray-500 text-sm mb-5">No messages yet</p>
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

      {/* Detail column — desktop only. Mobile keeps push navigation. */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:h-screen">
        {selectedThread ? (
          <MessageThreadView
            key={selectedThread.id}
            otherUserId={selectedThread.id}
            initialName={selectedThread.name}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: '#f0fdfa' }}
            >
              <MessageSquare size={28} style={{ color: '#0d9488' }} />
            </div>
            <p className="text-gray-500 text-sm">Select a conversation to read and reply</p>
          </div>
        )}
      </div>

      {/* Compose modal — pick any trainer or client (open assessor scope) */}
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

            {/* Search box — filters both groups client-side */}
            {!recipientsLoading && !recipientsError && (
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ position: 'relative' }}>
                  <Search
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af',
                    }}
                  />
                  <input
                    type="text"
                    value={recipientSearch}
                    onChange={e => setRecipientSearch(e.target.value)}
                    placeholder="Search by name..."
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      borderRadius: '10px',
                      border: '1px solid #e5e7eb',
                      backgroundColor: '#f9fafb',
                      fontSize: '14px',
                      color: '#111827',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Recipient list (scrollable) */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {recipientsLoading &&
                Array.from({ length: 5 }).map((_, i) => (
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

              {!recipientsLoading && recipientsError && (
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
                  {recipientsError}
                </div>
              )}

              {!recipientsLoading && !recipientsError && (
                <>
                  {/* Group: Trainers */}
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
                    Trainers
                  </p>
                  {filteredTrainers.length === 0 && (
                    <p style={{ color: '#9ca3af', fontSize: '13px', padding: '4px 20px 12px' }}>
                      No trainers found.
                    </p>
                  )}
                  {filteredTrainers.map(person => (
                    <RecipientRow
                      key={person.id}
                      person={person}
                      role="trainer"
                      onSelect={startConversation}
                    />
                  ))}

                  {/* Group: Clients */}
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
                    Clients
                  </p>
                  {filteredClients.length === 0 && (
                    <p style={{ color: '#9ca3af', fontSize: '13px', padding: '4px 20px 12px' }}>
                      No clients found.
                    </p>
                  )}
                  {filteredClients.map(person => (
                    <RecipientRow
                      key={person.id}
                      person={person}
                      role="client"
                      onSelect={startConversation}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <AssessmentBottomNav alertCount={unreadTotal} />
    </MobileShell>
  );
}

function RecipientRow({
  person,
  role,
  onSelect,
}: {
  person: MessageRecipientOption;
  role: string;
  onSelect: (id: string, name: string, role: string) => void;
}) {
  return (
    <div
      onClick={() => onSelect(person.id, person.full_name, role)}
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
        {getInitials(person.full_name)}
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
          {person.full_name}
        </p>
        {person.city && (
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
            {person.city}
          </p>
        )}
      </div>
    </div>
  );
}
