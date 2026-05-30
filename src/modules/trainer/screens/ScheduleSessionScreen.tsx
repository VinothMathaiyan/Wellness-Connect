import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  Video,
  MapPin,
  Phone,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import MobileShell from '../../../components/MobileShell';
import TrainerBottomNav from '../components/TrainerBottomNav';
import { useWellness } from '../../../context/WellnessContext';
import {
  getTrainerClients,
  scheduleSession,
  type TrainerClient,
  type ScheduleSessionOptions,
} from '../../../services/supabaseService';
import { supabase } from '../../../lib/supabaseClient';
import ScreenHeader from '@/components/ScreenHeader';
import ProfileMenu from '../../../components/ProfileMenu';
import { formatDate } from '@/utils/dateUtils';
import { todayISO } from '@/utils/date';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientOption {
  id: string;
  name: string;
  coachingType: string | null;
}

type SessionType = 'video' | 'in-person' | 'phone';
type RecurringFrequency = 'daily' | 'weekly' | 'twice-a-week';

// ─── Constants ────────────────────────────────────────────────────────────────

const FREQUENCIES: { value: RecurringFrequency; label: string; dbValue: string }[] = [
  { value: 'daily',        label: 'Daily',        dbValue: 'daily'        },
  { value: 'weekly',       label: 'Weekly',       dbValue: 'weekly'       },
  { value: 'twice-a-week', label: 'Twice a week', dbValue: 'twice_a_week' },
];

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

// Shared style for the native date/time inputs — strips browser chrome so they
// match the rest of the form's text inputs across Chrome/Safari/Firefox.
const DATE_TIME_INPUT_STYLE: React.CSSProperties = {
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  appearance: 'none',
  colorScheme: 'light',
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  fontSize: '14px',
  color: 'inherit',
  backgroundColor: 'white',
  fontFamily: 'inherit',
  cursor: 'pointer',
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ScheduleSessionScreen() {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId?: string }>();
  const [searchParams] = useSearchParams();
  const { userId } = useWellness();

  const prefilledClientId = clientId || searchParams.get('clientId') || '';

  // ── Pre-filled client name — fetched directly from profiles ─────────────────
  const [prefilledClientName, setPrefilledClientName] = useState('');

  useEffect(() => {
    if (!prefilledClientId) return;
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', prefilledClientId)
      .single()
      .then(({ data }) => {
        if (data?.full_name) setPrefilledClientName(data.full_name);
      });
  }, [prefilledClientId]);

  // ── Client list (only needed when no prefilledClientId) ─────────────────────
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(!prefilledClientId);

  useEffect(() => {
    if (!userId || prefilledClientId) return;
    getTrainerClients(userId).then((raw: TrainerClient[]) => {
      setClients(
        raw.map((c: TrainerClient) => ({
          id: c.id,
          name: c.full_name,
          coachingType: null,
        })),
      );
      setIsLoadingClients(false);
    });
  }, [userId, prefilledClientId]);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [selectedClientId, setSelectedClientId] = useState(prefilledClientId);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [sessionType, setSessionType] = useState<SessionType>('video');
  const [location, setLocation] = useState('');
  const [duration, setDuration] = useState('60');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>('weekly');
  const [recurringCount, setRecurringCount] = useState('');
  const [recurringCountError, setRecurringCountError] = useState('');
  const [dateError, setDateError] = useState('');
  const [meetingLink, setMeetingLink] = useState('');

  // ── Submit state ────────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const today = todayISO();

  const handleSchedule = async () => {
    if (!selectedClientId || !selectedDate || isSubmitting) return;
    if (!userId) {
      setSubmitError('Session expired — please log in again.');
      return;
    }

    // Validate recurring count
    const parsedCount = parseInt(recurringCount, 10);
    if (isRecurring && (!recurringCount || parsedCount < 1)) {
      setRecurringCountError('Please enter number of sessions');
      return;
    }

    setDateError('');
    setRecurringCountError('');
    setSubmitError(null);
    setIsSubmitting(true);

    // Map UI frequency value to DB column value
    const dbFrequency = FREQUENCIES.find(f => f.value === recurringFrequency)?.dbValue ?? null;

    // Convert trainer-entered IST time to UTC before saving.
    // selectedDate = 'YYYY-MM-DD', selectedTime = 'HH:MM'
    // Appending +05:30 tells the Date constructor the input is IST;
    // .toISOString() then returns the correct UTC equivalent.
    const scheduledAtISO = new Date(
      `${selectedDate}T${selectedTime}:00+05:30`
    ).toISOString();

    const options: ScheduleSessionOptions = {
      scheduledAt:          scheduledAtISO,
      sessionType:          sessionType,
      durationMinutes:      parseInt(duration, 10),
      meetingUrl:           sessionType === 'video' ? meetingLink.trim() || null : null,
      location:             sessionType === 'in-person' ? location.trim() || null : null,
      trainerNote:          null, // trainer adds notes separately after session creation
      isRecurring:          isRecurring,
      recurrenceFrequency:  isRecurring ? dbFrequency : null,
      sessionCount:         isRecurring ? parsedCount : 1,
    };

    try {
      await scheduleSession(userId, selectedClientId, options);
      navigate(-1);
    } catch {
      setSubmitError('Failed to schedule session. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = !selectedClientId || !selectedDate || isSubmitting;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <MobileShell className="bg-[#F2F8F7]">
      {/* 1. Header */}
      <ScreenHeader
        variant="sub"
        title="Schedule Session"
        subtitle="All times in IST"
        onBack={() => navigate(-1)}
        avatar={<ProfileMenu />}
      />

      <div className="flex-1 overflow-y-auto pb-36">
        <div className="px-4 pt-4 pb-6 space-y-3">

          {/* 2. Client Selector */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
            {prefilledClientId ? (
              /* Read-only display — navigated from ClientDetailScreen */
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#F3F4F6',
                borderRadius: '12px',
                color: '#111827',
                fontSize: '15px',
                fontWeight: 600,
              }}>
                {prefilledClientName || 'Loading...'}
              </div>
            ) : isLoadingClients ? (
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
                style={DATE_TIME_INPUT_STYLE}
                className="flex-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <input
                type="time"
                value={selectedTime}
                onChange={e => setSelectedTime(e.target.value)}
                style={DATE_TIME_INPUT_STYLE}
                className="flex-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            {selectedDate ? (
              <p className="text-[13px] text-gray-600 mt-2">📅 {formatDate(selectedDate)}</p>
            ) : (
              <p className="text-[12px] text-gray-400 mt-2">DD/MM/YYYY</p>
            )}
            <p className="text-[12px] text-gray-400 mt-1">Time zone: IST (UTC+5:30)</p>
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
                  <label className="block text-[12px] font-medium text-gray-600 mb-1">Session Address</label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. 42 Anna Salai, Chennai 600002"
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

          {/* 7. Recurring Toggle + Options */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Recurring Session</p>
                <p className="text-[12px] text-gray-400 mt-0.5">
                  {isRecurring ? 'Set frequency and total sessions below' : 'Schedule as a one-time session'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsRecurring(v => !v);
                  setRecurringCount('');
                  setRecurringCountError('');
                }}
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

            {isRecurring && (
              <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                {/* Frequency selector */}
                <div>
                  <p className="text-[12px] font-medium text-gray-600 mb-2">Repeat every</p>
                  <div className="flex gap-2">
                    {FREQUENCIES.map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setRecurringFrequency(value)}
                        className={`flex-1 py-2 rounded-xl text-[13px] font-semibold transition-colors ${
                          recurringFrequency === value ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                        style={recurringFrequency === value ? { backgroundColor: '#0d9488' } : {}}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Session count input */}
                <div>
                  <label className="block text-[12px] font-medium text-gray-600 mb-1">
                    Number of sessions
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={52}
                    value={recurringCount}
                    onChange={e => {
                      setRecurringCount(e.target.value);
                      setRecurringCountError('');
                    }}
                    placeholder="e.g. 12"
                    className="w-full rounded-xl border border-gray-200 p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-teal-500"
                    style={recurringCountError ? { borderColor: '#ef4444' } : {}}
                  />
                  {recurringCountError && (
                    <p className="text-[12px] text-red-500 font-medium mt-1">{recurringCountError}</p>
                  )}
                </div>

                {/* Preview summary */}
                {recurringCount && parseInt(recurringCount, 10) > 0 && selectedDate && (
                  <div style={{ backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '10px', padding: '10px 12px' }}>
                    <p style={{ color: '#0f766e', fontWeight: 600, fontSize: '13px' }}>
                      {parseInt(recurringCount, 10)} sessions will be created
                    </p>
                    <p style={{ color: '#0f766e', fontSize: '12px', marginTop: '2px' }}>
                      Starting {selectedDate} · {FREQUENCIES.find(f => f.value === recurringFrequency)?.label}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 9. Schedule Button — kept inside the scroll container so it scrolls
              naturally above the fixed bottom nav instead of hiding behind it. */}
          <div className="pt-2">
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
      </div>
      <TrainerBottomNav />
    </MobileShell>
  );
}
