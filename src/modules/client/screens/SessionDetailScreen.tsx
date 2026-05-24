import { useNavigate, useParams } from 'react-router-dom';
import { useWellness } from '../../../context/WellnessContext';
import { getSessionDetail, getSessionExercises, getActiveWorkoutPlanId, markSessionComplete } from '../../../services/supabaseService';
import type { ClientSession } from '../../../types';
import type { SessionExercise } from '../../../types';
import { formatDate } from '@/utils/dateUtils';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  Video,
  CheckCircle2,
  MessageSquare,
  XCircle,
  Loader2,
} from 'lucide-react';
import MobileShell from '../../../components/MobileShell';



export default function SessionDetailScreen() {
  const { appState, userId } = useWellness();
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();

  // ── Local session state ────────────────────────────────────────────────────
  const [fetchedSession, setFetchedSession] = useState<ClientSession | null>(null);
  const [sessionLoading, setSessionLoading]  = useState(true);
  const [sessionNotFound, setSessionNotFound] = useState(false);

  // ── Exercise + completion state (Phase 4A) ─────────────────────────────────
  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [planId, setPlanId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState('');
  const [completedSuccess, setCompletedSuccess] = useState(false);

  // ── Fetch session detail ───────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) { setSessionLoading(false); return; }

    let cancelled = false;
    setSessionLoading(true);

    getSessionDetail(sessionId).then(result => {
      if (cancelled) return;
      if (!result) setSessionNotFound(true);
      else setFetchedSession(result);
    }).catch(() => {
      if (!cancelled) setSessionNotFound(true);
    }).finally(() => {
      if (!cancelled) setSessionLoading(false);
    });

    return () => { cancelled = true; };
  }, [sessionId]);

  // ── Fetch exercises + planId on mount ──────────────────────────────────────
  useEffect(() => {
    if (!userId) { setLoadingExercises(false); return; }

    let cancelled = false;

    Promise.all([
      getSessionExercises(userId),
      getActiveWorkoutPlanId(userId),
    ]).then(([exs, pid]) => {
      if (cancelled) return;
      setExercises(exs);
      setPlanId(pid);
    }).catch((err) => {
      console.error('SessionDetail: exercises fetch failed:', err);
    }).finally(() => {
      if (!cancelled) setLoadingExercises(false);
    });

    return () => { cancelled = true; };
  }, [userId]);

  const session: ClientSession | null = fetchedSession;

  const SESSION_TYPE_LABELS: Record<string, string> = {
    yoga: 'Yoga Session',
    strength: 'Strength Training',
    cardio: 'Cardio Session',
    recovery: 'Recovery Session',
    'in-person': 'In-Person Session',
    video: 'Video Session',
    phone: 'Phone Session',
  };
  const getSessionLabel = (t: string) => SESSION_TYPE_LABELS[t] ?? t;

  // Single initial only — first letter of full_name
  const getInitial = (name: string | null | undefined): string =>
    name?.charAt(0).toUpperCase() ?? '?';
  const userInitials = getInitial(appState.full_name);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [clientNote, setClientNote] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // ── Time-gate logic (Phase 4A) ─────────────────────────────────────────────
  const sessionPassed = session
    ? new Date(session.scheduled_at) <= new Date()
    : false;

  const isAlreadyCompleted =
    session?.status === 'completed' || completedSuccess;

  // ── Mark Complete handler (Phase 4A) ───────────────────────────────────────
  const handleMarkComplete = async () => {
    if (!session || !planId || !userId) return;
    if (completing) return;

    setCompleting(true);
    setCompleteError('');

    try {
      await markSessionComplete(
        session.id,
        userId,
        planId,
        clientNote
      );
      // Update local state to reflect completion immediately
      setCompletedSuccess(true);
      setFetchedSession(prev =>
        prev ? { ...prev, status: 'completed' } : prev
      );
    } catch {
      setCompleteError(
        'Could not mark session complete. Try again.'
      );
    } finally {
      setCompleting(false);
    }
  };

  // ── Loading / not-found guards ─────────────────────────────────────────────
  if (sessionLoading) {
    return (
      <MobileShell>
        <header className="bg-[#1D9E75] text-white px-6 py-5 flex items-center justify-between sticky top-0 z-50">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-[17px] font-bold tracking-tight">Session Detail</h1>
          <div className="w-9 h-9" />
        </header>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[14px] text-[#9CA3AF] font-medium">Loading session…</p>
        </div>
      </MobileShell>
    );
  }

  if (sessionNotFound || !session) {
    return (
      <MobileShell>
        <header className="bg-[#1D9E75] text-white px-6 py-5 flex items-center justify-between sticky top-0 z-50">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-[17px] font-bold tracking-tight">Session Detail</h1>
          <div className="w-9 h-9" />
        </header>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-[16px] font-semibold text-[#111827]">Session not found</p>
          <p className="text-[13px] text-[#6B7280]">This session may have been removed or the link is invalid.</p>
          <button onClick={() => navigate('/client/dashboard')} className="mt-4 px-6 py-2 rounded-full bg-[#1D9E75] text-white text-[13px] font-semibold">
            Back to Home
          </button>
        </div>
      </MobileShell>
    );
  }

  const startTime = new Date(session.scheduled_at);
  const endTime = new Date(startTime.getTime() + session.duration_minutes * 60 * 1000);
  const diffMinutes = (startTime.getTime() - currentTime.getTime()) / (1000 * 60);

  const isCancelled = session.status === 'cancelled';
  const isCompleted = session.status === 'completed';
  const isImminent = !isCompleted && !isCancelled && diffMinutes <= 10 && currentTime < endTime;

  const formatFullDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    return isToday ? `Today, ${formatTime(iso)}` : `${formatDate(iso)}, ${formatTime(iso)}`;
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const getTimingTag = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (d.toDateString() === today.toDateString()) return <span className="bg-[#DCFCE7] text-[#1D9E75] px-2 py-0.5 rounded-full text-[11px] font-bold">Today</span>;
    if (d.toDateString() === tomorrow.toDateString()) return <span className="bg-[#FEF3C7] text-[#EF9F27] px-2 py-0.5 rounded-full text-[11px] font-bold">Tomorrow</span>;
    return <span className="bg-gray-100 text-[#6B7280] px-2 py-0.5 rounded-full text-[11px] font-bold">{formatDate(d)}</span>;
  };

  return (
    <MobileShell>
      {/* Header */}
      <header className="bg-[#1D9E75] text-white px-6 py-5 flex items-center justify-between sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-[17px] font-bold tracking-tight">Session Detail</h1>
        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#1D9E75] font-bold text-[14px]">
          {userInitials}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-24">
        {/* Cancelled banner — shown above everything when session is cancelled */}
        {isCancelled && (
          <div style={{
            backgroundColor: '#FEE2E2',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <XCircle size={18} style={{ color: '#DC2626', flexShrink: 0 }} />
            <span style={{ color: '#DC2626', fontWeight: 500, fontSize: 14 }}>
              This session has been cancelled
            </span>
          </div>
        )}

        {/* SECTION 1 — Session Overview card */}
        <section className="bg-white rounded-[12px] p-4 border border-[#E5E7EB] space-y-4 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-[18px] font-semibold text-[#111827]">{getSessionLabel(session.session_type)}</h2>
            <p className="text-[13px] text-[#6B7280]">
              With {session.trainer_name} · {formatFullDate(session.scheduled_at)} · {session.duration_minutes} min
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-[#E6F1FB] text-[#185FA5] px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1">
              <Video size={10} /> Virtual
            </span>
            {getTimingTag(session.scheduled_at)}
          </div>

          <div className="w-full">
            {isCancelled ? (
              <div
                className="px-3 py-2 rounded-full text-[12px] font-bold flex items-center justify-center"
                style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
              >
                Cancelled
              </div>
            ) : isCompleted ? (
              <div className="bg-gray-100 text-[#6B7280] px-3 py-2 rounded-full text-[12px] font-bold flex items-center justify-center">
                Completed · {formatDate(session.scheduled_at)} {formatTime(session.scheduled_at)}
              </div>
            ) : isImminent ? (
              <div className="bg-[#E1F5EE] text-[#1D9E75] px-3 py-2 rounded-full text-[12px] font-bold flex items-center justify-center gap-2">
                <motion.div 
                  animate={{ opacity: [1, 0.4, 1] }} 
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-[#1D9E75]" 
                />
                Live now — join immediately
              </div>
            ) : (
              <div className="bg-[#FEF3C7] text-[#EF9F27] px-3 py-2 rounded-full text-[12px] font-bold flex items-center justify-center">
                Upcoming · Starts in {Math.round(diffMinutes / 60)} hours
              </div>
            )}
          </div>
        </section>

        {/* SECTION 2 — Trainer's Note (conditional) */}
        {session.trainer_note && (
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={18} className="text-emerald-700" />
              <h3 className="font-semibold text-emerald-800 text-sm">Trainer Note</h3>
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">{session.trainer_note}</p>
          </div>
        )}

        {/* SECTION 3 — Today's Plan (hidden for cancelled sessions) */}
        {!isCancelled && <section className="space-y-3">
          <h3 className="text-[11px] uppercase text-[#6B7280] font-bold tracking-[0.07em]">Today's Plan</h3>
          <div className="mt-4 space-y-3 max-h-[400px] overflow-y-auto scrollbar-hide pb-4">
            {/* Exercise list — Phase 4A */}
            {loadingExercises ? (
              // Skeleton — 3 placeholder rows
              <div>
                {[1,2,3].map(i => (
                  <div key={i} style={{
                    height: 48,
                    backgroundColor: '#F3F4F6',
                    borderRadius: 8,
                    marginBottom: 8,
                  }} />
                ))}
              </div>
            ) : exercises.length === 0 ? (
              // Empty state
              <div style={{
                textAlign: 'center',
                padding: '24px 16px',
                color: '#6B7280',
              }}>
                <p style={{ fontSize: 14 }}>
                  No exercises assigned yet
                </p>
                <p style={{ fontSize: 12, marginTop: 4 }}>
                  Your trainer will add exercises to your program
                </p>
              </div>
            ) : (
              // Exercise list
              exercises.map((ex, index) => (
                <div key={ex.id} style={{
                  padding: '12px 16px',
                  backgroundColor: '#F9FAFB',
                  borderRadius: 12,
                  marginBottom: 8,
                  border: '1px solid #E5E7EB',
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: '#111827',
                    }}>
                      {index + 1}. {ex.name}
                    </span>
                    <span style={{
                      fontSize: 12,
                      color: '#6B7280',
                      backgroundColor: '#F3F4F6',
                      padding: '2px 8px',
                      borderRadius: 999,
                    }}>
                      {ex.sets} × {ex.reps}
                    </span>
                  </div>
                  {ex.instructions && (
                    <p style={{
                      fontSize: 12,
                      color: '#6B7280',
                      marginTop: 4,
                    }}>
                      {ex.instructions}
                    </p>
                  )}
                  {ex.rest_seconds && (
                    <p style={{
                      fontSize: 11,
                      color: '#9CA3AF',
                      marginTop: 2,
                    }}>
                      Rest: {ex.rest_seconds}s
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Client notes textarea */}
          <div className="mt-2 px-1 mb-4">
            <textarea
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm resize-none focus:ring-1 focus:ring-emerald-500 outline-none"
              rows={4}
              placeholder="Add notes or feedback for your trainer..."
              value={clientNote}
              onChange={(e) => setClientNote(e.target.value)}
            />
          </div>

          {/* Mark Complete button — Phase 4A */}
          {isAlreadyCompleted ? (
            // Already done state
            <div style={{
              padding: '16px',
              backgroundColor: '#F0FDF4',
              borderRadius: 12,
              textAlign: 'center',
              color: '#166534',
              fontWeight: 500,
            }}>
              ✓ Session completed
            </div>
          ) : !sessionPassed ? (
            // Future session — button disabled
            <button
              disabled
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: '#F3F4F6',
                color: '#9CA3AF',
                borderRadius: 12,
                border: 'none',
                fontSize: 15,
                cursor: 'not-allowed',
              }}
            >
              Available after session time
            </button>
          ) : !planId ? (
            // No active program
            <button
              disabled
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: '#F3F4F6',
                color: '#9CA3AF',
                borderRadius: 12,
                border: 'none',
                fontSize: 15,
              }}
            >
              No active program assigned
            </button>
          ) : (
            // Active + past + can complete
            <>
              {completeError && (
                <p style={{
                  color: '#DC2626',
                  fontSize: 13,
                  marginBottom: 8,
                  textAlign: 'center',
                }}>
                  {completeError}
                </p>
              )}
              <button
                onClick={handleMarkComplete}
                disabled={completing}
                style={{
                  width: '100%',
                  padding: '16px',
                  backgroundColor: completing
                    ? '#9CA3AF' : '#166534',
                  color: '#ffffff',
                  borderRadius: 12,
                  border: 'none',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: completing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {completing ? (
                  <>
                    <Loader2 size={16}
                      style={{ animation: 'spin 1s linear infinite' }} />
                    Saving...
                  </>
                ) : (
                  'Mark Session Complete'
                )}
              </button>
            </>
          )}
        </section>}

        {/* SECTION 4 — Join Button (hidden for cancelled sessions) */}
        {!isCancelled && <section className="space-y-4 pt-4">
          {isCompleted ? (
            <div className="space-y-4">
              <div className="bg-[#E1F5EE] text-[#0F6E56] p-3 rounded-[12px] flex items-center justify-center gap-2 text-[12px] font-bold">
                <CheckCircle2 size={16} /> Great work! Session logged.
              </div>
              <div className="bg-gray-100 text-[#9CA3AF] p-4 rounded-[12px] text-center text-[14px] font-bold">
                Session completed · {formatDate(session.scheduled_at)}, {formatTime(session.scheduled_at)}
              </div>
            </div>
          ) : session.meeting_url ? (
            /* meeting_url present — show join button regardless of session type */
            isImminent ? (
              <div className="space-y-2">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  animate={{ boxShadow: ["0 0 0px rgba(29, 158, 117, 0.4)", "0 0 15px rgba(29, 158, 117, 0.4)", "0 0 0px rgba(29, 158, 117, 0.4)"] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  onClick={() => window.open(session.meeting_url!, '_blank')}
                  className="w-full h-12 rounded-[12px] bg-[#1D9E75] text-white flex items-center justify-center gap-2 font-bold cursor-pointer"
                >
                  <Video size={20} /> Join Video Session — Live now
                </motion.button>
                <p className="text-[11px] text-[#1D9E75] text-center font-medium">Session is active · Tap to join now</p>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => window.open(session.meeting_url!, '_blank')}
                  className="w-full h-12 rounded-[12px] border-2 border-[#1D9E75] text-[#1D9E75] bg-white flex items-center justify-center gap-2 font-bold cursor-pointer active:bg-gray-50 transition-colors"
                >
                  <Video size={20} /> Join Video Session
                </button>
                <p className="text-[11px] text-[#9CA3AF] text-center">Link will be active 10 minutes before the session.</p>
              </div>
            )
          ) : session.session_type === 'video' ? (
            /* video session but no meeting_url yet — show muted placeholder */
            <div className="space-y-2">
              <button disabled className="w-full h-12 rounded-[12px] border-2 border-gray-200 text-gray-400 bg-gray-50 flex items-center justify-center gap-2 font-bold opacity-40">
                <Video size={20} /> Meet link not yet set
              </button>
              <p className="text-[11px] text-[#9CA3AF] text-center">Your trainer will add the link before the session.</p>
            </div>
          ) : (
            /* phone or in-person — hide meeting link section entirely */
            null
          )}
        </section>}
      </div>
    </MobileShell>
  );
}
