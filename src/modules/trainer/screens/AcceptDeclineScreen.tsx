import { useState, useEffect } from 'react';
import {
  UserPlus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  ChevronLeft,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import MobileShell from '../../../components/MobileShell';
import { useWellness } from '../../../context/WellnessContext';
import {
  updateClientLinkStatus,
  getPendingClientRequests,
} from '../../../services/supabaseService';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PendingClient {
  id: string;
  name: string;
  initials: string;
  city: string;
  fitnessLevel: string;
  healthConditions: string[];
  goals: string[];
  assessmentNotes: string;
  currentClients: number;
  maxClients: number;
}

type ScreenState = 'default' | 'decline-form' | 'accepted' | 'declined' | 'loading';

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

function AssessmentSummary({ notes }: { notes: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Assessment Team Notes
      </p>
      {notes ? (
        <p className="text-sm text-gray-500 italic leading-relaxed">{notes}</p>
      ) : (
        <p className="text-sm text-gray-400 italic">No assessment notes available</p>
      )}
    </div>
  );
}

function ClientLoadIndicator({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? (current / max) * 100 : 0;
  const atCapacity = current >= max;

  let barColor = 'bg-green-500';
  if (pct >= 100) barColor = 'bg-red-500';
  else if (pct >= 80) barColor = 'bg-amber-400';

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <Users size={15} className="text-gray-500" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Current Client Load
        </p>
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-800">
          {current} of {max} clients
        </span>
        <span className="text-xs text-gray-500">{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      {atCapacity && (
        <div className="mt-2 flex items-center gap-1.5">
          <AlertTriangle size={13} className="text-red-500" />
          <p className="text-xs text-red-600 font-medium">
            You've reached your maximum client capacity
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Action Zone ─────────────────────────────────────────────────────────────

function ActionZone({
  clientId,
  atCapacity,
  screenState,
  onAccept,
  onStartDecline,
  onConfirmDecline,
  onCancelDecline,
}: {
  clientId: string;
  atCapacity: boolean;
  screenState: ScreenState;
  onAccept: () => void;
  onStartDecline: () => void;
  onConfirmDecline: (reason: string) => void;
  onCancelDecline: () => void;
}) {
  const navigate = useNavigate();
  const [declineReason, setDeclineReason] = useState('');

  if (screenState === 'loading') {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-center">
        <p className="text-sm text-gray-500 font-medium">Saving…</p>
      </div>
    );
  }

  if (screenState === 'accepted') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
        <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
        <p className="font-semibold text-green-800 text-sm mb-1">
          Client accepted.
        </p>
        <p className="text-green-700 text-xs mb-4">
          A program template has been sent.
        </p>
        <button
          onClick={() => navigate(`/trainer/client/${clientId}`)}
          className="w-full bg-teal-600 text-white text-sm font-semibold py-3 rounded-xl"
        >
          Go to Client Detail
        </button>
      </div>
    );
  }

  if (screenState === 'declined') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-center">
        <XCircle size={32} className="text-gray-400 mx-auto mb-2" />
        <p className="font-semibold text-gray-700 text-sm mb-1">
          Client request declined.
        </p>
        <div className="h-px bg-gray-200 my-3" />
        <button
          onClick={() => navigate('/trainer')}
          className="w-full bg-gray-200 text-gray-800 text-sm font-semibold py-3 rounded-xl"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (screenState === 'decline-form') {
    return (
      <div
        className="bg-white rounded-2xl shadow-sm p-4"
        style={{ animation: 'fadeIn 0.18s ease' }}
      >
        <p className="text-sm font-semibold text-gray-800 mb-2">
          Reason for Declining
        </p>
        <textarea
          className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-red-300 placeholder:text-gray-400"
          rows={4}
          maxLength={200}
          placeholder="Please provide a reason for declining (required)"
          value={declineReason}
          onChange={(e) => setDeclineReason(e.target.value)}
        />
        <div className="text-right text-xs text-gray-400 mb-3">
          {declineReason.length}/200
        </div>
        <button
          onClick={() => onConfirmDecline(declineReason)}
          disabled={declineReason.trim().length === 0}
          className="w-full bg-red-500 text-white text-sm font-semibold py-3 rounded-xl mb-2"
          style={{
            opacity: declineReason.trim().length === 0 ? 0.5 : 1,
            cursor: declineReason.trim().length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          Confirm Decline
        </button>
        <div className="text-center">
          <button
            onClick={onCancelDecline}
            className="text-sm text-gray-400 underline underline-offset-2"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // default state
  return (
    <div>
      <button
        onClick={onAccept}
        disabled={atCapacity}
        className="w-full bg-teal-600 text-white text-sm font-semibold py-3.5 rounded-xl mb-3 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <UserPlus size={16} />
        Accept Client
      </button>
      <div className="text-center">
        <button
          onClick={onStartDecline}
          className="text-sm text-gray-400 underline underline-offset-2"
        >
          Decline
        </button>
      </div>
    </div>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function AcceptDeclineScreen() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { userId } = useWellness();

  const [screenState, setScreenState] = useState<ScreenState>('default');
  const [pendingClient, setPendingClient] = useState<any>(null);
  const [isLoadingClient, setIsLoadingClient] = useState(true);

  useEffect(() => {
    if (!userId) return;
    getPendingClientRequests(userId)
      .then(requests => {
        const match = requests.find(
          (r: any) => r.client_id === clientId || r.client?.id === clientId
        );
        if (match) setPendingClient(match.client);
      })
      .catch(err => console.error('Pending load:', err))
      .finally(() => setIsLoadingClient(false));
  }, [userId, clientId]);

  const handleAccept = async () => {
    if (!userId || !clientId) return;
    setScreenState('loading');
    const success = await updateClientLinkStatus(userId, clientId, 'active');
    if (success) {
      setScreenState('accepted');
    } else {
      setScreenState('default');
    }
  };

  const handleDecline = async (reason: string) => {
    if (!userId || !clientId) return;
    setScreenState('loading');
    const success = await updateClientLinkStatus(userId, clientId, 'inactive');
    if (success) {
      setScreenState('declined');
    } else {
      setScreenState('default');
    }
  };

  // Build display object — merge real data over mock fallback
  const display: PendingClient = pendingClient ? {
    ...mockPendingClient,
    id:       pendingClient.id       ?? mockPendingClient.id,
    name:     pendingClient.full_name ?? mockPendingClient.name,
    initials: getInitials(pendingClient.full_name ?? '') || mockPendingClient.initials,
    city:     pendingClient.city      ?? mockPendingClient.city,
    goals:    pendingClient.specialties ?? mockPendingClient.goals,
  } : mockPendingClient;

  const atCapacity      = display.currentClients >= display.maxClients;
  const resolvedClientId = clientId ?? display.id;

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
          <ClientProfilePreview client={display} />
          <AssessmentSummary notes={display.assessmentNotes} />
          <ClientLoadIndicator
            current={display.currentClients}
            max={display.maxClients}
          />

          {/* Action Zone */}
          <div className="mt-2">
            <ActionZone
              clientId={resolvedClientId}
              atCapacity={atCapacity}
              screenState={screenState}
              onAccept={handleAccept}
              onStartDecline={() => setScreenState('decline-form')}
              onConfirmDecline={handleDecline}
              onCancelDecline={() => setScreenState('default')}
            />
          </div>
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
  fitnessLevel: 'Beginner',
  healthConditions: ['Knee injury', 'Lower back pain'],
  goals: ['Rehabilitation', 'Flexibility'],
  assessmentNotes:
    'Client has recovered 80% from ACL surgery (6 months ago). Cleared for low-impact training by physiotherapist. Avoid high-impact plyometrics for first 8 weeks. Good motivation levels — responded well during assessment.',
  currentClients: 8,
  maxClients: 12,
};
