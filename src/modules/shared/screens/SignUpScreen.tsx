import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import ProgressBar from '../../../components/ProgressBar';
import MobileShell from '../../../components/MobileShell';



import { useNavigate } from 'react-router-dom';
import { useWellness } from '../../../context/WellnessContext';
import { supabase } from '../../../lib/supabaseClient';
import { isTrainerOnboardingComplete, getPreRegisteredRole, linkAuthUserToProfile } from '../../../services/supabaseService';
import { IS_DEV_OTP, normalisePhone, validatePhone, validateOtp } from '@/utils/otpUtils';

export default function SignUpScreen() {
  const navigate = useNavigate();
  const { appState, handleSignUpSuccess, setUserRole } = useWellness();
  const initialData = appState;
  // Form State
  const [formData, setFormData] = useState({
    full_name: initialData?.full_name || '',
    mobile: initialData?.mobile || '',
    email: initialData?.email || '',
    consent: initialData?.data_consent || false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isTouched, setIsTouched] = useState<Record<string, boolean>>({});

  // OTP State
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [otpError, setOtpError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resendConfirm, setResendConfirm] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Validation Logic based on Excel rules
  const validateField = (name: string, value: string | boolean) => {
    switch (name) {
      case 'full_name':
        if (!value || typeof value !== 'string' || value.length < 2 || !/^[a-zA-Z\s]+$/.test(value)) {
          return "Please enter your full name";
        }
        return "";
      case 'mobile':
        if (!value || typeof value !== 'string' || !/^\d{10}$/.test(value)) {
          return "Please enter a valid 10-digit mobile number";
        }
        return "";
      case 'email':
        if (!value) return ""; // Non-mandatory
        if (typeof value === 'string' && !/\S+@\S+\.\S+/.test(value)) {
          return "Please enter a valid email address";
        }
        return "";
      case 'consent':
        if (!value) {
          return "You must agree to the Privacy Policy and Medical Disclaimer";
        }
        return "";
      default:
        return "";
    }
  };

  const handleBlur = (name: string) => {
    setIsTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, formData[name as keyof typeof formData]);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleChange = (name: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (isTouched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const isFormValid =
    validateField('full_name', formData.full_name) === "" &&
    validateField('mobile', formData.mobile) === "" &&
    validateField('email', formData.email) === "" &&
    formData.consent === true;

  const hasPreviouslyVerified = !!initialData?.consentTimestamp;
  const isMobileUnchanged = initialData?.mobile === formData.mobile;
  const canSkipOtp = hasPreviouslyVerified && isMobileUnchanged;

  // OTP Handlers
  const handleSendOtp = async () => {
    if (!isFormValid) {
      // Show validation errors if they somehow bypassed disabled state
      setIsTouched({ full_name: true, mobile: true, email: true, consent: true });
      setErrors({
        full_name: validateField('full_name', formData.full_name),
        mobile: validateField('mobile', formData.mobile),
        email: validateField('email', formData.email),
        consent: validateField('consent', formData.consent)
      });
      return;
    }

    // Phone-shape validation before attempting to send
    const phoneError = validatePhone(formData.mobile);
    if (phoneError) {
      setIsTouched(prev => ({ ...prev, mobile: true }));
      setErrors(prev => ({ ...prev, mobile: phoneError }));
      return;
    }

    if (canSkipOtp) {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief simulated loading
      setIsSuccess(true);
      setTimeout(() => {
        handleSignUpSuccess({ ...initialData, ...formData });
        navigate('/role-selection');
      }, 500);
      return;
    }

    const phone = normalisePhone(formData.mobile);

    setIsLoading(true);
    setOtpError('');

    // Dev bypass — no real SMS; "123456" is accepted on the OTP step
    if (IS_DEV_OTP) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setIsOtpSent(true);
      setIsLoading(false);
      setTimer(60);
      return;
    }

    // Real Twilio SMS via Supabase Phone Auth
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) {
      let message: string;
      if (error.message.includes('Invalid phone')) {
        message = "This number isn't valid. Check and try again.";
      } else if (error.message.includes('rate limit') || error.status === 429) {
        message = 'Too many attempts. Please wait a few minutes.';
      } else if (error.message.includes('SMS')) {
        message = "Couldn't send SMS. Check the number and try again.";
      } else {
        message = 'Something went wrong. Please try again.';
      }
      setIsTouched(prev => ({ ...prev, mobile: true }));
      setErrors(prev => ({ ...prev, mobile: message }));
      setIsLoading(false);
      return;
    }

    setIsOtpSent(true);
    setIsLoading(false);
    setTimer(60);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Check completion
    if (newOtp.every(digit => digit !== '')) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // ── Shared post-auth navigation — identical for dev bypass and real Twilio ──
  // Fetch existing profile to determine where this user belongs:
  // New users have no profile row → role-selection.
  // Returning trainers/clients/assessors → skip role-selection entirely.
  const completeSignIn = async (userId: string) => {
    // Admin pre-registration check (runs BEFORE the normal profile lookup).
    // A phone pre-registered via the Admin Portal skips role selection and
    // lands directly on its destination.
    const preRegPhone = normalisePhone(formData.mobile);
    const preRegRole = await getPreRegisteredRole(preRegPhone);
    if (preRegRole === 'assessor') {
      await linkAuthUserToProfile(userId, preRegPhone);
      setUserRole('assessor');
      setIsLoading(false);
      setIsSuccess(true);
      handleSignUpSuccess({
        full_name: formData.full_name,
        mobile: formData.mobile,
        email: formData.email,
        consentTimestamp: new Date().toISOString(),
        privacy_accepted: true,
        medical_disclaimer: true,
        data_consent: true,
        ipLogged: true,
      });
      setTimeout(() => navigate('/assessment/dashboard', { replace: true }), 800);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name, city, specialties')
      .eq('id', userId)
      .maybeSingle();

    // Decide destination before triggering the success animation
    let destination = '/role-selection';
    if (profile?.role === 'trainer') {
      const complete = await isTrainerOnboardingComplete(userId);
      destination = complete ? '/trainer/dashboard' : '/trainer/onboarding';
      setUserRole('trainer');
    } else if (profile?.role === 'client') {
      // Always land clients on the pending screen; the AssessmentGate in
      // App.tsx forwards already-cleared clients straight to the dashboard.
      destination = '/client/pending';
      setUserRole('client');
    } else if (profile?.role === 'assessor') {
      destination = '/assessment/dashboard';
      setUserRole('assessor');
    }
    // else: no profile row (new user) — stays '/role-selection', userRole stays null

    setIsLoading(false);
    setIsSuccess(true);
    handleSignUpSuccess({
      full_name: formData.full_name,
      mobile: formData.mobile,
      email: formData.email,
      consentTimestamp: new Date().toISOString(),
      privacy_accepted: true,
      medical_disclaimer: true,
      data_consent: true,
      ipLogged: true,
    });
    setTimeout(() => navigate(destination, { replace: true }), 800);
  };

  const handleVerifyOtp = async (inputOtp: string) => {
    setIsLoading(true);
    setOtpError('');

    // OTP format validation
    const otpFormatError = validateOtp(inputOtp);
    if (otpFormatError) {
      setOtpError(otpFormatError);
      setIsLoading(false);
      return;
    }

    const phone = normalisePhone(formData.mobile);

    // Dev bypass — accept "123456" and sign in via a dev email user
    if (IS_DEV_OTP) {
      if (inputOtp !== '123456') {
        const newAttempts = otpAttempts + 1;
        setOtpAttempts(newAttempts);
        setOtpError(newAttempts >= 3 ? 'Too many attempts. Please request a new OTP.' : 'Enter 123456 to continue');
        setOtp(['', '', '', '', '', '']);
        otpRefs.current[0]?.focus();
        setIsLoading(false);
        return;
      }

      try {
        const devEmail = `dev_${formData.mobile.replace(/\D/g, '')}@wellnessconnect.dev`;
        const devPassword = 'DevPassword123!';

        await supabase.auth.signUp({ email: devEmail, password: devPassword });

        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({ email: devEmail, password: devPassword });

        if (signInError) throw signInError;
        const userId = signInData.user?.id ?? null;
        if (!userId) throw new Error('Could not get user ID');

        await completeSignIn(userId);
      } catch (err: unknown) {
        setOtpError(err instanceof Error ? err.message : 'Auth failed');
        setIsLoading(false);
      }
      return;
    }

    // Real Twilio SMS verification via Supabase Phone Auth
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: inputOtp,
        type: 'sms',
      });
      if (error) {
        if (error.message.includes('expired')) {
          setOtpError('OTP has expired. Go back and request a new one.');
        } else if (error.message.includes('invalid') || error.message.includes('Invalid')) {
          setOtpError('Incorrect OTP. Please check and try again.');
        } else if (error.message.includes('rate limit') || error.status === 429) {
          setOtpError('Too many attempts. Please wait a few minutes.');
        } else {
          setOtpError('Verification failed. Please try again.');
        }
        setOtp(['', '', '', '', '', '']);
        otpRefs.current[0]?.focus();
        setIsLoading(false);
        return;
      }

      const userId = data.user?.id ?? data.session?.user?.id ?? null;
      if (!userId) throw new Error('Could not get user ID');

      await completeSignIn(userId);
    } catch (err: unknown) {
      setOtpError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
      setIsLoading(false);
    }
  };

  // ── Resend OTP — re-sends only (never runs skip/navigation), resets 60s timer ──
  const handleResendOtp = async () => {
    if (timer > 0 || isLoading) return;
    setOtpError('');
    setResendConfirm(false);
    setOtp(['', '', '', '', '', '']);
    setOtpAttempts(0);

    const phone = normalisePhone(formData.mobile);

    if (IS_DEV_OTP) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setTimer(60);
      setResendConfirm(true);
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setIsLoading(false);
    if (error) {
      setOtpError(
        error.status === 429 || error.message.includes('rate limit')
          ? 'Too many attempts. Please wait a few minutes.'
          : "Couldn't resend OTP. Please try again.",
      );
      return;
    }
    setTimer(60);
    setResendConfirm(true);
  };

  // Countdown display helper — "1:00", "0:45", etc.
  const formatTimer = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${seconds % 60 < 10 ? `0${seconds % 60}` : seconds % 60}`;

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isOtpSent && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isOtpSent, timer]);

  // Masked phone for the OTP panel — keep country code + last 4 visible, hide the rest
  const normalisedPhone = normalisePhone(formData.mobile);
  const maskedPhone = `${normalisedPhone.slice(0, 3)} ${'•'.repeat(Math.max(0, normalisedPhone.length - 7))}${normalisedPhone.slice(-4)}`;

  return (
    <MobileShell>

        {/* Wordmark */}
        <div className="py-6 flex justify-center mt-4">
          <h1 className="text-primary font-bold text-xl tracking-tight">WellnessConnect</h1>
        </div>

        <ProgressBar currentStep={1} totalSteps={4} />

        {/* Form Section */}
        <div className="flex-1 px-6 pt-2 pb-28 overflow-y-auto space-y-4">
          <Input
            type="text"
            placeholder="Full name"
            value={formData.full_name}
            onChange={(e) => handleChange('full_name', e.target.value)}
            onBlur={() => handleBlur('full_name')}
            disabled={isOtpSent}
            error={errors.full_name}
          />

          <Input
            type="tel"
            placeholder="10-digit mobile number (+91)"
            value={formData.mobile}
            onChange={(e) => handleChange('mobile', e.target.value)}
            onBlur={() => handleBlur('mobile')}
            disabled={isOtpSent}
            error={errors.mobile}
          />

          <Input
            type="email"
            placeholder="Email address"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            disabled={isOtpSent}
            error={errors.email}
          />

          {/* Consent Block */}
          <div className="pt-3 flex items-start gap-3">
            <input
              type="checkbox"
              id="consent"
              className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
              checked={formData.consent}
              onChange={(e) => handleChange('consent', e.target.checked)}
              disabled={isOtpSent}
            />
            <div>
              <label htmlFor="consent" className="text-[12px] text-text-secondary leading-relaxed cursor-pointer select-none block">
                By continuing you agree to our{' '}
                <span className="text-primary font-medium hover:underline">Privacy Policy</span> and{' '}
                <span className="text-primary font-medium hover:underline">Medical Disclaimer</span>.{' '}
                Your consent will be recorded with a timestamp.
              </label>
              {isTouched.consent && errors.consent && <p className="text-red text-[11px] mt-1.5">{errors.consent}</p>}
            </div>
          </div>

          {/* OTP Entry UI */}
          <AnimatePresence>
            {isOtpSent && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-[#E6F3F0] p-5 rounded-xl space-y-4 mt-6"
              >
                <p className="text-[13px] text-text-primary text-center font-medium">We sent a code to {maskedPhone}</p>
                <div className="flex justify-between gap-2 px-1">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="tel"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-10 h-12 text-center bg-white border border-gray-300 rounded-lg text-lg font-semibold focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                      disabled={isLoading || otpAttempts >= 3}
                    />
                  ))}
                </div>

                <div className="text-center">
                  {timer > 0 ? (
                    <p className="text-xs text-text-secondary">Resend OTP in {formatTimer(timer)}</p>
                  ) : (
                    <button
                      onClick={handleResendOtp}
                      className="text-primary text-xs font-semibold hover:underline"
                      disabled={isLoading || otpAttempts >= 3}
                    >
                      Resend OTP
                    </button>
                  )}
                  {resendConfirm && (
                    <p className="text-primary text-[11px] font-medium mt-1">OTP resent ✓</p>
                  )}
                </div>

                {otpError && (
                  <div className="flex items-center justify-center gap-1.5 text-red">
                    <AlertTriangle size={14} />
                    <p className="text-[11px] font-medium">{otpError}</p>
                  </div>
                )}

                {IS_DEV_OTP && (
                  <p style={{ color: '#9ca3af', fontSize: '12px', textAlign: 'center', marginTop: '8px' }}>
                    Enter 123456 to continue
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CTA Button */}
        <div className="absolute bottom-0 w-full p-6 bg-white z-10 border-t border-gray-100">
          <Button
            onClick={handleSendOtp}
            disabled={!isFormValid || isOtpSent}
            isLoading={isLoading}
            isSuccess={isSuccess}
          >
            {canSkipOtp ? "Continue" : "Send OTP & continue"}
          </Button>
        </div>
    </MobileShell>
  );
}
