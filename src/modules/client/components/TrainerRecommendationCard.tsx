import { MapPin, Star, Briefcase } from 'lucide-react';
import type { TrainerRecommendationCardProps } from '../../../types';

/** Returns up-to-2 capitalised initials from a full name */
function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

export default function TrainerRecommendationCard({
  trainer,
  onViewProfile,
}: TrainerRecommendationCardProps) {
  return (
    <div
      className="rounded-2xl bg-white shadow-sm p-4"
      style={{ border: '1px solid #F3F4F6' }}
    >
      {/* ── Top row: avatar + name/city/rating ──────────────────────────── */}
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar */}
        {trainer.photo_url ? (
          <img
            src={trainer.photo_url}
            alt={trainer.full_name}
            className="w-14 h-14 rounded-full object-cover shrink-0"
          />
        ) : (
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 font-bold text-[18px]"
            style={{ backgroundColor: '#F0FDF4', color: '#166534' }}
          >
            {getInitials(trainer.full_name)}
          </div>
        )}

        {/* Name / meta */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 leading-snug" style={{ fontSize: '16px' }}>
            {trainer.full_name}
          </p>

          {trainer.city && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={13} color="#9CA3AF" />
              <span style={{ fontSize: '12px', color: '#6B7280' }}>{trainer.city}</span>
            </div>
          )}

          <div className="flex items-center gap-3 mt-1">
            {trainer.rating != null && (
              <div className="flex items-center gap-1">
                <Star size={13} color="#F59E0B" fill="#F59E0B" />
                <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>
                  {trainer.rating.toFixed(1)}
                </span>
              </div>
            )}
            {trainer.experience_years != null && (
              <div className="flex items-center gap-1">
                <Briefcase size={13} color="#9CA3AF" />
                <span style={{ fontSize: '12px', color: '#6B7280' }}>
                  {trainer.experience_years} yrs experience
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Specialties ─────────────────────────────────────────────────── */}
      {trainer.specialties && trainer.specialties.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {trainer.specialties.map(s => (
            <span
              key={s}
              style={{
                backgroundColor: '#F3F4F6',
                borderRadius: '999px',
                padding: '2px 10px',
                fontSize: '12px',
                color: '#374151',
                fontWeight: 500,
              }}
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {/* ── Bio ─────────────────────────────────────────────────────────── */}
      {trainer.bio && (
        <p
          className="text-gray-500 mb-3 leading-relaxed"
          style={{
            fontSize: '13px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {trainer.bio}
        </p>
      )}

      {/* ── View Profile button ──────────────────────────────────────────── */}
      <button
        onClick={() => onViewProfile(trainer.id)}
        className="w-full font-semibold rounded-xl transition-colors"
        style={{
          minHeight: '48px',
          backgroundColor: '#F0FDF4',
          color: '#166534',
          fontSize: '14px',
          border: '1px solid #BBF7D0',
        }}
      >
        View Profile
      </button>
    </div>
  );
}
