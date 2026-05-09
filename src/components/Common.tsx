/**
 * Common UI primitives shared across WellnessConnect screens.
 */

// ── Badge ─────────────────────────────────────────────────────────────────────

interface BadgeProps {
  text: string;
  color?: 'green' | 'amber' | 'red' | 'gray';
  size?: 'xs' | 'sm';
}

const BADGE_COLORS: Record<NonNullable<BadgeProps['color']>, string> = {
  green: 'bg-green-100 text-green-700 border border-green-200',
  amber: 'bg-amber-100 text-amber-700 border border-amber-200',
  red:   'bg-red-100   text-red-700   border border-red-200',
  gray:  'bg-gray-100  text-gray-600  border border-gray-200',
};

export function Badge({ text, color = 'gray', size = 'sm' }: BadgeProps) {
  const sizeClass = size === 'xs' ? 'px-[6px] py-[1px] text-[9px]' : 'px-[8px] py-[2px] text-[10px]';
  return (
    <span className={`inline-flex items-center rounded-full font-bold ${sizeClass} ${BADGE_COLORS[color]}`}>
      {text}
    </span>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────

interface AvatarProps {
  name: string;
  role?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Avatar({ name, size = 'md' }: AvatarProps) {
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  
  let sizeClasses = 'w-10 h-10 text-sm';
  if (size === 'sm') sizeClasses = 'w-8 h-8 text-xs';
  else if (size === 'lg') sizeClasses = 'w-20 h-20 text-3xl';

  return (
    <div className={`${sizeClasses} shrink-0 rounded-full bg-[#1D9E75]/10 flex items-center justify-center text-[#1D9E75] font-bold border border-[#1D9E75]/20`}>
      {initials}
    </div>
  );
}
