import React from 'react';
import { useWellness } from '../context/WellnessContext';

type AvatarSize = 'sm' | 'md' | 'lg';
type AvatarVariant = 'filled' | 'outlined';
type Role = 'client' | 'trainer' | 'assessor' | null;

interface UserAvatarProps {
  name: string;
  size?: AvatarSize;
  variant?: AvatarVariant;
  src?: string | null;
  roleOverride?: Role;
}

const SIZE_MAP: Record<AvatarSize, number> = {
  sm: 36,
  md: 48,
  lg: 64,
};

const FONT_SIZE_MAP: Record<AvatarSize, number> = {
  sm: 14,
  md: 18,
  lg: 24,
};

const TEXT_COLORS: Record<string, string> = {
  client: '#1D9E75',
  trainer: '#0d9488',
  assessor: '#7c3aed',
};

const GRADIENTS: Record<string, string> = {
  client: 'linear-gradient(135deg, #166534 0%, #1D9E75 100%)',
  trainer: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
  assessor: 'linear-gradient(135deg, #0d9488 0%, #7c3aed 100%)',
};

export default function UserAvatar({
  name,
  size = 'sm',
  variant = 'outlined',
  src,
  roleOverride,
}: UserAvatarProps) {
  const { userRole } = useWellness();
  const effectiveRole = roleOverride ?? userRole ?? 'client';
  
  const dim = SIZE_MAP[size];
  const fontSize = FONT_SIZE_MAP[size];
  
  // Single initial from the first word
  const initial = name ? name.split(' ')[0].charAt(0).toUpperCase() : '?';

  if (src) {
    return (
      <div 
        className="rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-gray-100"
        style={{ width: dim, height: dim }}
      >
        <img src={src} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }

  if (variant === 'filled') {
    return (
      <div
        className="rounded-full shrink-0 flex items-center justify-center font-bold text-white shadow-sm"
        style={{
          width: dim,
          height: dim,
          fontSize,
          background: GRADIENTS[effectiveRole] || GRADIENTS.client,
        }}
      >
        {initial}
      </div>
    );
  }

  // Outlined (default)
  return (
    <div
      className="rounded-full shrink-0 flex items-center justify-center font-bold bg-white"
      style={{
        width: dim,
        height: dim,
        fontSize,
        color: TEXT_COLORS[effectiveRole] || TEXT_COLORS.client,
        border: `1.5px solid ${TEXT_COLORS[effectiveRole] || TEXT_COLORS.client}`,
      }}
    >
      {initial}
    </div>
  );
}
