import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Info } from 'lucide-react';
import Button from '../components/Button';
import ProgressBar from '../components/ProgressBar';
import type { AssessmentBooking } from '../types';

interface AssessmentBookingScreenProps {
  onBack: () => void;
  onConfirm: (data: AssessmentBooking) => void;
  initialData?: any;
}

export default function AssessmentBookingScreen({ onBack, onConfirm, initialData }: AssessmentBookingScreenProps) {
  const [preferredTime, setPreferredTime] = useState(initialData?.preferred_time || 'Morning');
  const [showConfirmBack, setShowConfirmBack] = useState(false);

  const timeOptions = [
    { label: 'Morning', window: '9am–12pm' },
    { label: 'Afternoon', window: '12pm–5pm' },
    { label: 'Evening', window: '5pm–8pm' }
  ];

  const steps = [
    { number: 1, title: 'Assessment call', desc: 'Within 24 hours of sign-up', active: true },
    { number: 2, title: 'Trainer matched', desc: 'Based on your goals and health profile', active: false },
    { number: 3, title: 'Program begins', desc: 'Review and approve your initial goals', active: false }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-200 items-center justify-center p-4">
      {/* Device Frame */}
      <div className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden relative h-[800px] flex flex-col border-[12px] border-[#1E293B]">

        {/* Top Bar */}
        <header className="flex items-center px-4 py-4 bg-white sticky top-0 z-20">
          <button
            onClick={() => setShowConfirmBack(true)}
            className="p-1 -ml-1 text-text-primary relative z-50"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex-1 flex justify-center -ml-6">
            <h1 className="text-primary font-bold text-xl tracking-tight">WellnessConnect</h1>
          </div>
        </header>

        {/* Progress Bar */}
        <ProgressBar currentStep={3} totalSteps={4} />

        {/* Main Content */}
        <main className="flex-1 px-6 pb-32 space-y-8 overflow-y-auto scrollbar-hide pt-2">

          {/* Info Card */}
          <section className="bg-white border-l-[3px] border-primary shadow-sm rounded-r-xl p-5 border-y border-r border-border-light">
            <div className="flex gap-3">
              <div className="text-primary mt-0.5">
                <Info size={18} />
              </div>
              <div className="space-y-3">
                <h2 className="text-[13px] font-medium text-text-primary">Our assessment team will contact you</h2>
                <p className="text-[12px] text-text-secondary leading-[1.6]">
                  A certified assessment expert will call you within 24 hours to
                  conduct your detailed health profile review. This helps us match
                  you with the best trainer for your goals.
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-[11px] font-medium text-primary tracking-tight">Assessment is free and takes 15–20 minutes</span>
                </div>
              </div>
            </div>
          </section>

          {/* Preferred Time Selection */}
          <section className="space-y-4">
            <h2 className="label-caps !text-[11px] text-text-secondary uppercase tracking-wider font-semibold">Preferred contact time</h2>
            <div className="flex flex-col gap-3">
              {timeOptions.map((option) => (
                <button
                  key={option.label}
                  onClick={() => setPreferredTime(option.label)}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all ${preferredTime === option.label
                      ? 'border-primary bg-green-light/30 ring-1 ring-primary'
                      : 'border-border-light bg-input-bg text-text-secondary'
                    }`}
                >
                  <div className="flex flex-col items-start translate-y-[-1px]">
                    <span className={`text-[13px] font-semibold ${preferredTime === option.label ? 'text-primary' : 'text-text-primary'}`}>
                      {option.label}
                    </span>
                    <span className="text-[11px] opacity-70">{option.window}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${preferredTime === option.label ? 'border-primary bg-primary' : 'border-border'
                    }`}>
                    {preferredTime === option.label && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* What Happens Next */}
          <section className="space-y-4 pt-2">
            <h2 className="label-caps !text-[11px] text-text-secondary uppercase tracking-wider font-semibold">What happens next</h2>
            <div className="space-y-6 relative">
              {/* Connecting Line */}
              <div className="absolute left-[13px] top-4 bottom-4 w-[1px] bg-border-light" />

              {steps.map((step) => (
                <div key={step.number} className="flex gap-4 relative z-10">
                  <div className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[12px] font-bold border-2 shrink-0 ${step.active
                      ? 'bg-primary border-primary text-white'
                      : 'bg-white border-border-light text-text-secondary'
                    }`}>
                    {step.number}
                  </div>
                  <div className="flex flex-col mt-0.5">
                    <h3 className={`text-[13px] font-semibold ${step.active ? 'text-text-primary' : 'text-text-secondary opacity-60'}`}>
                      {step.title}
                    </h3>
                    <p className="text-[11px] text-text-secondary opacity-80 mt-0.5 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </main>

        {/* CTA Button */}
        <div className="absolute bottom-0 w-full p-6 bg-white z-10 rounded-b-[2rem] border-t border-gray-100 pb-10">
          <Button
            onClick={() => onConfirm({ preferred_time: preferredTime, status: 'confirmed' })}
          >
            Confirm & finish
          </Button>
        </div>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {showConfirmBack && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] flex items-center justify-center px-6 bg-black/40"
              onClick={() => setShowConfirmBack(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full bg-white rounded-2xl p-6 shadow-xl"
                onClick={e => e.stopPropagation()}
              >
                <h3 className="text-lg font-bold mb-2">Go back?</h3>
                <p className="text-text-secondary text-sm mb-6 leading-relaxed">
                  Progress on this step will be lost.
                </p>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setShowConfirmBack(false)}
                    className="flex-1 py-3.5 border border-gray-300 rounded-xl text-sm font-medium text-text-primary"
                  >
                    Stay
                  </button>
                  <button
                    onClick={() => {
                      setShowConfirmBack(false);
                      onBack();
                    }}
                    className="flex-1 py-3.5 bg-[#DC2626] text-white rounded-xl text-sm font-semibold shadow-sm active:scale-[0.98] transition-all"
                  >
                    Go back
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
