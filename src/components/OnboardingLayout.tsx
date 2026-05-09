import type { ReactNode } from 'react';
import MobileShell from './MobileShell';

interface OnboardingLayoutProps {
    children: ReactNode;
    header: ReactNode;
    footer: ReactNode;
    bottomNavigation?: ReactNode;
    /** Standardize content spacing rhythm, defaults to true */
    useStandardPadding?: boolean;
}

/**
 * Standardized mobile layout for Onboarding and Assessment screens.
 * Provides unified spacing, scroll behavior, and safe-area footer positioning.
 */
export default function OnboardingLayout({ 
    children, 
    header, 
    footer,
    bottomNavigation,
    useStandardPadding = true 
}: OnboardingLayoutProps) {
    return (
        <MobileShell className="bg-[#F9FAFB]">
            {/* Sticky Header Layer */}
            <div className="shrink-0 bg-white sticky top-0 z-20 shadow-sm">
                {header}
            </div>

            {/* Scrollable Content Layer */}
            {/* Matches HealthProfileScreen spacing rhythm: px-6, pt-2 space-y-10 */}
            <div className={`flex-1 overflow-y-auto scrollbar-hide ${useStandardPadding ? 'px-6 pt-2 pb-32 space-y-10' : ''}`}>
                {children}
            </div>

            {/* Sticky Footer Layer */}
            {/* Standardizes bottom safe-area spacing and horizontal margins */}
            <div className="bg-white border-t border-gray-100 px-6 pt-4 pb-8 sm:pb-10 shrink-0 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                {footer}
            </div>

            {bottomNavigation && (
                <div className="shrink-0 z-50">
                    {bottomNavigation}
                </div>
            )}
        </MobileShell>
    );
}
