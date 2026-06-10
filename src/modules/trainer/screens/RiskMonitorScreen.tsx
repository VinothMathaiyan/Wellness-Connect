import { useState, useEffect } from 'react';
import { ChevronRight, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileShell from '../../../components/MobileShell';
import TrainerBottomNav from '../components/TrainerBottomNav';
import { useWellness } from '../../../context/WellnessContext';
import ProfileMenu from '../../../components/ProfileMenu';
import ScreenHeader from '@/components/ScreenHeader';
import {
  getTrainerAllRiskAlerts,
  markAlertRead,
  type TrainerRiskAlert,
} from '../../../services/supabaseService';

// ─── Types ────────────────────────────────────────────────────────────────────

type RiskLevel = 'red' | 'amber' | 'green';

interface RiskClient {
  id: string;
  name: string;
  initials: string;
  riskLevel: RiskLevel;
  riskReason: string | null;
  lastActive: string;
  alert: TrainerRiskAlert; // carried for navigation state
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_RANK: Record<'low' | 'medium' | 'high', number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  mood_drop:      'Mood drop detected',
  sleep_drop:     'Sleep quality dropped',
  missed_workout: 'Missed workout sessions',
  hydration:      'Hydration levels low',
  general:        'General wellness flag',
  low_readiness:  'Low readiness reported',
  high_pain:      'High pain reported',
};

function severityToRiskLevel(severity: 'low' | 'medium' | 'high'): RiskLevel {
  if (severity === 'high') return 'red';
  if (severity === 'medium') return 'amber';
  return 'green';
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return fullName.slice(0, 2).toUpperCase();
}

function timeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return diffMins <= 1 ? 'Just now' : `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
}

/** Keep only the highest-severity alert per client, sorted red → amber → green */
function dedupeByClient(alerts: TrainerRiskAlert[]): TrainerRiskAlert[] {
  const map = new Map<string, TrainerRiskAlert>();
  for (const alert of alerts) {
    const existing = map.get(alert.client_id);
    if (!existing || SEVERITY_RANK[alert.severity] > SEVERITY_RANK[existing.severity]) {
      map.set(alert.client_id, alert);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity],
  );
}

function alertToRiskClient(alert: TrainerRiskAlert): RiskClient {
  const name = alert.client?.full_name ?? 'Unknown Client';
  return {
    id: alert.client_id,
    name,
    initials: getInitials(name),
    riskLevel: severityToRiskLevel(alert.severity),
    riskReason: ALERT_TYPE_LABELS[alert.alert_type] ?? alert.message ?? null,
    lastActive: timeAgo(alert.created_at),
    alert,
  };
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const STRIPE: Record<RiskLevel, string> = {
  red:   'border-red-500',
  amber: 'border-amber-400',
  green: 'border-emerald-400',
};

const AVATAR_BG: Record<RiskLevel, string> = {
  red:   'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-700',
  green: 'bg-emerald-100 text-emerald-700',
};

const REASON_TEXT: Record<RiskLevel, string> = {
  red:   'text-red-500',
  amber: 'text-amber-600',
  green: 'text-emerald-600',
};

const STRIPE_STYLE = {
  red:   { borderLeftColor: '#ef4444' },
  amber: { borderLeftColor: '#f59e0b' },
  green: { borderLeftColor: '#10b981' },
};

const AVATAR_STYLE = {
  red:   { backgroundColor: '#fee2e2', color: '#b91c1c' },
  amber: { backgroundColor: '#fef3c7', color: '#92400e' },
  green: { backgroundColor: '#d1fae5', color: '#065f46' },
};

const REASON_STYLE = {
  red:   { color: '#dc2626' },
  amber: { color: '#d97706' },
  green: { color: '#059669' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  label,
  colorClass,
  hexColor,
}: {
  label: string;
  colorClass: string;
  hexColor?: string;
}) {
  return (
    <p
      className={`text-xs font-semibold uppercase tracking-wider mb-2 mt-4 first:mt-0 ${colorClass}`}
      style={hexColor ? { color: hexColor } : undefined}
    >
      {label}
    </p>
  );
}

function ClientRiskRow({
  client,
  onTap,
}: {
  client: RiskClient;
  onTap: () => void;
}) {
  return (
    <button
      onClick={onTap}
      className={`w-full bg-white rounded-2xl shadow-sm mb-2 p-3 flex items-center gap-3 border-l-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors ${STRIPE[client.riskLevel]}`}
      style={STRIPE_STYLE[client.riskLevel]}
    >
      {/* Avatar */}
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${AVATAR_BG[client.riskLevel]}`}
        style={AVATAR_STYLE[client.riskLevel]}
      >
        {client.initials}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-bold text-gray-900 leading-tight truncate">
          {client.name}
        </p>
        <p
          className={`text-xs mt-0.5 truncate ${REASON_TEXT[client.riskLevel]}`}
          style={REASON_STYLE[client.riskLevel]}
        >
          {client.riskReason ?? `Last active ${client.lastActive}`}
        </p>
      </div>

      <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
    </button>
  );
}

function SkeletonRow() {
  return (
    <div className="w-full bg-white rounded-2xl shadow-sm mb-2 p-3 flex items-center gap-3 border-l-4 border-gray-200 animate-pulse">
      <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-32" />
        <div className="h-2.5 bg-gray-100 rounded w-48" />
      </div>
    </div>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RiskMonitorScreen() {
  const navigate = useNavigate();
  const { userId } = useWellness();

  const [riskClients, setRiskClients] = useState<RiskClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setFetchError(null);
    getTrainerAllRiskAlerts(userId)
      .then(alerts => {
        const deduped = dedupeByClient(alerts);
        setRiskClients(deduped.map(alertToRiskClient));
      })
      .catch(err => {
        console.error('RiskMonitorScreen:', err);
        setFetchError(err instanceof Error ? err.message : 'Failed to load alerts');
      })
      .finally(() => setIsLoading(false));
  }, [userId]);

  const handleAlertTap = async (client: RiskClient) => {
    // Mark the alert as read (non-blocking — navigate immediately)
    markAlertRead(client.alert.id).catch(() => {});
    navigate(`/trainer/risk-alert/${client.id}`, {
      state: { alert: client.alert },
    });
  };

  const redClients   = riskClients.filter(c => c.riskLevel === 'red');
  const amberClients = riskClients.filter(c => c.riskLevel === 'amber');
  const greenClients = riskClients.filter(c => c.riskLevel === 'green');

  return (
    <MobileShell>
      <div className="flex flex-col min-h-full bg-gray-50">

        <ScreenHeader
          variant="sub"
          title="Risk Monitor"
          subtitle="All clients · sorted by risk level"
          onBack={() => navigate(-1)}
          avatar={<ProfileMenu />}
        >
          {/* ── Risk summary strip ──────────────────────────────────────────── */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <span
              className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold"
              style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}
            >
              {isLoading ? '–' : redClients.length} Critical
            </span>
            <span
              className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold"
              style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
            >
              {isLoading ? '–' : amberClients.length} At Risk
            </span>
            <span
              className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold"
              style={{ backgroundColor: '#d1fae5', color: '#065f46' }}
            >
              {isLoading ? '–' : greenClients.length} On Track
            </span>
          </div>
        </ScreenHeader>

        {/* ── Scrollable body ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">

          {/* Error state */}
          {!isLoading && fetchError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[13px] text-red-700 font-medium mb-4">
              {fetchError}
            </div>
          )}

          {isLoading ? (
            /* ── Skeleton ──────────────────────────────────────────────────── */
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : riskClients.length === 0 ? (
            /* ── Empty state ───────────────────────────────────────────────── */
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Shield size={40} className="text-gray-300" />
              <p className="text-sm text-gray-400 font-medium">No active alerts</p>
              <p className="text-xs text-gray-400 text-center px-8">
                All your clients are on track. Alerts will appear here when risk signals are detected.
              </p>
            </div>
          ) : (
            <>
              {/* ── Red ──────────────────────────────────────────────────────── */}
              {redClients.length > 0 && (
                <div>
                  <SectionHeader label="Immediate Attention" colorClass="text-red-600" hexColor="#dc2626" />
                  <div className="lg:grid lg:grid-cols-2 lg:gap-x-3 lg:items-start">
                  {redClients.map(client => (
                    <ClientRiskRow
                      key={client.id}
                      client={client}
                      onTap={() => handleAlertTap(client)}
                    />
                  ))}
                  </div>
                </div>
              )}

              {/* ── Amber ────────────────────────────────────────────────────── */}
              {amberClients.length > 0 && (
                <div>
                  <SectionHeader label="Monitor Closely" colorClass="text-amber-600" hexColor="#d97706" />
                  <div className="lg:grid lg:grid-cols-2 lg:gap-x-3 lg:items-start">
                  {amberClients.map(client => (
                    <ClientRiskRow
                      key={client.id}
                      client={client}
                      onTap={() =>
                        navigate(`/trainer/risk-alert/${client.id}`, {
                          state: { alert: client.alert },
                        })
                      }
                    />
                  ))}
                  </div>
                </div>
              )}

              {/* ── Green ────────────────────────────────────────────────────── */}
              {greenClients.length > 0 && (
                <div>
                  <SectionHeader label="Low Risk" colorClass="text-emerald-600" hexColor="#059669" />
                  <div className="lg:grid lg:grid-cols-2 lg:gap-x-3 lg:items-start">
                  {greenClients.map(client => (
                    <ClientRiskRow
                      key={client.id}
                      client={client}
                      onTap={() =>
                        navigate(`/trainer/risk-alert/${client.id}`, {
                          state: { alert: client.alert },
                        })
                      }
                    />
                  ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <TrainerBottomNav />
    </MobileShell>
  );
}
