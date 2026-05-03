import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isLoading?: boolean;
  isSuccess?: boolean;
  successIcon?: ReactNode;
}

export default function Button({ 
  children, 
  isLoading, 
  isSuccess, 
  successIcon = <CheckCircle2 color="white" size={18} />, 
  className = '', 
  disabled,
  ...props 
}: ButtonProps) {
  const isDisabled = disabled || isLoading;
  return (
    <button
      disabled={isDisabled}
      className={`w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all ${
        isDisabled 
          ? 'bg-[#95D5C2] opacity-80 cursor-not-allowed grayscale' 
          : 'bg-primary hover:bg-[#009287] shadow-lg shadow-primary/20 active:scale-[0.98]'
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="animate-spin" size={18} />
      ) : isSuccess ? (
        successIcon
      ) : (
        children
      )}
    </button>
  );
}
