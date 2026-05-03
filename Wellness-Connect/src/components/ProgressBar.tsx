interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  title?: string;
}

export default function ProgressBar({ currentStep, totalSteps, title }: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (currentStep / totalSteps) * 100));
  
  return (
    <>
      <div className="w-full h-1 bg-border-light">
        <div 
          className="h-full bg-primary transition-all duration-500" 
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="px-6 py-4 text-[13px] text-text-secondary">
        Step {currentStep} of {totalSteps}{title ? ` — ${title}` : ''}
      </p>
    </>
  );
}
