import type { ReactNode } from 'react';

interface MobileShellProps {
  children: ReactNode;
  className?: string;
}

export default function MobileShell({ children, className = '' }: MobileShellProps) {
  return (
    <div className={`max-w-md mx-auto w-full min-h-screen relative shadow-xl bg-gray-50 flex flex-col overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
