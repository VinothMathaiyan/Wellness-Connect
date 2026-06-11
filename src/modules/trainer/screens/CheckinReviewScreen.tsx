import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ClipboardList,
  Loader2,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import MobileShell from '../../../components/MobileShell';
import TrainerBottomNav from '../components/TrainerBottomNav';
import { useWellness } from '../../../context/WellnessContext';
import {
  getCheckinReview,
  addTrainerFeedback,
} from '../../../services/supabaseService';
import type { CheckinReviewData } from '../../../types';
import { formatDate } from '@/utils/dateUtils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readinessColor(score: number): string {
  if (score >= 70) return 'text-emerald-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-600';
}

function formatWeekOf(logDate: string): string {
  const formatted = formatDate(logDate);
  return formatted === '—' ? 'Recent check-in' : `Week of ${formatted}`;
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function ScoreBar({
  label,
  value,
  isRed,
}: {
  label: string;
  value: number | null;
  isRed: boolean;
}) {
  const fillColor = isRed ? '#ef4444' : '#0d9488';
  const widthPct = value !== null ? (value / 10) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span
          className="text-sm font-bold"
          style={{ color: isRed ? '#ef4444' : '#374151' }}
        >
          {value !== null ? `${value}/10` : '--'}
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${widthPct}%`, backgroundColor: fillColor }}
        />
      </div>
    </div>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CheckinReviewScreen() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { userId } = useWellness();

  const [data, setData] = useState<CheckinReviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [trainerResponse, setTrainerResponse] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isReviewed, setIsReviewed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clientId || !userId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await getCheckinReview(clientId, userId);
      setData(result);
    } catch {
      setLoadError('Could not load check-in data.');
    } finally {
      setIsLoading(false);
    }
  }, [clientId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleMarkReviewed = async () => {
    if (!clientId || !userId) return;
    if (!data?.logDate) {
      // Nothing to mark — guard against the empty-state case
      return;
    }
    setSavingReview(true);
    setSaveError(null);
    try {
      // No `reviewed` column exists on daily_metrics yet — use the
      // trainer_feedback table as the persistent review marker.
      // (Trainer's text response is also stored here.)
      await addTrainerFeedback(
        userId,
        clientId,
        data.logDate,
        trainerResponse.trim(),
      );
      setIsReviewed(true);
      showToast('Check-in marked as reviewed');
      setTimeout(() => navigate(-1), 1500);
    } catch {
      setSaveError('Could not save. Try again.');
    } finally {
      setSavingReview(false);
    }
  };

  // ─── Derived values ─────────────────────────────────────────────────────────
  const clientName    = data?.clientName ?? 'Unknown Client';
  const readinessScore = data?.readinessScore ?? null;
  const readinessDelta = data?.readinessDelta ?? null;
  const mobilityScore = data?.mobilityScore ?? null;
  const painScore     = data?.painScore ?? null;
  const energyScore   = data?.energyScore ?? null;
  const painIsElevated = painScore !== null && painScore > 6;
  const hasCheckin = data?.logDate != null;

  return (
    <MobileShell>
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium pointer-events-none"
          style={{ backgroundColor: '#16a34a' }}
        >
          <CheckCircle size={15} />
          {toast}
        </div>
      )}

      <div className="flex flex-col min-h-full bg-gray-50">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="bg-white px-4 pt-6 pb-4 flex items-start gap-3 shadow-sm">
          <button
            onClick={() => navigate(-1)}
            className="mt-0.5 p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Check-in Review</h1>
          </div>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-3 lg:max-w-3xl lg:mx-auto lg:w-full">

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  style={{ backgroundColor: '#e5e7eb', borderRadius: '16px', height: '80px' }}
                />
              ))}
            </div>
          ) : loadError ? (
            <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
              <AlertTriangle size={28} style={{ color: '#dc2626', margin: '0 auto 8px' }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: 0 }}>
                {loadError}
              </p>
              <button
                onClick={load}
                className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-teal-600 bg-teal-50 border border-teal-100 px-4 py-2 rounded-xl active:bg-teal-100 transition-colors"
              >
                Try again
              </button>
            </div>
          ) : !hasCheckin ? (
            /* No check-in exists yet — explicit empty state */
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <ClipboardList size={32} style={{ color: '#9CA3AF', margin: '0 auto 10px' }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: '#374151', margin: 0 }}>
                No check-in submitted yet
              </p>
              <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
                Client hasn&apos;t submitted a check-in
              </p>
            </div>
          ) : (
            <>
              {/* ── Client & Week header ──────────────────────────────────────────── */}
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[18px] font-bold text-gray-900 leading-tight">
                      {clientName}
                    </h2>
                    {data?.logDate && (
                      <p className="text-sm text-gray-500 mt-0.5">{formatWeekOf(data.logDate)}</p>
                    )}
                  </div>
                  {isReviewed ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex-shrink-0">
                      <CheckCircle size={11} />
                      Reviewed
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-orange-600 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-full flex-shrink-0">
                      Unreviewed
                    </span>
                  )}
                </div>
              </div>

              {/* ── Readiness Score ───────────────────────────────────────────────── */}
              <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Readiness Score
                </p>
                <span
                  className={`text-[64px] font-bold leading-none ${readinessScore !== null ? readinessColor(readinessScore) : 'text-text-secondary'}`}
                >
                  {readinessScore !== null ? readinessScore : '--'}
                </span>
                {readinessDelta !== null && (
                  readinessDelta === 0 ? (
                    <p className="text-sm font-semibold mt-3" style={{ color: '#6B7280' }}>
                      No change from last check-in
                    </p>
                  ) : (
                    <p
                      className="text-sm font-semibold mt-3"
                      style={{ color: readinessDelta < 0 ? '#dc2626' : '#059669' }}
                    >
                      {readinessDelta < 0 ? '↓' : '↑'} {Math.abs(readinessDelta)} from last check-in
                    </p>
                  )
                )}
              </div>

              {/* ── Score Bars ────────────────────────────────────────────────────── */}
              <div className="bg-white rounded-2xl shadow-sm p-4 space-y-5">
                <ScoreBar label="Mobility" value={mobilityScore} isRed={false} />

                <div>
                  <ScoreBar label="Pain" value={painScore} isRed={painIsElevated} />
                  {painIsElevated && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <AlertTriangle size={12} className="flex-shrink-0" style={{ color: '#ef4444' }} />
                      <p className="text-xs font-medium" style={{ color: '#dc2626' }}>
                        Elevated pain — review carefully
                      </p>
                    </div>
                  )}
                </div>

                <ScoreBar label="Energy" value={energyScore} isRed={false} />
              </div>

              {/* ── Client's Note ──────────────────────────────────────────────── */}
              {data?.noteForTrainer && (
                <div className="bg-white rounded-2xl shadow-sm p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Client&apos;s Note
                  </p>
                  <p
                    className="text-sm text-gray-700 leading-relaxed"
                    style={{ fontStyle: 'italic' }}
                  >
                    &ldquo;{data.noteForTrainer}&rdquo;
                  </p>
                </div>
              )}

              {/* ── Trainer Response ──────────────────────────────────────────────── */}
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Your Response to Client
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  Saved to trainer_feedback when you mark this check-in as reviewed
                </p>
                <textarea
                  rows={4}
                  value={trainerResponse}
                  onChange={e => setTrainerResponse(e.target.value)}
                  placeholder="Write a response for the client to see in their weekly report..."
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                  disabled={savingReview || isReviewed}
                />
                <p className="text-xs text-gray-400 text-right mt-1.5">
                  {trainerResponse.length} characters
                </p>
              </div>

              {/* ── Save error ────────────────────────────────────────────────────── */}
              {saveError && (
                <p className="text-xs font-medium" style={{ color: '#dc2626' }}>
                  {saveError}
                </p>
              )}

              {/* ── Mark as Reviewed ──────────────────────────────────────────────── */}
              <div className="pt-1">
                {isReviewed ? (
                  <div className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-200">
                    <CheckCircle size={16} className="text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-700">Already Reviewed</span>
                  </div>
                ) : (
                  <button
                    onClick={handleMarkReviewed}
                    disabled={savingReview}
                    className="w-full text-white text-sm font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-opacity active:opacity-80"
                    style={{
                      backgroundColor: '#0d9488',
                      opacity: savingReview ? 0.6 : 1,
                      cursor: savingReview ? 'default' : 'pointer',
                    }}
                  >
                    {savingReview ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        Mark as Reviewed
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <TrainerBottomNav />
    </MobileShell>
  );
}
