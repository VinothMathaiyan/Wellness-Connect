import { useState, useEffect } from 'react';
import {
  UserPlus,
  AlertTriangle,
  Users,
  ChevronLeft,
  Phone,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import MobileShell from '../../../components/MobileShell';
import { useWellness } from '../../../context/WellnessContext';
import {
  updateClientLinkStatus,
  getPendingClientRequests,
  getActiveClientCount,
  getClientAssessmentNotes,
  getClientProfileById,
  type ClientAssessmentNotes,
} from '../../../services/supabaseService';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PendingClient {
  id: string;
  name: string;
  initials: string;
  city: string;
  phoneNumber: string;
  fitnessLevel: string;
  healthConditions: string[];
  goals: string[];
  assessmentNotes: string;
  currentClients: number;
  maxClients: number;
}

interface PendingClientProfile {
  id: string;
  full_name: string | null;
  city: string | null;
  specialties: string[] | null;
  photo_url: string | null;
  phone_number: string | null;
}

interface PendingClientRequest {
  client_id: string | null;
  client: PendingClientProfile | PendingClientProfile[] | null;
}

type ScreenState = 'default' | 'decline-form' | 'loading';

function firstPendingClient(
  client: PendingClientProfile | PendingClientProfile[] | null,
): PendingClientProfile | null {
  if (Array.isArray(client)) return client[0] ?? null;
  return client;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ClientProfilePreview({ client }: { client: PendingClient }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
          <span className="text-teal-700 font-bold text-base">{client.initials}</span>
        </div>
        <div>
          <p className="font-bold text-gray-900 text-base">{client.name}</p>
          <p className="text-sm text-gray-500">{client.city}</p>
        </div>
      </div>

      {/* Phone Number */}
      {client.phoneNumber && (
        <a
          href={`tel:${client.phoneNumber}`}
          className="flex items-center gap-2 mb-3 px-3 py-2 bg-teal-50 border border-teal-200 rounded-xl active:bg-teal-100 transition-colors"
        >
          <Phone size={14} className="text-teal-600 flex-shrink-0" />
          <span className="text-sm font-semibold text-teal-700">{client.phoneNumber}</span>
          <span className="text-xs text-teal-500 ml-auto">Tap to call</span>
        </a>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          {client.fitnessLevel}
        </span>
      </div>

      {client.healthConditions.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1 mb-1.5">
            <AlertTriangle size={13} className="text-amber-600" />
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
              Health Conditions
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {client.healthConditions.map((condition) => (
              <span
                key={condition}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
              >
                {condition}
              </span>
            ))}
          </div>
        </div>
      )}

      {client.goals.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Goals
          </p>
          <div className="flex flex-wrap gap-1.5">
            {client.goals.map((goal) => (
              <span
                key={goal}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700"
              >
                {goal}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AssessmentSummary({ notes }: { notes: ClientAssessmentNotes | null; isLoading: boolean }) {
  if (!notes) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Assessment Team Notes
        </p>
        <p className="text-sm text-gray-400 italic">No assessment on file</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Assessment Team Notes
      </p>

      {/* Clearance + Fitness badges */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {notes.clearance_status && (
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: notes.clearance_status === 'cleared' ? '#d1fae5' : '#fef3c7',
              color: notes.clearance_status === 'cleared' ? '#065f46' : '#854d0e',
            }}
          >
            {notes.clearance_status === 'cleared' ? '✓ Cleared' : notes.clearance_status}
          </span>
        )}
        {notes.fitness_level && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {notes.fitness_level}
          </span>
        )}
      </div>

      {notes.health_notes ? (
        <p className="text-sm text-gray-500 italic leading-relaxed">{notes.health_notes}</p>
      ) : (
        <p className="text-sm text-gray-400 italic">No additional notes from the assessment team</p>
      )}
    </div>
  );
}

function ClientLoadIndicator({ count }: { count: number }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <Users size={15} className="text-gray-500" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Current Client Load
        </p>
      </div>
      <span className="text-sm font-medium text-gray-800">
        {count} active client{count === 1 ? '' : 's'}
      </span>
    </div>
  );
}

// ─── Action Zone ─────────────────────────────────────────────────────────────

function ActionZone({
  atCapacity,
  screenState,
  onAccept,
  onStartDecline,
  onConfirmDecline,
  onCancelDecline,
}: {
  atCapacity: boolean;
  screenState: ScreenState;
  onAccept: () => void;
  onStartDecline: () => void;
  onConfirmDecline: () => void;
  onCancelDecline: () => void;
}) {
  if (screenState === 'loading') {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-center">
        <p className="text-sm text-gray-500 font-medium">Saving…</p>
      </div>
    );
  }

  if (screenState === 'decline-form') {
    return (
      <div
        className="bg-white rounded-2xl shadow-sm p-4"
        style={{ animation: 'fadeIn 0.18s ease' }}
      >
        <p className="text-sm font-semibold text-gray-800 mb-1">
          Decline this request?
        </p>
        <p className="text-xs text-gray-500 mb-4">
          This action cannot be undone.
        </p>
        <button
          type="button"
          onClick={onConfirmDecline}
          className="w-full text-sm font-semibold py-3 rounded-xl mb-2"
          style={{ backgroundColor: '#ef4444', color: '#ffffff' }}
        >
          Yes, Decline
        </button>
        <button
          type="button"
          onClick={onCancelDecline}
          className="w-full bg-gray-100 text-gray-700 text-sm font-semibold py-3 rounded-xl"
        >
          Cancel
        </button>
      </div>
    );
  }

  // default state
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onAccept}
        disabled={atCapacity}
        className="w-full bg-teal-600 text-white text-sm font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <UserPlus size={16} />
        Accept Client
      </button>
      <button
        type="button"
        onClick={onStartDecline}
        className="w-full bg-gray-100 text-gray-700 text-sm font-semibold py-3.5 rounded-xl flex items-center justify-center"
      >
        Decline Request
      </button>
    </div>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function AcceptDeclineScreen() {
  const { clientId: routeClientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { userId } = useWellness();

  const [screenState, setScreenState] = useState<ScreenState>('default');
  const [pendingClient, setPendingClient] = useState<PendingClientProfile | null>(null);
  // True until the pending-request resolution effect (list match + direct
  // getClientProfileById fallback) completes. Gates the render so the mock
  // dev placeholder never flashes before the real client resolves.
  const [isResolvingClient, setIsResolvingClient] = useState(true);
  // The real client ID resolved from the pending request (may differ from mock route param)
  const [realClientId, setRealClientId] = useState<string | null>(null);
  // Real active client count fetched from DB
  const [activeClientCount, setActiveClientCount] = useState(0);
  // Assessment notes fetched from DB
  const [assessmentNotes, setAssessmentNotes] = useState<ClientAssessmentNotes | null>(null);
  const [isAssessmentLoading, setIsAssessmentLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      getPendingClientRequests(userId),
      getActiveClientCount(userId),
    ])
      .then(async ([requests, clientCount]) => {
        setActiveClientCount(clientCount);
        const typedRequests = requests as unknown as PendingClientRequest[];
        // Prefer an exact match on the route param (against client_id or the
        // resolved client's id). Only fall back to the first pending request
        // when there's no routeClientId to match against.
        const exactMatch = routeClientId
          ? typedRequests.find(request => {
              const client = firstPendingClient(request.client);
              return request.client_id === routeClientId || client?.id === routeClientId;
            })
          : undefined;
        const match =
          exactMatch ?? (!routeClientId && typedRequests.length > 0 ? typedRequests[0] : null);
        if (match) {
          const client = firstPendingClient(match.client);
          setPendingClient(client);
          setRealClientId(match.client_id ?? client?.id ?? null);
          return;
        }
        // No match in the pending list — if we have a route param, fetch that
        // client's profile directly so we still show real identity, not mock.
        if (routeClientId) {
          const profile = await getClientProfileById(routeClientId);
          if (profile) {
            setPendingClient(profile);
            setRealClientId(profile.id);
          }
        }
      })
      .catch(err => console.error('Pending load:', err))
      .finally(() => setIsResolvingClient(false));
  }, [userId, routeClientId]);

  // Fetch assessment notes using the RESOLVED client id, not the raw route param
  // (the param may be a placeholder/link id that won't match the assessments table).
  useEffect(() => {
    const idForNotes = realClientId ?? routeClientId;
    if (!idForNotes) {
      setIsAssessmentLoading(false);
      return;
    }
    setIsAssessmentLoading(true);
    getClientAssessmentNotes(idForNotes)
      .then(notes => setAssessmentNotes(notes))
      .catch(err => console.error('Assessment notes load:', err))
      .finally(() => setIsAssessmentLoading(false));
  }, [realClientId, routeClientId]);

  // Use the resolved real client ID for DB operations, falling back to route param
  const effectiveClientId = realClientId ?? routeClientId;

  const handleAccept = async () => {
    if (!userId || !effectiveClientId) return;
    setScreenState('loading');
    const success = await updateClientLinkStatus(userId, effectiveClientId, 'active');
    if (success) {
      navigate('/trainer/clients');
    } else {
      setScreenState('default');
    }
  };

  const handleDecline = async () => {
    if (!userId || !effectiveClientId) return;
    setScreenState('loading');
    const success = await updateClientLinkStatus(userId, effectiveClientId, 'declined');
    if (success) {
      navigate('/trainer/clients');
    } else {
      setScreenState('default');
    }
  };

  // Build display object from the REAL client when one is resolved. Core
  // identity (name, city, phone, goals) must never fall back to mock data.
  // profiles has no health-conditions column, so healthConditions stays empty
  // and goals maps from specialties — both expected, not a bug. The mock object
  // is only used wholesale when no client id resolved at all (dev safety).
  const display: PendingClient = pendingClient ? {
    ...mockPendingClient,            // non-identity placeholders only (fitnessLevel, max)
    id:               pendingClient.id,
    name:             pendingClient.full_name ?? 'Unknown Client',
    initials:         getInitials(pendingClient.full_name ?? '') || '?',
    city:             pendingClient.city ?? '',
    phoneNumber:      pendingClient.phone_number ?? '',
    healthConditions: [],
    goals:            pendingClient.specialties ?? [],
  } : mockPendingClient;

  // Show the profile when a real client resolved, OR — as a dev last resort —
  // when no client id was available at all (then `display` is the mock). If a
  // routeClientId was present but resolved to nothing, show "Client not found".
  const noIdAvailable = !routeClientId && !realClientId;
  const showClient = pendingClient !== null || noIdAvailable;

  const atCapacity = false; // no defined max — never block accept

  return (
    <MobileShell>
      <div className="flex flex-col min-h-full bg-gray-50">
        {/* Header */}
        <div className="bg-white px-4 pt-6 pb-4 flex items-start gap-3 shadow-sm">
          <button
            onClick={() => navigate(-1)}
            className="mt-0.5 p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              New Client Request
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Review the client profile before accepting
            </p>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
          {isResolvingClient ? (
            /* Loading skeleton — matches the block style used in MyClientsScreen */
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  style={{
                    backgroundColor: '#e5e7eb',
                    borderRadius: '16px',
                    height: i === 1 ? '128px' : '88px',
                    animation: 'pulse 2s infinite',
                  }}
                />
              ))}
            </div>
          ) : !showClient ? (
            /* Resolution finished but no real client for this route param —
               graceful empty state instead of the mock dev placeholder. */
            <div className="flex flex-col items-center justify-center text-center py-16">
              <Users size={40} className="text-gray-300 mb-3" />
              <p className="text-base font-bold text-gray-900">Client not found</p>
              <p className="text-sm text-gray-500 mt-1">
                This request may have been withdrawn or already actioned.
              </p>
            </div>
          ) : (
            <>
              <ClientProfilePreview client={display} />
              <AssessmentSummary notes={assessmentNotes} isLoading={isAssessmentLoading} />
              <ClientLoadIndicator count={activeClientCount} />

              {/* Action Zone */}
              <div className="mt-2">
                <ActionZone
                  atCapacity={atCapacity}
                  screenState={screenState}
                  onAccept={handleAccept}
                  onStartDecline={() => setScreenState('decline-form')}
                  onConfirmDecline={handleDecline}
                  onCancelDecline={() => setScreenState('default')}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </MobileShell>
  );
}

// DEV FALLBACK — remove after real pending-client data exists
const mockPendingClient: PendingClient = {
  id: 'pending-001',
  name: 'Kavya Reddy',
  initials: 'KR',
  city: 'Chennai',
  phoneNumber: '',
  fitnessLevel: 'Beginner',
  healthConditions: ['Knee injury', 'Lower back pain'],
  goals: ['Rehabilitation', 'Flexibility'],
  assessmentNotes:
    'Client has recovered 80% from ACL surgery (6 months ago). Cleared for low-impact training by physiotherapist. Avoid high-impact plyometrics for first 8 weeks. Good motivation levels — responded well during assessment.',
  currentClients: 8,
  maxClients: 12,
};
