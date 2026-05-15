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

export default function SignUpScreen() {
  const navigate = useNavigate();
  const { appState, handleSignUpSuccess } = useWellness();
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

    setIsLoading(true);
    setOtpError('');

    if (import.meta.env.DEV) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setIsOtpSent(true);
      setIsLoading(false);
      setTimer(30);
      return;
    }

    // PRODUCTION: real phone OTP (requires Twilio setup)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: formData.mobile,
      });
      if (error) throw error;
      setIsOtpSent(true);
      setTimer(30);
    } catch (err: unknown) {
      setOtpError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
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

  const handleVerifyOtp = async (inputOtp: string) => {
    setIsLoading(true);
    setOtpError('');

    if (import.meta.env.DEV) {
      if (inputOtp !== '123456') {
        setOtpError('Dev mode: use 123456 to continue');
        const newAttempts = otpAttempts + 1;
        setOtpAttempts(newAttempts);
        if (newAttempts >= 3) {
          setOtpError('Too many attempts. Please request a new OTP.');
        }
        setOtp(['', '', '', '', '', '']);
        otpRefs.current[0]?.focus();
        setIsLoading(false);
        return;
      }

      try {
        const devEmail = `dev_${formData.mobile.replace(/\D/g, '')}@wellnessconnect.dev`;
        const devPassword = 'DevPassword123!';

        // Step 1: Always attempt signup (ignore duplicate error)
        await supabase.auth.signUp({ email: devEmail, password: devPassword });
        // Ignore error — user may already exist, that's fine

        // Step 2: Always attempt signin
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({ email: devEmail, password: devPassword });

        if (signInError) throw signInError;
        const userId = signInData.user?.id ?? null;
        if (!userId) throw new Error('Could not get user ID');

        // WellnessContext.onAuthStateChange auto-populates userId/supabaseUser
        // on SIGNED_IN — no explicit context call needed here.
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
        setTimeout(() => navigate('/role-selection'), 800);
      } catch (err: unknown) {
        setOtpError(err instanceof Error ? err.message : 'Dev auth failed');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // PRODUCTION: real phone OTP verification
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formData.mobile,
        token: inputOtp,
        type: 'sms',
      });
      if (error) throw error;
      if (!data.user) throw new Error('Verification failed');
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
      setTimeout(() => navigate('/role-selection'), 800);
    } catch (err: unknown) {
      const newAttempts = otpAttempts + 1;
      setOtpAttempts(newAttempts);
      if (newAttempts >= 3) {
        setOtpError('Too many attempts. Please request a new OTP.');
      } else {
        setOtpError(err instanceof Error ? err.message : 'Invalid OTP');
      }
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isOtpSent && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isOtpSent, timer]);

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
            placeholder="10-digit mobile number"
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
                <p className="text-[13px] text-text-primary text-center font-medium">Enter 6-digit OTP sent to your mobile</p>
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
                    <p className="text-xs text-text-secondary">Resend OTP in 0:{timer < 10 ? `0${timer}` : timer}</p>
                  ) : (
                    <button
                      onClick={handleSendOtp}
                      className="text-primary text-xs font-semibold hover:underline"
                      disabled={isLoading || otpAttempts >= 3}
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                {otpError && (
                  <div className="flex items-center justify-center gap-1.5 text-red">
                    <AlertTriangle size={14} />
                    <p className="text-[11px] font-medium">{otpError}</p>
                  </div>
                )}

                {import.meta.env.DEV && (
                  <p style={{ color: '#9ca3af', fontSize: '12px', textAlign: 'center', marginTop: '8px' }}>
                    Dev mode · Enter 123456 to continue
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
