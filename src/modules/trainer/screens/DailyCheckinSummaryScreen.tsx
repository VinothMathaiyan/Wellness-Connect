import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import MobileShell from '../../../components/MobileShell';
import TrainerBottomNav from '../components/TrainerBottomNav';
import { useWellness } from '../../../context/WellnessContext';
import {
  getDailyCheckinDetail,
} from '../../../services/supabaseService';
import type { DailyCheckinDetailRow } from '../../../services/supabaseService';
import { formatDateLong } from '@/utils/dateUtils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readinessColor(score: number | null): string {
  if (score == null) return '#6B7280';
  if (score >= 70) return '#22c55e';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(part => part[0] ?? '')
    .join('')
    .toUpperCase();
}

function formatDateHeader(dateStr: string): string {
  // Parse as local date to avoid timezone offset shifting the day
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return formatDateLong(d);
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DailyCheckinSummaryScreen() {
  const { date } = useParams<{ date: string }>();
  const navigate  = useNavigate();
  const { userId } = useWellness();

  const [checkins,  setCheckins]  = useState<DailyCheckinDetailRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !date) return;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      const result = await getDailyCheckinDetail(userId, date);
      if (cancelled) return;
      if (result.error) {
        setError(result.error);
      } else {
        setCheckins(result.data);
      }
      setIsLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [userId, date]);

  const formattedDate = date ? formatDateHeader(date) : '';

  return (
    <MobileShell className="bg-[#F2F8F7]">
      <div className="flex-1 overflow-y-auto pb-24">

        {/* ─── Header ──────────────────────────────────────────────────────────── */}
        <div
          className="bg-white border-b border-gray-100 flex items-center gap-3"
          style={{ padding: '20px 20px 16px' }}
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 transition-colors"
            style={{ width: '36px', height: '36px', flexShrink: 0 }}
            aria-label="Back"
          >
            <ArrowLeft size={18} style={{ color: '#374151' }} />
          </button>
          <h1
            className="font-bold text-[#111827]"
            style={{ fontSize: '17px', lineHeight: 1.2 }}
          >
            {formattedDate}
          </h1>
        </div>

        {/* ─── Content ─────────────────────────────────────────────────────────── */}
        {/* p-[20px] pb-0 / flex-col / gap-3 match the previous inline styles exactly below lg;
            lg:+ adds a centered width cap only */}
        <div className="p-5 pb-0 flex flex-col gap-3 lg:max-w-3xl lg:mx-auto lg:w-full">

          <h2
            className="uppercase font-bold tracking-wider"
            style={{ fontSize: '13px', color: '#6B7280', marginLeft: '4px' }}
          >
            Check-ins on this day
          </h2>

          {/* Loading skeleton */}
          {isLoading && (
            <>
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="rounded-2xl"
                  style={{ height: '90px', backgroundColor: '#E5E7EB', animation: 'pulse 2s infinite' }}
                />
              ))}
            </>
          )}

          {/* Error state */}
          {!isLoading && error && (
            <div
              className="rounded-2xl"
              style={{ backgroundColor: '#FEF2F2', padding: '16px', fontSize: '13px', color: '#B91C1C' }}
            >
              Failed to load check-ins. Please try again.
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && checkins.length === 0 && (
            <p
              className="text-center"
              style={{ fontSize: '14px', color: '#9CA3AF', marginTop: '32px' }}
            >
              No check-ins on this day
            </p>
          )}

          {/* Client cards */}
          {!isLoading && !error && checkins.map((client) => (
            <ClientCheckinCard
              key={client.client_id}
              client={client}
              onTap={() => navigate(`/trainer/client-progress/${client.client_id}`)}
            />
          ))}

        </div>
      </div>

      <TrainerBottomNav />
    </MobileShell>
  );
}

// ─── Client card sub-component ────────────────────────────────────────────────

function ClientCheckinCard({
  client,
  onTap,
}: {
  client: DailyCheckinDetailRow;
  onTap: () => void;
}) {
  const color = readinessColor(client.readiness_score);

  return (
    <button
      onClick={onTap}
      className="w-full text-left active:opacity-75 transition-opacity"
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #F3F4F6',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}
    >
      {/* Avatar */}
      <div
        className="flex items-center justify-center font-bold text-white"
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: '#0d9488',
          flexShrink: 0,
          fontSize: '13px',
        }}
      >
        {getInitials(client.client_name)}
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Name + readiness badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <p
            className="font-bold truncate"
            style={{ fontSize: '14px', color: '#111827' }}
          >
            {client.client_name}
          </p>
          <span
            className="font-bold text-white"
            style={{
              backgroundColor: color,
              borderRadius: '999px',
              fontSize: '11px',
              padding: '2px 8px',
              marginLeft: '8px',
              flexShrink: 0,
            }}
          >
            {client.readiness_score != null ? client.readiness_score : '--'}
          </span>
        </div>

        {/* Workout done */}
        <p
          className="font-semibold"
          style={{
            fontSize: '12px',
            color: client.workout_done ? '#16A34A' : '#DC2626',
            marginBottom: '6px',
          }}
        >
          {client.workout_done ? '✓ Workout done' : '✗ Workout not done'}
        </p>

        {/* Compact metrics row */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {client.sleep_hours != null && (
            <span style={{ fontSize: '11px', color: '#6B7280' }}>
              <span style={{ fontWeight: 600, color: '#374151' }}>{client.sleep_hours}h</span> sleep
            </span>
          )}
          {client.energy_score != null && (
            <span style={{ fontSize: '11px', color: '#6B7280' }}>
              <span style={{ fontWeight: 600, color: '#374151' }}>{client.energy_score}</span> energy
            </span>
          )}
          {client.mood_score != null && (
            <span style={{ fontSize: '11px', color: '#6B7280' }}>
              <span style={{ fontWeight: 600, color: '#374151' }}>{client.mood_score}</span> mood
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
