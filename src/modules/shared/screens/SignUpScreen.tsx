import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Check, Pencil, ShieldCheck, Lock, ArrowRight, Activity } from 'lucide-react';
import Button from '../../../components/Button';
import MobileShell from '../../../components/MobileShell';



import { useNavigate } from 'react-router-dom';
import { useWellness } from '../../../context/WellnessContext';
import { supabase } from '../../../lib/supabaseClient';
import { isTrainerOnboardingComplete, getPreRegisteredRole, linkAuthUserToProfile, getProfileForAuth } from '../../../services/supabaseService';
import { IS_DEV_OTP, normalisePhone, validatePhone, validateOtp } from '@/utils/otpUtils';

// Display helper — formats a raw 10-digit string as "98765 43210".
// Storage stays digits-only; this is presentation only.
const formatPhoneDisplay = (digits: string) => {
  const d = digits.replace(/\D/g, '').slice(0, 10);
  return d.length <= 5 ? d : `${d.slice(0, 5)} ${d.slice(5)}`;
};

export default function SignUpScreen() {
  const navigate = useNavigate();
  const { appState, handleSignUpSuccess, setUserRole } = useWellness();
  const initialData = appState;
  // Form State — OTP-based auth only needs the phone to authenticate. Name and
  // email are collected later, in onboarding, and only for new users.
  const [formData, setFormData] = useState({
    mobile: initialData?.mobile || '',
    consent: initialData?.data_consent || false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isTouched, setIsTouched] = useState<Record<string, boolean>>({});
  const [mobileFocused, setMobileFocused] = useState(false);

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
      case 'mobile':
        if (!value || typeof value !== 'string' || !/^\d{10}$/.test(value)) {
          return "Please enter a valid 10-digit mobile number";
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
    validateField('mobile', formData.mobile) === "" &&
    formData.consent === true;

  const hasPreviouslyVerified = !!initialData?.consentTimestamp;
  const isMobileUnchanged = initialData?.mobile === formData.mobile;
  const canSkipOtp = hasPreviouslyVerified && isMobileUnchanged;

  // OTP Handlers
  const handleSendOtp = async () => {
    if (!isFormValid) {
      // Show validation errors if they somehow bypassed disabled state
      setIsTouched({ mobile: true, consent: true });
      setErrors({
        mobile: validateField('mobile', formData.mobile),
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

  // ── Edit phone — step back from the code panel to correct the number.
  // Additive to the original (which offered no way back); resets OTP state only.
  const handleEditPhone = () => {
    if (isLoading) return;
    setIsOtpSent(false);
    setOtp(['', '', '', '', '', '']);
    setOtpError('');
    setOtpAttempts(0);
    setResendConfirm(false);
    setTimer(30);
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
        mobile: formData.mobile,
        consentTimestamp: new Date().toISOString(),
        privacy_accepted: true,
        medical_disclaimer: true,
        data_consent: true,
        ipLogged: true,
      });
      setTimeout(() => navigate('/assessment/dashboard', { replace: true }), 800);
      return;
    }

    // auth.uid is the identity. A non-null profile means a returning user;
    // null means a brand-new user who still needs role selection / onboarding.
    const profile = await getProfileForAuth(userId);

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
      mobile: formData.mobile,
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

  const mobileError = isTouched.mobile && errors.mobile;

  return (
    <MobileShell className="bg-white">
      {/* Body — hero, phone field, consent, inline OTP. Scrolls if needed; CTA is pinned. */}
      <div className="flex-1 flex flex-col px-6 pt-14 pb-28 overflow-y-auto">

        {/* Brand + value proposition (fills the formerly-empty top third) */}
        <div className="flex flex-col items-start gap-4">
          <div
            className="w-14 h-14 rounded-[16px] flex items-center justify-center shadow-lg shadow-primary/30"
            style={{ background: 'linear-gradient(150deg, #00A99D 0%, #007E75 100%)' }}
          >
            <Activity color="white" size={26} strokeWidth={2.4} />
          </div>
          <div>
            <h1 className="text-[27px] leading-[1.12] font-bold tracking-tight text-text-primary">
              {isOtpSent ? 'Enter your code' : <>Your wellness,<br />one number away.</>}
            </h1>
            <p className="text-[14.5px] text-text-secondary leading-relaxed mt-2 max-w-[300px]">
              {isOtpSent
                ? 'We just texted a 6-digit code to your number below.'
                : "Sign in with your mobile number. We'll text a one-time code — no passwords to remember."}
            </p>
          </div>
        </div>

        {/* Phone number field */}
        <div className="mt-7">
          <label htmlFor="mobile" className="block text-[12px] font-semibold tracking-wide text-text-primary mb-2">
            Mobile number
          </label>
          <div className="flex items-stretch gap-2">
            {/* Country chip (+91) */}
            <div className="flex items-center gap-1.5 h-14 px-3.5 rounded-[14px] bg-input-bg border border-border-light text-[16px] font-semibold text-text-primary select-none">
              <span
                className="w-[22px] h-4 rounded-[3px] overflow-hidden shadow-[0_0_0_1px_rgba(0,0,0,0.06)]"
                aria-hidden
                style={{ display: 'flex', flexDirection: 'column' }}
              >
                <i style={{ display: 'block', width: '100%', height: '33.33%', background: '#FF9933' }} />
                <i style={{ display: 'flex', width: '100%', height: '33.34%', background: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                  <i style={{ display: 'block', width: '5px', height: '5px', borderRadius: '9999px', border: '1px solid #0A3A8B', boxSizing: 'border-box' }} />
                </i>
                <i style={{ display: 'block', width: '100%', height: '33.33%', background: '#138808' }} />
              </span>
              +91
            </div>

            {/* Number input — confirmed & tap-to-edit once the code is sent */}
            <div
              className={`relative flex-1 min-w-0 ${isOtpSent ? 'cursor-pointer' : ''}`}
              onClick={isOtpSent ? handleEditPhone : undefined}
            >
              <input
                id="mobile"
                type="tel"
                inputMode="numeric"
                maxLength={11}
                placeholder="00000 00000"
                value={formatPhoneDisplay(formData.mobile)}
                onChange={(e) => handleChange('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                onFocus={() => setMobileFocused(true)}
                onBlur={() => { setMobileFocused(false); handleBlur('mobile'); }}
                readOnly={isOtpSent}
                disabled={isOtpSent}
                className={`w-full h-14 rounded-[14px] border bg-white px-4 text-[18px] font-semibold tracking-wide text-text-primary outline-none transition-all
                  ${isOtpSent
                    ? 'border-primary bg-[#E6F3F0] text-text-secondary pr-16'
                    : mobileError
                      ? 'border-red ring-4 ring-red/10'
                      : mobileFocused
                        ? 'border-primary ring-4 ring-primary/10'
                        : 'border-border-light'}`}
              />
              {isOtpSent && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                  <Check size={16} className="text-primary" strokeWidth={2.6} />
                  <span className="w-[26px] h-[26px] rounded-full bg-primary/10 flex items-center justify-center">
                    <Pencil size={13} className="text-primary" />
                  </span>
                </span>
              )}
            </div>
          </div>
          {mobileError && (
            <p className="flex items-center gap-1.5 text-red text-[12.5px] mt-2.5">
              <AlertTriangle size={13} /> {errors.mobile}
            </p>
          )}
        </div>

        {/* Consent — compact single line (phone step only) */}
        {!isOtpSent && (
          <div className="mt-5">
            <label htmlFor="consent" className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                id="consent"
                className="peer sr-only"
                checked={formData.consent}
                onChange={(e) => handleChange('consent', e.target.checked)}
              />
              <span className="mt-px w-[22px] h-[22px] rounded-[7px] border border-border flex items-center justify-center flex-none transition-colors peer-checked:bg-primary peer-checked:border-primary">
                {formData.consent && <Check size={13} color="white" strokeWidth={3} />}
              </span>
              <span className="text-[12.5px] text-text-secondary leading-relaxed">
                I agree to the{' '}
                <span className="text-primary font-semibold hover:underline">Privacy Policy</span> &{' '}
                <span className="text-primary font-semibold hover:underline">Medical Disclaimer</span>.
              </span>
            </label>
            {isTouched.consent && errors.consent && (
              <p className="text-red text-[11px] mt-1.5 ml-[34px]">{errors.consent}</p>
            )}
          </div>
        )}

        {/* OTP entry — revealed inline on the same screen */}
        <AnimatePresence>
          {isOtpSent && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-6"
            >
              <label className="block text-[12px] font-semibold tracking-wide text-text-primary mb-2">
                6-digit code
              </label>
              <div className="flex justify-between gap-2">
                {otp.map((digit, i) => {
                  const filled = digit !== '';
                  return (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="tel"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className={`flex-1 min-w-0 h-[58px] text-center rounded-[13px] border text-[24px] font-bold text-text-primary outline-none transition-all
                        ${filled ? 'border-primary bg-[#E6F3F0]' : 'border-border-light bg-white'}
                        focus:border-primary focus:ring-4 focus:ring-primary/10`}
                      disabled={isLoading || otpAttempts >= 3}
                    />
                  );
                })}
              </div>

              {otpError && (
                <div className="flex items-center gap-1.5 text-red mt-3">
                  <AlertTriangle size={14} />
                  <p className="text-[12.5px] font-medium">{otpError}</p>
                </div>
              )}

              {/* Resend */}
              <div className="mt-4 flex items-center gap-1.5 text-[13px] text-text-secondary">
                {timer > 0 ? (
                  <span>Resend code in <strong className="text-text-primary font-semibold">{formatTimer(timer)}</strong></span>
                ) : (
                  <>
                    <span>Didn't get it?</span>
                    <button
                      onClick={handleResendOtp}
                      className="text-primary font-semibold hover:underline disabled:text-gray-400"
                      disabled={isLoading || otpAttempts >= 3}
                    >
                      Resend code
                    </button>
                  </>
                )}
                {resendConfirm && <span className="text-primary font-medium ml-1">· Sent ✓</span>}
              </div>

              {IS_DEV_OTP && (
                <p className="text-gray-400 text-[12px] mt-3">Dev mode — enter 123456 to continue</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trust microcopy, pushed to the bottom of the scroll area */}
        <div className="flex-1" />
        <div className="flex items-center justify-center gap-1.5 text-text-secondary text-[12px] font-medium pt-4">
          {isOtpSent ? <ShieldCheck size={14} /> : <Lock size={13} />}
          <span>
            {isOtpSent ? 'Protected by end-to-end encryption' : 'Your consent is recorded with a timestamp'}
          </span>
        </div>
      </div>

      {/* CTA — pinned to the bottom */}
      <div className="absolute bottom-0 w-full p-6 bg-white z-10 border-t border-gray-100">
        <Button
          onClick={isOtpSent ? () => handleVerifyOtp(otp.join('')) : handleSendOtp}
          disabled={isOtpSent ? otp.some(d => d === '') : !isFormValid}
          isLoading={isLoading}
          isSuccess={isSuccess}
        >
          {isOtpSent
            ? <>Verify &amp; continue</>
            : canSkipOtp
              ? 'Continue'
              : <>Send code <ArrowRight size={18} /></>}
        </Button>
      </div>
    </MobileShell>
  );
}
