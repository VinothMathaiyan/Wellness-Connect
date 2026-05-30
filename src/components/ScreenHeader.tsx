import React from 'react';
import { ChevronLeft, Zap } from 'lucide-react';
import { useWellness } from '../context/WellnessContext';

type HeaderVariant = 'hero' | 'sub';

interface ScreenHeaderProps {
  variant: HeaderVariant;
  title?: string;
  greeting?: string;
  subtitle?: React.ReactNode;
  onBack?: () => void;
  avatar?: React.ReactNode;
  children?: React.ReactNode; // For filter tabs, etc.
}

const GRADIENTS: Record<string, string> = {
  trainer: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
  assessor: 'linear-gradient(135deg, #0d9488 0%, #7c3aed 100%)',
};

export default function ScreenHeader({
  variant,
  title,
  greeting,
  subtitle,
  onBack,
  avatar,
  children,
}: ScreenHeaderProps) {
  const { userRole } = useWellness();
  const effectiveRole = userRole || 'client';

  if (variant === 'hero') {
    return (
      <div 
        className="relative px-5 pt-10 pb-7 rounded-b-3xl overflow-hidden shadow-md text-white"
        style={{ background: GRADIENTS[effectiveRole] || GRADIENTS.trainer }}
      >
        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute bottom-0 -left-6 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Zap size={15} className="text-white" />
            </div>
            <span className="font-bold text-[15px] tracking-tight">WellnessConnect</span>
          </div>
          <div className="flex items-center gap-2.5">
            {avatar}
          </div>
        </div>

        <div className="relative z-10 mt-2">
          <h1 className="text-[22px] font-bold tracking-tight leading-tight mb-1">
            {greeting}
          </h1>
          {subtitle && (
            <div className="text-white/80 text-[13px] font-medium">
              {subtitle}
            </div>
          )}
        </div>
        {children}
      </div>
    );
  }

  // variant === 'sub'
  return (
    <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-5 pt-10 pb-4 shadow-sm">
      <div className="flex items-center gap-3 min-h-[40px]">
        {onBack ? (
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-700 active:scale-95 transition-transform shrink-0"
          >
            <ChevronLeft size={24} />
          </button>
        ) : (
          <div className="w-10 h-10 shrink-0" /> // spacer for alignment when no back button
        )}
        
        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-xl font-bold text-gray-900 leading-tight truncate">{title}</h1>
          {subtitle && <div className="text-sm font-medium text-gray-500 mt-0.5">{subtitle}</div>}
        </div>
        
        <div className="shrink-0 flex items-center justify-end min-w-[40px]">
          {avatar}
        </div>
      </div>
      {children}
    </div>
  );
}
