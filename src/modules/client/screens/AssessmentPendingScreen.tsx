import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, ClipboardList, RefreshCw, Loader2, PartyPopper } from 'lucide-react';
import { useWellness } from '../../../context/WellnessContext';
import { supabase } from '../../../lib/supabaseClient';
import MobileShell from '../../../components/MobileShell';

/**
 * AssessmentPendingScreen — the only screen a not-yet-cleared client can see.
 *
 * Polls clearance every 30s (and on demand via "Check status"). When the
 * assessment team clears the client, isClientCleared flips to true, we show a
 * brief success state and route to the client home.
 */
export default function AssessmentPendingScreen() {
  const navigate = useNavigate();
  const { userId, isClientCleared, recheckClearance, logout } = useWellness();

  const [hasProfile, setHasProfile]   = useState<boolean | null>(null);
  const [isChecking, setIsChecking]   = useState(false);
  const [checkedOnce, setCheckedOnce] = useState(false);
  const [unlocking, setUnlocking]     = useState(false);

  // Tracks whether we ever observed a "not cleared" state. If so, becoming
  // cleared means the client was genuinely waiting → play the success animation.
  // If we never saw it (already-cleared client landed here), skip straight in.
  const wasWaitingRef = useRef(false);

  // Has the client filled in their health profile yet? Drives the amber prompt.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('client_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setHasProfile(!!data); });
    return () => { cancelled = true; };
  }, [userId]);

  // Poll clearance every 30s while the client waits.
  useEffect(() => {
    const interval = setInterval(() => { void recheckClearance(); }, 30000);
    return () => clearInterval(interval);
  }, [recheckClearance]);

  // Auto-unlock. A client cleared *while waiting* sees a brief success state;
  // an already-cleared client who merely landed here goes straight in.
  useEffect(() => {
    if (isClientCleared === false) {
      wasWaitingRef.current = true;
      return;
    }
    if (isClientCleared === true) {
      if (!wasWaitingRef.current) {
        navigate('/client/dashboard', { replace: true });
        return;
      }
      setUnlocking(true);
      const timeout = setTimeout(() => navigate('/client/dashboard', { replace: true }), 2000);
      return () => clearTimeout(timeout);
    }
  }, [isClientCleared, navigate]);

  const handleCheckStatus = async () => {
    if (isChecking) return;
    setIsChecking(true);
    await recheckClearance();
    setIsChecking(false);
    setCheckedOnce(true);
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/signup', { replace: true });
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
        <h1 className="text-xl font-bold text-gray-900">You're cleared! 🎉</h1>
        <p className="text-sm text-gray-500 mt-2">Welcome to WellnessConnect. Taking you in…</p>
      </div>
    );
  }

  return (
    <MobileShell>
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
              style={{ backgroundColor: '#E1F5EE' }}
            >
              🏥
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-bold text-gray-900 text-center leading-tight">
            Your account is under review
          </h2>
          <p className="text-sm text-gray-500 text-center mt-3 leading-relaxed">
            Our assessment team will contact you shortly to complete your health
            evaluation. This usually takes 1–2 business days.
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
                'Assessment team reviews your health profile',
                'They may contact you for a quick call',
                "Once cleared, you'll get full access to WellnessConnect",
              ].map(text => (
                <li key={text} className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" style={{ color: '#1D9E75' }} />
                  <span className="text-[13px] leading-snug" style={{ color: '#0F6E56' }}>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Complete-profile prompt (only when no health profile yet) */}
          {hasProfile === false && (
            <div
              className="rounded-2xl p-4 mt-4"
              style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}
            >
              <div className="flex items-start gap-2.5">
                <ClipboardList size={18} className="shrink-0 mt-0.5" style={{ color: '#D97706' }} />
                <div className="flex-1">
                  <p className="text-[13px] font-semibold" style={{ color: '#B45309' }}>
                    Complete your health profile to speed up your assessment
                  </p>
                  <button
                    onClick={() => navigate('/onboarding/profile')}
                    className="mt-3 w-full py-2.5 rounded-xl text-sm font-bold text-white active:scale-[0.98] transition-transform"
                    style={{ backgroundColor: '#D97706' }}
                  >
                    Complete Profile
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Still-pending note after a manual check */}
          {checkedOnce && isClientCleared === false && (
            <p className="text-center text-[13px] font-medium mt-5" style={{ color: '#6B7280' }}>
              Still under review. We'll notify you as soon as you're cleared.
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
    </MobileShell>
  );
}
