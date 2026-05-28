import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, RefreshCw, Loader2, PartyPopper, AlertTriangle } from 'lucide-react';
import { useWellness } from '../../../context/WellnessContext';
import {
  getTrainerApprovalStatus,
  getAssessorId,
  sendAssessmentMessage,
} from '../../../services/supabaseService';

/**
 * TrainerPendingScreen — the only screen a not-yet-approved trainer can see.
 * Mirrors the client AssessmentPendingScreen gate.
 *
 * Polls the trainer's trainer_approvals row every 30s (and on demand). When the
 * assessment team approves, we show a brief success state and route to the
 * trainer dashboard. A rejected trainer sees the reviewer notes and can resubmit.
 */
export default function TrainerPendingScreen() {
  const navigate = useNavigate();
  const {
    userId,
    logout,
    trainerApprovalStatus,
    isTrainerApprovalLoading,
    recheckTrainerApproval,
  } = useWellness();

  // Local reviewNotes (not carried by context) — fetched when status is rejected.
  const [reviewNotes, setReviewNotes] = useState<string | null>(null);
  const [isChecking, setIsChecking]   = useState(false);
  const [checkedOnce, setCheckedOnce] = useState(false);
  const [unlocking, setUnlocking]     = useState(false);

  // Tracks whether we ever observed a non-approved state. If so, becoming
  // approved means the trainer was genuinely waiting → play the success state.
  const wasWaitingRef = useRef(false);

  // Pull review notes for the rejected display (context only carries status).
  useEffect(() => {
    if (!userId || trainerApprovalStatus !== 'rejected') return;
    let cancelled = false;
    getTrainerApprovalStatus(userId).then(({ reviewNotes: notes }) => {
      if (!cancelled) setReviewNotes(notes);
    });
    return () => { cancelled = true; };
  }, [userId, trainerApprovalStatus]);

  // Poll every 30s while the trainer waits. Goes through the context so the
  // route guard sees the same status and won't bounce on auto-unlock.
  useEffect(() => {
    const interval = setInterval(() => { void recheckTrainerApproval(); }, 30000);
    return () => clearInterval(interval);
  }, [recheckTrainerApproval]);

  // Auto-unlock. A trainer approved *while waiting* sees a brief success state;
  // an already-approved trainer who merely landed here goes straight in.
  useEffect(() => {
    if (isTrainerApprovalLoading) return;
    if (trainerApprovalStatus !== 'approved') {
      wasWaitingRef.current = true;
      return;
    }
    if (!wasWaitingRef.current) {
      navigate('/trainer/dashboard', { replace: true });
      return;
    }
    setUnlocking(true);
    const timeout = setTimeout(() => navigate('/trainer/dashboard', { replace: true }), 2000);
    return () => clearTimeout(timeout);
  }, [trainerApprovalStatus, isTrainerApprovalLoading, navigate]);

  // ── Assessment team contact ─────────────────────────────────────────────────
  const [contactMessage, setContactMessage] = useState('');
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [sendError, setSendError] = useState<string | null>(null);

  const handleCheckStatus = async () => {
    if (isChecking) return;
    setIsChecking(true);
    await recheckTrainerApproval();
    setIsChecking(false);
    setCheckedOnce(true);
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/signup', { replace: true });
  };

  const handleResubmit = () => {
    navigate('/trainer/onboarding', { state: { mode: 'edit', resubmit: true } });
  };

  const handleSendToAssessmentTeam = async () => {
    if (!userId || sendStatus === 'sending' || sendStatus === 'sent') return;
    if (!contactMessage.trim()) {
      setSendError('Please enter a message.');
      return;
    }

    setSendStatus('sending');
    setSendError(null);

    try {
      const assessorId = await getAssessorId();
      if (!assessorId) throw new Error('Assessment team unavailable. Please try again later.');

      const res = await sendAssessmentMessage(userId, assessorId, contactMessage.trim());
      if (!res.success) throw new Error(res.error ?? 'Failed to send message.');

      setSendStatus('sent');
      setContactMessage('');
    } catch (err: unknown) {
      setSendStatus('error');
      setSendError(err instanceof Error ? err.message : 'Failed to contact assessment team.');
    }
  };

  // ── Success / unlocking state ───────────────────────────────────────────────
  if (unlocking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F2F8F7] px-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
          style={{ backgroundColor: '#dcfce7' }}
        >
          <PartyPopper size={40} style={{ color: '#16a34a' }} />
        </motion.div>
        <h1 className="text-xl font-bold text-gray-900">You're approved! 🎉</h1>
        <p className="text-sm text-gray-500 mt-2">Welcome to WellnessConnect. Taking you in…</p>
      </div>
    );
  }

  const isRejected = !isTrainerApprovalLoading && trainerApprovalStatus === 'rejected';

  return (
    <div className="min-h-screen flex flex-col bg-[#F2F8F7]">
      {/* Header */}
      <header className="px-5 py-5 text-center">
        <h1 className="text-primary font-bold text-xl tracking-tight" style={{ color: '#1D9E75' }}>
          WellnessConnect
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-10">
        <div className="max-w-md mx-auto">

          {/* Illustration */}
          <div className="flex justify-center mt-6 mb-6">
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center text-5xl"
              style={{ backgroundColor: isRejected ? '#FEE2E2' : '#E1F5EE' }}
            >
              {isRejected ? '📝' : '🔍'}
            </div>
          </div>

          {/* Rejected state */}
          {isRejected ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900 text-center leading-tight">
                Your application needs changes
              </h2>
              <p className="text-sm text-gray-500 text-center mt-3 leading-relaxed">
                Our assessment team reviewed your profile and asked for some
                updates before we can activate your account.
              </p>

              {/* Reviewer notes — shown prominently */}
              <div
                className="rounded-2xl p-4 mt-6"
                style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: '#D97706' }} />
                  <div className="flex-1">
                    <p className="text-[13px] font-bold mb-1" style={{ color: '#B45309' }}>
                      Reviewer notes
                    </p>
                    <p className="text-[13px] leading-snug" style={{ color: '#92400E' }}>
                      {reviewNotes?.trim()
                        ? reviewNotes
                        : 'No specific notes were provided. Please review your profile details and resubmit.'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleResubmit}
                className="mt-6 w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                style={{ backgroundColor: '#1D9E75', color: '#ffffff' }}
              >
                Update profile and resubmit
              </button>
            </>
          ) : (
            <>
              {/* Pending state */}
              <h2 className="text-2xl font-bold text-gray-900 text-center leading-tight">
                Your application is under review
              </h2>
              <p className="text-sm text-gray-500 text-center mt-3 leading-relaxed">
                Our assessment team is reviewing your trainer profile. We'll
                notify you within 24 hours.
              </p>

              {/* What happens next */}
              <div
                className="rounded-2xl p-4 mt-6"
                style={{ backgroundColor: '#E1F5EE', border: '1px solid #B6E3D4' }}
              >
                <p className="text-sm font-bold mb-3" style={{ color: '#0F6E56' }}>
                  What happens next?
                </p>
                <ul className="space-y-2.5">
                  {[
                    'Assessment team reviews your certifications and profile',
                    'They may reach out if anything needs clarifying',
                    "Once approved, you'll get full access to your dashboard",
                  ].map(text => (
                    <li key={text} className="flex items-start gap-2.5">
                      <CheckCircle2 size={16} className="shrink-0 mt-0.5" style={{ color: '#1D9E75' }} />
                      <span className="text-[13px] leading-snug" style={{ color: '#0F6E56' }}>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Still-pending note after a manual check */}
              {checkedOnce && trainerApprovalStatus === 'pending' && (
                <p className="text-center text-[13px] font-medium mt-5" style={{ color: '#6B7280' }}>
                  Still under review. We'll notify you as soon as you're approved.
                </p>
              )}

              {/* Check status */}
              <button
                onClick={handleCheckStatus}
                disabled={isChecking}
                className="mt-6 w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                style={{ backgroundColor: '#1D9E75', color: '#ffffff', opacity: isChecking ? 0.7 : 1 }}
              >
                {isChecking ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                {isChecking ? 'Checking…' : 'Check status'}
              </button>
            </>
          )}

          {/* ── Contact Assessment Team ─────────────────────────────────────── */}
          <section className="mt-6 mb-2">
            <div
              className="rounded-2xl p-4 space-y-3"
              style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}
            >
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#166534' }}>
                Contact Assessment Team
              </p>
              <textarea
                rows={3}
                value={contactMessage}
                onChange={e => setContactMessage(e.target.value)}
                placeholder="Have a question about your application?"
                disabled={sendStatus === 'sent'}
                className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              <button
                onClick={handleSendToAssessmentTeam}
                disabled={sendStatus === 'sending' || sendStatus === 'sent'}
                className="w-full text-sm font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-opacity"
                style={{
                  backgroundColor: sendStatus === 'sent' ? '#9ca3af' : '#0d9488',
                  color: '#ffffff',
                  opacity: sendStatus === 'sending' ? 0.7 : 1,
                  cursor: sendStatus === 'sent' ? 'default' : 'pointer',
                }}
              >
                {sendStatus === 'sending' && (
                  <span
                    className="w-4 h-4 rounded-full border-2 animate-spin"
                    style={{ borderColor: '#ffffff', borderTopColor: 'transparent' }}
                  />
                )}
                {sendStatus === 'sending' ? 'Sending...' : 'Send to Assessment Team →'}
              </button>
              {sendStatus === 'error' && sendError && (
                <p className="text-xs font-medium text-center" style={{ color: '#dc2626' }}>
                  {sendError}
                </p>
              )}
              {sendStatus === 'sent' && (
                <p className="text-xs font-medium text-center" style={{ color: '#0d9488' }}>
                  Your message has been sent. The assessment team will follow up with you. ✓
                </p>
              )}
            </div>
          </section>

          {/* Sign out */}
          <div className="text-center mt-6">
            <button
              onClick={handleSignOut}
              className="text-[13px] font-medium"
              style={{ color: '#9CA3AF' }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
