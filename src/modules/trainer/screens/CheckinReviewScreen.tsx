import { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, MessageSquare, ChevronLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import MobileShell from '../../../components/MobileShell';
import { useWellness } from '../../../context/WellnessContext';
import { getClientCheckins } from '../../../services/supabaseService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readinessColor(score: number): string {
  if (score >= 70) return 'text-emerald-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-600';
}

function formatWeekOf(logDate: string): string {
  try {
    const d = new Date(logDate);
    return `Week of ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
  } catch {
    return 'Recent check-in';
  }
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function ScoreBar({ label, value, isRed }: { label: string; value: number; isRed: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className={`text-sm font-bold ${isRed ? 'text-red-500' : 'text-gray-700'}`}>
          {value}/10
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isRed ? 'bg-red-400' : 'bg-teal-400'}`}
          style={{ width: `${(value / 10) * 100}%`, backgroundColor: isRed ? '#ef4444' : '#0d9488' }}
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

  const [checkin, setCheckin] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [trainerResponse, setTrainerResponse] = useState('');
  const [isReviewed, setIsReviewed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    getClientCheckins(clientId, 1)
      .then(data => {
        if (data.length > 0) setCheckin(data[0]);
      })
      .catch(err => console.error('Checkin load:', err))
      .finally(() => setIsLoading(false));
  }, [clientId]);

  // Map DB row → display values, falling back to mock where DB has no column yet
  const raw = checkin ?? DEV_MOCK_CHECKIN;
  const displayData = {
    clientName:     DEV_MOCK_CHECKIN.clientName, // TODO: load from profiles join
    weekOf:         checkin?.log_date ? formatWeekOf(checkin.log_date) : DEV_MOCK_CHECKIN.weekOf,
    readinessScore: raw.readiness_score ?? DEV_MOCK_CHECKIN.readinessScore,
    readinessDelta: DEV_MOCK_CHECKIN.readinessDelta, // requires 2 records to compute
    mobility:       raw.mood_score ?? DEV_MOCK_CHECKIN.mobility,
    // TODO: add pain_score column to daily_metrics
    pain:           0,
    energy:         raw.energy_score ?? DEV_MOCK_CHECKIN.energy,
    clientNote:     DEV_MOCK_CHECKIN.clientNote, // TODO: add client_note to daily_metrics
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleMarkReviewed = () => {
    setIsReviewed(true);
    showToast('Check-in marked as reviewed');
    setTimeout(() => navigate(-1), 2000);
  };

  const painIsElevated = displayData.pain > 6;
  const deltaAbs       = Math.abs(displayData.readinessDelta);
  const deltaDown      = displayData.readinessDelta < 0;

  return (
    <MobileShell>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium pointer-events-none">
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
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-10 space-y-3">

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  style={{ backgroundColor: '#e5e7eb', borderRadius: '16px', height: '80px' }}
                />
              ))}
            </div>
          ) : (
            <>
              {/* ── Client & Week header ──────────────────────────────────────────── */}
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[18px] font-bold text-gray-900 leading-tight">
                      {displayData.clientName}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">{displayData.weekOf}</p>
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
                <span className={`text-[64px] font-bold leading-none ${readinessColor(displayData.readinessScore)}`}>
                  {displayData.readinessScore}
                </span>
                {displayData.readinessDelta !== 0 && (
                  <p
                    className={`text-sm font-semibold mt-3 ${deltaDown ? 'text-red-500' : 'text-emerald-600'}`}
                    style={{ color: deltaDown ? '#dc2626' : '#059669' }}
                  >
                    {deltaDown ? '↓' : '↑'} {deltaAbs} from last week
                  </p>
                )}
              </div>

              {/* ── Score Bars ────────────────────────────────────────────────────── */}
              <div className="bg-white rounded-2xl shadow-sm p-4 space-y-5">
                <ScoreBar label="Mobility" value={displayData.mobility} isRed={false} />

                <div>
                  <ScoreBar label="Pain" value={displayData.pain} isRed={painIsElevated} />
                  {painIsElevated && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <AlertTriangle size={12} className="text-red-500 flex-shrink-0" />
                      <p className="text-xs text-red-600 font-medium" style={{ color: '#dc2626' }}>
                        Elevated pain — review carefully
                      </p>
                    </div>
                  )}
                </div>

                <ScoreBar label="Energy" value={displayData.energy} isRed={false} />
              </div>

              {/* ── Client's Note ─────────────────────────────────────────────────── */}
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare size={14} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Client's Note</span>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 italic leading-relaxed">
                    "{displayData.clientNote}"
                  </p>
                </div>
              </div>

              {/* ── Trainer Response ──────────────────────────────────────────────── */}
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Your Response to Client
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  This will be visible to the client in their weekly report
                </p>
                <textarea
                  rows={4}
                  value={trainerResponse}
                  onChange={e => setTrainerResponse(e.target.value)}
                  placeholder="Write a response for the client to see in their weekly report..."
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <p className="text-xs text-gray-400 text-right mt-1.5">
                  {trainerResponse.length} characters
                </p>
              </div>

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
                    className="w-full bg-teal-600 text-white text-sm font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-opacity active:opacity-80"
                  >
                    <CheckCircle size={16} />
                    Mark as Reviewed
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </MobileShell>
  );
}

// DEV FALLBACK — remove after real client data exists
const DEV_MOCK_CHECKIN = {
  clientId:       '2',
  clientName:     'Sarah Chen',
  weekOf:         'Week of 7 Apr',
  isReviewed:     false,
  readinessScore: 34,
  readinessDelta: -8,
  mobility:       5,
  pain:           8,
  energy:         3,
  clientNote:
    "Knee feels tight after yesterday's session. Struggled with the lunges. Not sure if I should push through or rest tomorrow.",
};
