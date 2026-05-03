import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  containerClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ error, className = '', containerClassName = '', ...props }, ref) => {
  return (
    <div className={`w-full ${containerClassName}`}>
      <input
        ref={ref}
        className={`input-field ${
          error 
            ? '!border-red focus:!border-red ring-1 ring-red/20' 
            : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="text-red text-[11px] mt-1.5 ml-1">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
