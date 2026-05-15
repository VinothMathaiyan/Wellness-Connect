import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  Video,
  MapPin,
  Phone,
  CheckCircle,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import MobileShell from '../../../components/MobileShell';
import { useWellness } from '../../../context/WellnessContext';
import {
  getTrainerClients,
  scheduleSession,
  type TrainerClient,
} from '../../../services/supabaseService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientOption {
  id: string;
  name: string;
  coachingType: string | null;
}

type SessionType = 'video' | 'in-person' | 'phone';

// ─── Constants ────────────────────────────────────────────────────────────────

const PROGRAM_END_DATE = new Date('2026-12-31');

const SESSION_TYPES: { type: SessionType; Icon: React.ElementType; label: string }[] = [
  { type: 'video',     Icon: Video,  label: 'Video'     },
  { type: 'in-person', Icon: MapPin, label: 'In-person' },
  { type: 'phone',     Icon: Phone,  label: 'Phone'     },
];

const DURATIONS = [
  { value: '30',  label: '30 minutes' },
  { value: '45',  label: '45 minutes' },
  { value: '60',  label: '60 minutes' },
  { value: '90',  label: '90 minutes' },
  { value: '120', label: '2 hours'    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildTrainerNote(
  sessionType: SessionType,
  meetingLink: string,
  locationNote: string,
  duration: string,
): string {
  const lines: string[] = [];
  if (sessionType === 'video')
    lines.push(meetingLink.trim() ? `Meeting link: ${meetingLink.trim()}` : 'Video session (no link provided)');
  if (sessionType === 'in-person')
    lines.push(locationNote.trim() ? `Location: ${locationNote.trim()}` : 'In-person session');
  if (sessionType === 'phone')
    lines.push('Phone session');
  lines.push(`Duration: ${duration} min`);
  return lines.join('\n');
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ScheduleSessionScreen() {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId?: string }>();
  const [searchParams] = useSearchParams();
  const { userId } = useWellness();

  const prefilledClientId = clientId || searchParams.get('clientId') || '';

  // ── Client list ─────────────────────────────────────────────────────────────
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);

  useEffect(() => {
    if (!userId) return;
    getTrainerClients(userId).then((raw: TrainerClient[]) => {
      setClients(
        raw.map(c => ({
          id: (c.profile as { id: string; full_name: string }).id,
          name: (c.profile as { id: string; full_name: string }).full_name,
          coachingType: c.type,
        })),
      );
      setIsLoadingClients(false);
    });
  }, [userId]);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [selectedClientId, setSelectedClientId] = useState(prefilledClientId);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [sessionType, setSessionType] = useState<SessionType>('video');
  const [locationNote, setLocationNote] = useState('');
  const [duration, setDuration] = useState('60');
  const [isRecurring, setIsRecurring] = useState(false);
  const [dateError, setDateError] = useState('');
  const [meetingLink, setMeetingLink] = useState('');

  // ── Submit state ────────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastIsAmber, setToastIsAmber] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const selectedClient = clients.find(c => c.id === selectedClientId);

  const calcSessionCount = (): number | null => {
    if (!selectedDate) return null;
    const diffMs = PROGRAM_END_DATE.getTime() - new Date(selectedDate).getTime();
    if (diffMs <= 0) return 0;
    return Math.max(0, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)));
  };

  const sessionCount = calcSessionCount();

  const getWeekday = (): string => {
    if (!selectedDate) return '';
    return new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long' });
  };

  const showToast = (message: string, isAmber = false) => {
    setToastMessage(message);
    setToastIsAmber(isAmber);
    setToastVisible(true);
    setTimeout(() => { setToastVisible(false); navigate(-1); }, 2500);
  };

  const handleSchedule = async () => {
    if (!selectedClientId || !selectedDate || isSubmitting) return;
    if (isRecurring && !selectedDate) {
      setDateError('Please select a date for recurring sessions');
      return;
    }
    if (!userId) {
      setSubmitError('Session expired — please log in again.');
      return;
    }

    setDateError('');
    setSubmitError(null);
    setIsSubmitting(true);

    const success = await scheduleSession(userId, selectedClientId, {
      scheduled_at: `${selectedDate}T${selectedTime}:00`,
      trainer_note: buildTrainerNote(sessionType, meetingLink, locationNote, duration),
    });

    setIsSubmitting(false);

    if (success) {
      if (sessionType === 'video' && !meetingLink.trim()) {
        showToast('Session scheduled. Add a meeting link before the session.', true);
      } else {
        const message = isRecurring && sessionCount !== null
          ? `Recurring sessions scheduled — ${sessionCount} sessions created`
          : 'Session scheduled successfully';
        showToast(message);
      }
    } else {
      setSubmitError('Failed to schedule session. Please try again.');
    }
  };

  const isDisabled = !selectedClientId || !selectedDate || isSubmitting;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <MobileShell className="bg-[#F2F8F7]">
      {/* Toast */}
      {toastVisible && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 text-white px-5 py-3 rounded-2xl shadow-lg text-[14px] font-semibold flex items-center gap-2 whitespace-nowrap"
          style={{ backgroundColor: toastIsAmber ? '#f59e0b' : '#16a34a', color: '#ffffff' }}
        >
          <CheckCircle size={16} />
          {toastMessage}
        </div>
      )}

      {/* 1. Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-5 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft size={22} className="text-gray-800" />
        </button>
        <div className="flex-1">
          <p className="text-[17px] font-bold text-gray-900">Schedule Session</p>
          <p className="text-[11px] text-gray-400 mt-0.5">All times in IST</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        <div className="px-4 pt-4 pb-6 space-y-3">

          {/* 2. Client Selector */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            {isLoadingClients ? (
              <div className="h-11 bg-gray-100 rounded-xl animate-pulse" />
            ) : (
              <select
                value={selectedClientId}
                onChange={e => setSelectedClientId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 p-3 text-[14px] text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="" disabled>Select a client...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            {selectedClient && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[13px] font-semibold text-gray-900">{selectedClient.name}</span>
                {selectedClient.coachingType && (
                  <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full">
                    {selectedClient.coachingType}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 3. Date & Time */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
            <div className="flex gap-3">
              <input
                type="date"
                value={selectedDate}
                min={today}
                onChange={e => { setSelectedDate(e.target.value); setDateError(''); }}
                className="flex-1 rounded-xl border border-gray-200 p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <input
                type="time"
                value={selectedTime}
                onChange={e => setSelectedTime(e.target.value)}
                className="flex-1 rounded-xl border border-gray-200 p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <p className="text-[12px] text-gray-400 mt-2">Time zone: IST (UTC+5:30)</p>
            <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold px-3 py-1 rounded-full">
              <span>ℹ</span>
              <span>Conflicts are checked on save</span>
            </div>
            {dateError && (
              <p className="text-[12px] text-red-500 font-medium mt-2">{dateError}</p>
            )}
          </div>

          {/* 4 & 5. Session Type + Conditional Detail */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Session Type</label>
            <div className="flex gap-2">
              {SESSION_TYPES.map(({ type, Icon, label }) => {
                const isSelected = sessionType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setSessionType(type)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold transition-colors ${
                      isSelected ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                    style={isSelected ? { backgroundColor: '#0d9488' } : {}}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="mt-3">
              {sessionType === 'video' && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-3">
                  <p className="text-[11px] text-teal-600">Paste your meeting link below</p>
                  <input
                    type="url"
                    value={meetingLink}
                    onChange={e => setMeetingLink(e.target.value)}
                    placeholder="https://meet.google.com/xxx-xxxx-xxx"
                    className="w-full rounded-xl border border-gray-200 p-3 mt-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="text-[11px] text-teal-600 mt-2 leading-relaxed">
                    Supports Google Meet, Zoom, or any video link. Shown to client in their session details.
                  </p>
                </div>
              )}
              {sessionType === 'in-person' && (
                <div>
                  <label className="block text-[12px] font-medium text-gray-600 mb-1">Location Note</label>
                  <input
                    type="text"
                    value={locationNote}
                    onChange={e => setLocationNote(e.target.value)}
                    placeholder="e.g. Studio 2, Ground Floor, Nungambakkam"
                    className="w-full rounded-xl border border-gray-200 p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Shown to client in session details</p>
                </div>
              )}
              {sessionType === 'phone' && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-start gap-2">
                  <Phone size={15} className="text-gray-500 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-gray-600 leading-relaxed">
                    No room will be created. Client will be called directly.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 6. Duration */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
            <select
              value={duration}
              onChange={e => setDuration(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 text-[14px] text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {DURATIONS.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          {/* 7. Recurring Toggle */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Recurring Session</p>
                <p className="text-[12px] text-gray-400 mt-0.5">
                  {isRecurring ? 'Repeats weekly at the same time' : 'Schedule as a one-time session'}
                </p>
              </div>
              <button
                onClick={() => setIsRecurring(v => !v)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                  isRecurring ? 'bg-teal-600' : 'bg-gray-300'
                }`}
                style={isRecurring ? { backgroundColor: '#0d9488' } : {}}
                aria-label="Toggle recurring session"
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${
                    isRecurring ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 8. Recurring Preview */}
          {isRecurring && (
            <div style={{ backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '12px', padding: '12px' }}>
              <p style={{ color: '#0f766e', fontWeight: '600', fontSize: '14px' }}>
                {selectedDate
                  ? `This will create ${sessionCount} sessions`
                  : 'Select a date to see session count'}
              </p>
              {selectedDate && (
                <p style={{ color: '#0f766e', fontSize: '13px', marginTop: '4px' }}>
                  Every {getWeekday()} at {selectedTime} until 31 Dec 2026
                </p>
              )}
            </div>
          )}

        </div>
      </div>

      {/* 9. Schedule Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30">
        <div style={{ padding: '0 16px 24px 16px' }}>
          {submitError && (
            <div className="mb-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 font-medium">{submitError}</p>
            </div>
          )}
          <button
            onClick={handleSchedule}
            disabled={isDisabled}
            className="w-full rounded-xl py-4 font-semibold text-white"
            style={{
              backgroundColor: '#0d9488',
              opacity: isDisabled ? 0.4 : 1,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Scheduling...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Calendar size={17} />
                Schedule Session
              </span>
            )}
          </button>
        </div>
      </div>
    </MobileShell>
  );
}
