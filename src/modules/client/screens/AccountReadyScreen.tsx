import { useState } from 'react';
import { motion } from 'motion/react';
import { Copy, Check } from 'lucide-react';
import Button from "../../../components/Button";
import ProgressBar from "../../../components/ProgressBar";
import MobileShell from '../../../components/MobileShell';



function generateClientId() {
  const currentYear = new Date().getFullYear();
  const randomValues = new Uint32Array(1);
  crypto.getRandomValues(randomValues);
  const randomNum = 10000 + (randomValues[0] % 90000);
  return `WC-${currentYear}-${randomNum}`;
}

import { useNavigate } from 'react-router-dom';
import { useWellness } from '../../../context/WellnessContext';

export default function AccountReadyScreen() {
  const navigate = useNavigate();
  void navigate;
  const { appState } = useWellness();
  const userData = {
    full_name: appState.full_name ?? '',
    goals_json: appState.goals ?? [],
    fitness_level: appState.fitness_level ?? '',
  };
  const [copied, setCopied] = useState(false);

  const firstName = userData.full_name?.split(' ')[0] || 'User';
  const [clientId] = useState(generateClientId);

  // ── Summary of everything the user entered during signup ──────────────────
  // Read straight from WellnessContext app state so every selection made on the
  // Sign Up, Health Profile and Assessment Booking steps is echoed back here.
  const PLACEHOLDER = 'Not provided';

  const age = (() => {
    if (!appState.dob) return null;
    const birth = new Date(appState.dob);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let a = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
    return a;
  })();

  const heightDisplay = appState.height_value
    ? `${appState.height_value} ${appState.height_unit ?? 'cm'}`
    : null;
  const weightDisplay = appState.weight_value
    ? `${appState.weight_value} ${appState.weight_unit ?? 'kg'}`
    : null;

  const prefs = appState.training_preferences;
  const trainingStyles = prefs?.training_styles ?? [];
  const preferredTimes = prefs?.preferred_times ?? [];

  // Single-value rows shown with the same labels as the input screens.
  const summaryRows: { label: string; value: string }[] = [
    { label: 'Name', value: userData.full_name || PLACEHOLDER },
    { label: 'Mobile number', value: appState.mobile || PLACEHOLDER },
    {
      label: 'Date of birth',
      value: appState.dob
        ? `${appState.dob}${age !== null ? ` (${age} yrs)` : ''}`
        : PLACEHOLDER,
    },
    { label: 'Gender', value: appState.gender || PLACEHOLDER },
    { label: 'Height', value: heightDisplay || PLACEHOLDER },
    { label: 'Weight', value: weightDisplay || PLACEHOLDER },
    { label: 'City', value: appState.city || PLACEHOLDER },
    { label: 'How you prefer to train', value: prefs?.session_mode || PLACEHOLDER },
    { label: 'Preferred contact time', value: appState.preferred_time || PLACEHOLDER },
  ];

  // Multi-value (chip) rows.
  const chipRows: { label: string; values: string[] }[] = [
    { label: 'Fitness goals', values: userData.goals_json.filter(Boolean) },
    { label: 'Training styles', values: trainingStyles },
    { label: 'When you are available', values: preferredTimes },
  ];

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
    navigate('/client/dashboard');
  };

  return (
    <MobileShell>
      {/* Device Frame — matches all other screens */}
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

          {/* Summary of selections — echoes back everything entered in signup */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="w-full bg-white border border-border-light rounded-xl p-5 text-left shadow-sm space-y-4"
          >
            <p className="label-caps text-[10px] text-text-secondary opacity-60 tracking-widest">
              Summary of selections
            </p>

            <div className="divide-y divide-border-light">
              {summaryRows.map(row => (
                <div key={row.label} className="flex items-start justify-between gap-4 py-2.5">
                  <span className="text-[12px] text-text-secondary shrink-0">{row.label}</span>
                  <span
                    className={`text-[12px] font-medium text-right ${
                      row.value === PLACEHOLDER ? 'text-text-secondary opacity-50' : 'text-text-primary'
                    }`}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-1">
              {chipRows.map(row => (
                <div key={row.label} className="space-y-1.5">
                  <span className="text-[12px] text-text-secondary">{row.label}</span>
                  {row.values.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {row.values.map(v => (
                        <span
                          key={v}
                          className="px-3 py-1.5 bg-green-light text-primary text-[11px] font-semibold rounded-full border border-primary/15"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px] font-medium text-text-secondary opacity-50">{PLACEHOLDER}</p>
                  )}
                </div>
              ))}
            </div>
          </motion.section>

        </main>

        {/* CTA Button */}
        <div className="absolute bottom-0 w-full p-6 bg-white z-10 border-t border-gray-100 pb-10">
          <Button onClick={handleGoToDashboard}>
            Go to dashboard
          </Button>
        </div>

    </MobileShell>
  );
}
