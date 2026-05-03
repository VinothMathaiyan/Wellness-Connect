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
