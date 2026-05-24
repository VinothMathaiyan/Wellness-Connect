import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Users, User, Activity, Clock, Check } from 'lucide-react';
import MobileShell from '../../../components/MobileShell';
import Button from '../../../components/Button';
import { useWellness } from '../../../context/WellnessContext';
import { isTrainerOnboardingComplete } from '../../../services/supabaseService';

const SETUP_STEPS = [
  {
    Icon: User,
    title: 'Professional Profile',
    description: 'Photo, certification name, years of experience, and your bio.',
  },
  {
    Icon: Activity,
    title: 'Expertise & Matching',
    description: 'Specialisations, session types, and languages you work in.',
  },
  {
    Icon: Clock,
    title: 'Weekly Availability',
    description: 'The days and times you are open for client sessions.',
  },
];

const CAPABILITIES = [
  'Monitor client wellness progress',
  'Guide personalised interventions',
  'Prescribe and manage wellness plans',
  'Be discovered by matched clients',
];

export default function TrainerWelcomeScreen() {
  const navigate = useNavigate();
  const { userId } = useWellness();

  // Guard: if this trainer already completed onboarding (e.g. direct URL navigation
  // or a back-button press after submission), skip straight to the dashboard.
  useEffect(() => {
    if (!userId) return;
    isTrainerOnboardingComplete(userId).then(complete => {
      if (complete) navigate('/trainer/dashboard', { replace: true });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <MobileShell>
      {/* Wordmark */}
      <div className="py-6 flex justify-center mt-4 shrink-0">
        <h1 className="text-primary font-bold text-xl tracking-tight">
          WellnessConnect
        </h1>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-28 scrollbar-hide">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="pt-2 pb-8"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-light text-primary text-[12px] font-semibold mb-5">
            <Users size={12} />
            Trainer
          </span>

          <h2 className="text-[26px] font-bold text-text-primary leading-snug mb-3">
            Welcome to<br />WellnessConnect
          </h2>

          <p className="text-[14px] text-text-secondary leading-relaxed">
            You're joining as a certified trainer. Help clients build lasting
            habits, monitor their progress, and guide them through their
            wellness journey.
          </p>
        </motion.div>

        {/* Setup Steps */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="mb-6"
        >
          <p className="label-caps !text-[11px] text-text-secondary mb-4">
            What you'll set up
          </p>

          <div className="space-y-3">
            {SETUP_STEPS.map(({ Icon, title, description }, i) => (
              <div
                key={title}
                className="flex items-start gap-4 bg-white border border-gray-200 rounded-2xl p-4"
              >
                <div className="w-10 h-10 rounded-xl bg-green-light flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-text-secondary/40 tabular-nums">
                      0{i + 1}
                    </span>
                    <p className="text-[13px] font-semibold text-text-primary">
                      {title}
                    </p>
                  </div>
                  <p className="text-[12px] text-text-secondary leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Capabilities */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.16 }}
          className="bg-white border border-gray-200 rounded-2xl p-5 mb-2"
        >
          <p className="label-caps !text-[11px] text-text-secondary mb-4">
            As a trainer, you'll
          </p>

          <div className="space-y-3">
            {CAPABILITIES.map(cap => (
              <div key={cap} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-green-light flex items-center justify-center shrink-0">
                  <Check size={11} strokeWidth={2.5} className="text-primary" />
                </div>
                <p className="text-[13px] text-text-primary">{cap}</p>
              </div>
            ))}
          </div>
        </motion.div>

      </div>

      {/* Sticky CTA */}
      <div className="absolute bottom-0 w-full p-6 bg-white z-10 border-t border-gray-100">
        <Button onClick={() => navigate('/trainer/onboarding')}>
          Get Started
        </Button>
      </div>
    </MobileShell>
  );
}
