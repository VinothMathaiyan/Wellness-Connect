/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

interface SignUpScreenProps {
  onSuccess: (data: { 
    full_name: string; 
    mobile: string; 
    email: string;
    privacy_accepted: boolean;
    medical_disclaimer: boolean;
    data_consent: boolean;
  }) => void;
}

export default function SignUpScreen({ onSuccess }: SignUpScreenProps) {
  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    mobile: '',
    email: '',
    consent: false
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
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    setIsOtpSent(true);
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
      verifyOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const verifyOtp = async (inputOtp: string) => {
    setIsLoading(true);
    setOtpError('');
    // Simulate verification
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);

    if (inputOtp === '123456') { // Mock success OTP
      setIsSuccess(true);
      const consentData = {
        ...formData,
        consentTimestamp: new Date().toISOString(),
        privacy_accepted: true,
        medical_disclaimer: true,
        data_consent: true,
        ipLogged: true
      };
      setTimeout(() => onSuccess(consentData as any), 1000);
    } else {
      const newAttempts = otpAttempts + 1;
      setOtpAttempts(newAttempts);
      if (newAttempts >= 3) {
        setOtpError("Too many attempts. Please request a new OTP.");
      } else {
        setOtpError("Please enter a valid OTP");
      }
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOtpSent && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isOtpSent, timer]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-200 items-center justify-center p-4">
      {/* Device Frame matching PNG layout */}
      <div className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden relative h-[800px] flex flex-col border-[12px] border-[#1E293B]">
        
        {/* Wordmark */}
        <div className="py-6 flex justify-center mt-4">
          <h1 className="text-[#00A99D] font-bold text-xl tracking-tight">WellnessConnect</h1>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-gray-200">
          <div className="h-full bg-[#00A99D] w-1/4 transition-all duration-500" />
        </div>
        <p className="px-6 py-4 text-[13px] text-gray-500">Step 1 of 4</p>

        {/* Form Section */}
        <div className="flex-1 px-6 pt-2 pb-28 overflow-y-auto space-y-4">
          <div>
            <input
              type="text"
              placeholder="Full name"
              className={`w-full px-4 py-3.5 rounded-lg border ${errors.full_name ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20' : 'border-gray-300 focus:border-[#00A99D] focus:ring-1 focus:ring-[#00A99D]'} bg-[#F8F9FA] focus:bg-white outline-none transition-all placeholder-gray-400 text-gray-800 text-[15px]`}
              value={formData.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
              onBlur={() => handleBlur('full_name')}
              disabled={isOtpSent}
            />
            {errors.full_name && <p className="text-red-500 text-[11px] mt-1.5 ml-1">{errors.full_name}</p>}
          </div>

          <div>
            <input
              type="tel"
              placeholder="10-digit mobile number"
              className={`w-full px-4 py-3.5 rounded-lg border ${errors.mobile ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20' : 'border-gray-300 focus:border-[#00A99D] focus:ring-1 focus:ring-[#00A99D]'} bg-[#F8F9FA] focus:bg-white outline-none transition-all placeholder-gray-400 text-gray-800 text-[15px]`}
              value={formData.mobile}
              onChange={(e) => handleChange('mobile', e.target.value)}
              onBlur={() => handleBlur('mobile')}
              disabled={isOtpSent}
            />
            {errors.mobile && <p className="text-red-500 text-[11px] mt-1.5 ml-1">{errors.mobile}</p>}
          </div>

          <div>
            <input
              type="email"
              placeholder="Email address"
              className={`w-full px-4 py-3.5 rounded-lg border ${errors.email ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/20' : 'border-gray-300 focus:border-[#00A99D] focus:ring-1 focus:ring-[#00A99D]'} bg-[#F8F9FA] focus:bg-white outline-none transition-all placeholder-gray-400 text-gray-800 text-[15px]`}
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              disabled={isOtpSent}
            />
            {errors.email && <p className="text-red-500 text-[11px] mt-1.5 ml-1">{errors.email}</p>}
          </div>

          {/* Consent Block */}
          <div className="pt-3 flex items-start gap-3">
            <input 
              type="checkbox" 
              id="consent"
              className="mt-1 w-4 h-4 text-[#00A99D] border-gray-300 rounded focus:ring-[#00A99D] cursor-pointer"
              checked={formData.consent}
              onChange={(e) => handleChange('consent', e.target.checked)}
              disabled={isOtpSent}
            />
            <div>
              <label htmlFor="consent" className="text-[12px] text-gray-500 leading-relaxed cursor-pointer select-none block">
                By continuing you agree to our{' '}
                <span className="text-[#00A99D] font-medium hover:underline">Privacy Policy</span> and{' '}
                <span className="text-[#00A99D] font-medium hover:underline">Medical Disclaimer</span>.{' '}
                Your consent will be recorded with a timestamp.
              </label>
              {isTouched.consent && errors.consent && <p className="text-red-500 text-[11px] mt-1.5">{errors.consent}</p>}
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
                <p className="text-[13px] text-gray-700 text-center font-medium">Enter 6-digit OTP sent to your mobile</p>
                <div className="flex justify-between gap-2 px-1">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="tel"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-10 h-12 text-center bg-white border border-gray-300 rounded-lg text-lg font-semibold focus:border-[#00A99D] focus:ring-1 focus:ring-[#00A99D] outline-none transition-colors"
                      disabled={isLoading || otpAttempts >= 3}
                    />
                  ))}
                </div>

                <div className="text-center">
                  {timer > 0 ? (
                    <p className="text-xs text-gray-500">Resend OTP in 0:{timer < 10 ? `0${timer}` : timer}</p>
                  ) : (
                    <button 
                      onClick={handleSendOtp}
                      className="text-[#00A99D] text-xs font-semibold hover:underline"
                      disabled={isLoading || otpAttempts >= 3}
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                {otpError && (
                  <div className="flex items-center justify-center gap-1.5 text-red-500">
                    <AlertTriangle size={14} />
                    <p className="text-[11px] font-medium">{otpError}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CTA Button */}
        <div className="absolute bottom-0 w-full p-6 bg-white z-10 rounded-b-[2rem] border-t border-gray-100">
          <button
            onClick={handleSendOtp}
            disabled={!isFormValid || isOtpSent || isLoading}
            className={`w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all ${
              (!isFormValid || isOtpSent || isLoading) ? 'bg-[#95D5C2] opacity-80 cursor-not-allowed' : 'bg-[#7ECBAF] hover:bg-[#68BEA0]'
            }`}
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : isSuccess ? (
              <CheckCircle2 color="white" size={18} />
            ) : (
              "Send OTP & continue"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
