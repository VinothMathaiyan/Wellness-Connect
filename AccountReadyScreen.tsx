import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Copy, Check } from 'lucide-react';
import Button from './src/components/Button';
import ProgressBar from './src/components/ProgressBar';

interface AccountReadyScreenProps {
  /** full_name is collected in Screen 1 (SignUpScreen) as formData.full_name */
  userData: {
    full_name: string;
    /** goals_json is mapped from appState.goals (HealthProfile.goals) in App.tsx */
    goals_json: string[];
    fitness_level: string;
  };
  onGoToDashboard: (clientId: string) => void;
}

export default function AccountReadyScreen({ userData, onGoToDashboard }: AccountReadyScreenProps) {
  const [copied, setCopied] = useState(false);

  const firstName = userData.full_name?.split(' ')[0] || 'User';
  const currentYear = new Date().getFullYear();

  // Generate a stable mock client ID for this session
  const clientId = useMemo(() => {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `WC-${currentYear}-${randomNum}`;
  }, [currentYear]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(clientId).catch(() => {
      // Fallback for environments where clipboard API is unavailable
      const el = document.createElement('textarea');
      el.value = clientId;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoToDashboard = () => {
    console.log('Navigating to Dashboard with Client ID:', clientId);
    onGoToDashboard(clientId);
  };

  // Defensive: filter out empty strings from goals_json
  const goals = (userData.goals_json ?? []).filter(Boolean);

  return (
    <div className="flex flex-col min-h-screen bg-gray-200 items-center justify-center p-4">
      {/* Device Frame — matches all other screens */}
      <div className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden relative h-[800px] flex flex-col border-[12px] border-[#1E293B]">

        {/* Header — no back button on completion screen */}
        <header className="flex items-center px-4 py-4 bg-white sticky top-0 z-20 justify-center">
          <h1 className="text-primary font-bold text-xl tracking-tight">WellnessConnect</h1>
        </header>

        {/* Progress Bar — step 4/4 = 100% */}
        <ProgressBar currentStep={4} totalSteps={4} title="Account ready" />

        {/* Main Content */}
        <main className="flex-1 px-6 flex flex-col items-center justify-center text-center space-y-7 pb-32 overflow-y-auto scrollbar-hide">

          {/* Celebration Header */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            className="space-y-4"
          >
            <div className="text-[52px]">🎉</div>
            <h2 className="text-[20px] font-bold text-text-primary leading-tight">
              You're all set, {firstName}!
            </h2>
            <p className="text-[13px] text-text-secondary leading-relaxed max-w-[270px] mx-auto">
              Your profile is created! 🚀 Our assessment team will call you{' '}
              within 24 hours for a quick health review. Once confirmed,{' '}
              you'll be able to select your trainer and start your journey.
            </p>
          </motion.div>

          {/* Client ID Card */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="w-full bg-white border border-border-light rounded-xl p-5 text-left shadow-sm"
          >
            <p className="text-[11px] text-text-secondary mb-2 uppercase tracking-wider font-semibold">
              Your unique client ID
            </p>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[20px] font-bold text-primary tracking-tight font-mono">
                {clientId}
              </span>
              <div className="relative shrink-0">
                <button
                  onClick={copyToClipboard}
                  aria-label="Copy client ID"
                  className="p-2 bg-input-bg rounded-lg text-text-secondary active:scale-90 transition-transform hover:bg-gray-200"
                >
                  {copied
                    ? <Check size={18} className="text-primary" />
                    : <Copy size={18} />
                  }
                </button>
                {copied && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -top-9 left-1/2 -translate-x-1/2 bg-text-primary text-white text-[10px] px-2.5 py-1 rounded-lg whitespace-nowrap shadow-md"
                  >
                    Copied!
                  </motion.div>
                )}
              </div>
            </div>
          </motion.section>

          {/* Summary Chips */}
          {(goals.length > 0 || userData.fitness_level) && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="w-full flex flex-col items-center gap-3"
            >
              <p className="label-caps text-[10px] text-text-secondary opacity-60 tracking-widest">
                Summary of selections
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {goals.map((goal: string) => (
                  <span
                    key={goal}
                    className="px-3 py-1.5 bg-green-light text-primary text-[11px] font-semibold rounded-full border border-primary/15"
                  >
                    {goal}
                  </span>
                ))}
                {userData.fitness_level && (
                  <span className="px-3 py-1.5 bg-input-bg text-text-secondary text-[11px] font-semibold rounded-full border border-border-light">
                    {userData.fitness_level}
                  </span>
                )}
              </div>
            </motion.div>
          )}

        </main>

        {/* CTA Button */}
        <div className="absolute bottom-0 w-full p-6 bg-white z-10 rounded-b-[2rem] border-t border-gray-100 pb-10">
          <Button onClick={handleGoToDashboard}>
            Go to dashboard
          </Button>
        </div>

      </div>
    </div>
  );
}
