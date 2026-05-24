import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Users, Check, Loader2 } from 'lucide-react';
import MobileShell from '../../../components/MobileShell';
import Button from '../../../components/Button';
import { useWellness } from '../../../context/WellnessContext';
import { supabase } from '../../../lib/supabaseClient';
import { isTrainerOnboardingComplete } from '../../../services/supabaseService';

type SelectedRole = 'client' | 'trainer';

const ROLES = [
  {
    id: 'client' as SelectedRole,
    Icon: Activity,
    title: 'Client',
    description: 'Track wellness, habits, nutrition, and daily progress.',
    destination: '/onboarding/profile',
  },
  {
    id: 'trainer' as SelectedRole,
    Icon: Users,
    title: 'Trainer',
    description: 'Monitor clients, manage interventions, and prescribe wellness plans.',
    destination: '/trainer/welcome',
  },
];

export default function RoleSelectionScreen() {
  const navigate = useNavigate();
  const { setAppState, userId, userRole, appState } = useWellness();
  const [selectedRole, setSelectedRole] = useState<SelectedRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect assessors before the role-selection UI ever renders.
  // Uses userRole from WellnessContext (set by SignUpScreen at login time
  // via setUserRole('assessor')) instead of querying profiles directly —
  // a direct profiles SELECT triggers the recursive RLS policy and 500s.
  useEffect(() => {
    if (!userId) return;
    if (userRole === 'assessor') {
      navigate('/assessment/dashboard', { replace: true });
    }
  }, [userId, userRole, navigate]);

  const handleRoleSelect = async (role: SelectedRole) => {
    const target = ROLES.find(r => r.id === role)!;
    setIsLoading(true);

    try {
      console.log('Upserting profile:', {
        id: userId, role, full_name: appState.full_name
      });

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          role,
          full_name: appState.full_name ?? '',
          phone_number: appState.mobile ?? '',
        }, { onConflict: 'id' });

      if (error) throw error;

      setAppState(prev => ({ ...prev, userRole: role }));

      // Trainers who already completed onboarding go straight to the dashboard.
      // New trainers (or those with an incomplete profile) continue to /trainer/welcome.
      if (role === 'trainer' && userId) {
        const complete = await isTrainerOnboardingComplete(userId);
        navigate(complete ? '/trainer/dashboard' : target.destination);
        return;
      }
    } catch (err) {
      console.error('Failed to save role:', err);
      // Still navigate — dev flow must not be blocked by a DB write failure
    } finally {
      setIsLoading(false);
    }

    navigate(target.destination);
  };

  return (
    <MobileShell>
      {/* Wordmark */}
      <div className="py-6 flex justify-center mt-4">
        <h1 className="text-primary font-bold text-xl tracking-tight">WellnessConnect</h1>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pt-2 pb-28 overflow-y-auto">
        <div className="pt-6 pb-8 text-center">
          <h2 className="text-[22px] font-bold text-text-primary leading-snug">
            How will you use the app?
          </h2>
          <p className="text-text-secondary text-sm mt-2 leading-relaxed">
            Choose the role that best describes you to get started.
          </p>
        </div>

        <div className="space-y-4">
          {ROLES.map(({ id, Icon, title, description }) => {
            const isSelected = selectedRole === id;
            return (
              <motion.button
                key={id}
                onClick={() => !isLoading && setSelectedRole(id)}
                whileTap={isLoading ? {} : { scale: 0.98 }}
                disabled={isLoading}
                className={`w-full text-left p-5 rounded-2xl border-2 bg-white transition-colors duration-200 ${
                  isSelected
                    ? 'border-primary shadow-md shadow-primary/10'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                } ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
                      isSelected ? 'bg-primary' : 'bg-gray-100'
                    }`}
                  >
                    <Icon
                      size={22}
                      className={isSelected ? 'text-white' : 'text-gray-500'}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-semibold text-[15px] ${
                        isSelected ? 'text-primary' : 'text-text-primary'
                      }`}
                    >
                      {title}
                    </p>
                    <p className="text-text-secondary text-[13px] mt-0.5 leading-relaxed">
                      {description}
                    </p>
                  </div>

                  {isLoading && isSelected ? (
                    <Loader2 size={20} className="flex-shrink-0 text-primary animate-spin" />
                  ) : (
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                          className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                        >
                          <Check size={13} strokeWidth={2.5} className="text-white" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="absolute bottom-0 w-full p-6 bg-white z-10 border-t border-gray-100">
        <Button
          onClick={() => selectedRole && handleRoleSelect(selectedRole)}
          disabled={!selectedRole || isLoading}
          isLoading={isLoading}
        >
          Continue
        </Button>
      </div>
    </MobileShell>
  );
}
