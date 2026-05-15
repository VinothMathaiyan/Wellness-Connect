import { useRef, useState, type ChangeEvent } from 'react';
import { ChevronLeft, ShieldCheck, Upload, FileText, Camera, Images, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { StepProps, UploadedFile } from './TrainerOnboardingFlow';
import { validateStep4 } from '../../hooks/useTrainerOnboarding';
import OnboardingLayout from '../../../client/components/OnboardingLayout';
import Button from '../../../../components/Button';
import ProgressBar from '../../../../components/ProgressBar';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const CERT_ACCEPT = '.pdf,.jpg,.jpeg,.png';
const SELFIE_ACCEPT = 'image/jpeg,image/jpg,image/png';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TrainerVerificationStep({
  data,
  updateData,
  onNext,
  onBack,
  currentStep,
  totalSteps,
}: StepProps) {
  const certInputRef = useRef<HTMLInputElement>(null);
  const selfieCameraRef = useRef<HTMLInputElement>(null);
  const selfieGalleryRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  const readFile = (
    file: File,
    onSuccess: (uploaded: UploadedFile) => void,
    onError: (msg: string) => void
  ) => {
    if (file.size > MAX_FILE_SIZE) {
      onError(`File must be under 5 MB (this file is ${formatBytes(file.size)})`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onSuccess({
        name: file.name,
        size: file.size,
        mimeType: file.type,
        dataUrl: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleCertChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    readFile(
      file,
      uploaded => {
        updateData({ certificationDocument: uploaded });
        setErrors(prev => ({ ...prev, certificationDocument: '' }));
        setSubmitError('');
      },
      msg => setErrors(prev => ({ ...prev, certificationDocument: msg }))
    );
  };

  const handleSelfieChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    readFile(
      file,
      uploaded => {
        updateData({ selfieWithCertificate: uploaded });
        setErrors(prev => ({ ...prev, selfieWithCertificate: '' }));
      },
      msg => setErrors(prev => ({ ...prev, selfieWithCertificate: msg }))
    );
  };

  const handleNext = () => {
    const e = validateStep4(data);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      setSubmitError(e.certificationDocument ?? 'Please fix the errors above');
      return;
    }
    onNext();
  };

  const certDoc = data.certificationDocument;
  const selfie = data.selfieWithCertificate;
  const isPdf = certDoc?.mimeType === 'application/pdf';

  return (
    <OnboardingLayout
      header={
        <>
          <header className="flex items-center px-4 py-4">
            <button
              type="button"
              onClick={onBack}
              className="p-1 -ml-1 text-text-primary relative z-50"
            >
              <ChevronLeft size={24} />
            </button>
            <div className="flex-1 flex justify-center -ml-6">
              <h1 className="text-primary font-bold text-xl tracking-tight">
                WellnessConnect
              </h1>
            </div>
          </header>
          <ProgressBar
            currentStep={currentStep}
            totalSteps={totalSteps}
            title="verify your credentials"
          />
        </>
      }
      footer={
        <Button onClick={handleNext}>
          {currentStep === totalSteps ? 'Complete Setup' : 'Continue'}
        </Button>
      }
      useStandardPadding={false}
    >
      <div className="px-6 pt-4 pb-32 space-y-8">
        <p className="label-caps !text-[11px] text-text-secondary pt-2">
          Section 4 — Professional Verification
        </p>

        {/* Info Banner */}
        <div className="bg-blue-light/50 border border-blue/10 p-4 rounded-xl flex gap-3">
          <ShieldCheck size={18} className="text-blue shrink-0 mt-0.5" />
          <p className="text-[12px] text-blue leading-relaxed font-medium">
            Helping clients feel confident in their trainer. Your documents are
            reviewed privately and never shown publicly.
          </p>
        </div>

        {/* ── Certification Document ─────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-[13px] font-medium text-text-primary">
              Certification document
            </label>
            <span className="text-[10px] text-text-secondary font-medium px-2 py-0.5 bg-input-bg rounded-md">
              Optional
            </span>
          </div>
          <p className="text-[12px] text-text-secondary -mt-1">
            Upload a photo or scan of your professional certification.
          </p>

          {/* Hidden input */}
          <input
            ref={certInputRef}
            type="file"
            accept={CERT_ACCEPT}
            className="hidden"
            onChange={handleCertChange}
          />

          <AnimatePresence mode="wait">
            {certDoc ? (
              <motion.div
                key="cert-filled"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-3 bg-green-light/40 border border-primary/15 rounded-2xl p-4"
              >
                {isPdf ? (
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText size={20} className="text-primary" />
                  </div>
                ) : (
                  <img
                    src={certDoc.dataUrl}
                    alt="Certificate preview"
                    className="w-11 h-11 rounded-xl object-cover shrink-0 border border-gray-200"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-text-primary truncate">
                    {certDoc.name}
                  </p>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    {formatBytes(certDoc.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    updateData({ certificationDocument: null });
                    setErrors(prev => ({ ...prev, certificationDocument: '' }));
                  }}
                  className="p-1.5 rounded-lg text-text-secondary hover:text-red hover:bg-red-light/50 transition-colors shrink-0"
                  aria-label="Remove certification document"
                >
                  <X size={16} />
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="cert-empty"
                type="button"
                onClick={() => certInputRef.current?.click()}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className={`w-full flex flex-col items-center gap-3 py-8 border-2 border-dashed rounded-2xl transition-all active:scale-[0.98] ${
                  errors.certificationDocument
                    ? 'border-red bg-red-light/10'
                    : 'border-primary/30 bg-green-light/20 hover:bg-green-light/40 hover:border-primary/50'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    errors.certificationDocument ? 'bg-red-light' : 'bg-primary/10'
                  }`}
                >
                  <Upload
                    size={22}
                    className={
                      errors.certificationDocument ? 'text-red' : 'text-primary'
                    }
                  />
                </div>
                <div className="text-center">
                  <p
                    className={`text-[13px] font-semibold ${
                      errors.certificationDocument
                        ? 'text-red'
                        : 'text-text-primary'
                    }`}
                  >
                    Tap to upload
                  </p>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    PDF, JPG or PNG · Max 5 MB
                  </p>
                </div>
              </motion.button>
            )}
          </AnimatePresence>

          {errors.certificationDocument && (
            <p className="text-red text-[11px]">{errors.certificationDocument}</p>
          )}
        </div>

        {/* ── Selfie with Certificate ────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-[13px] font-medium text-text-primary">
              Selfie with certificate
            </label>
            <span className="text-[10px] text-text-secondary font-medium px-2 py-0.5 bg-input-bg rounded-md">
              Optional
            </span>
          </div>
          <p className="text-[12px] text-text-secondary -mt-1">
            A photo of you holding your certificate builds extra trust with clients.
          </p>

          {/* Hidden inputs — camera and gallery separate */}
          <input
            ref={selfieCameraRef}
            type="file"
            accept={SELFIE_ACCEPT}
            capture="user"
            className="hidden"
            onChange={handleSelfieChange}
          />
          <input
            ref={selfieGalleryRef}
            type="file"
            accept={SELFIE_ACCEPT}
            className="hidden"
            onChange={handleSelfieChange}
          />

          <AnimatePresence mode="wait">
            {selfie ? (
              <motion.div
                key="selfie-filled"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.18 }}
                className="relative rounded-2xl overflow-hidden border border-gray-200"
              >
                <img
                  src={selfie.dataUrl}
                  alt="Selfie with certificate"
                  className="w-full h-44 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                  <p className="text-white text-[12px] font-medium drop-shadow truncate pr-2">
                    {selfie.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => updateData({ selfieWithCertificate: null })}
                    className="p-1.5 rounded-lg bg-black/40 text-white hover:bg-black/60 transition-colors shrink-0"
                    aria-label="Remove selfie"
                  >
                    <X size={14} />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="selfie-empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-2 gap-3"
              >
                <button
                  type="button"
                  onClick={() => selfieCameraRef.current?.click()}
                  className="flex items-center justify-center gap-2 py-4 rounded-2xl border border-gray-200 bg-white text-[12px] font-medium text-text-primary hover:border-primary hover:text-primary hover:bg-green-light/20 transition-all active:scale-[0.98]"
                >
                  <Camera size={16} />
                  Take a selfie
                </button>
                <button
                  type="button"
                  onClick={() => selfieGalleryRef.current?.click()}
                  className="flex items-center justify-center gap-2 py-4 rounded-2xl border border-gray-200 bg-white text-[12px] font-medium text-text-primary hover:border-primary hover:text-primary hover:bg-green-light/20 transition-all active:scale-[0.98]"
                >
                  <Images size={16} />
                  From gallery
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {errors.selfieWithCertificate && (
            <p className="text-red text-[11px]">{errors.selfieWithCertificate}</p>
          )}
        </div>

        {/* Submit-level error */}
        {submitError && (
          <div className="bg-red-light/30 border border-red/20 p-3.5 rounded-xl">
            <p className="text-red text-[12px] font-medium text-center">
              {submitError}
            </p>
          </div>
        )}
      </div>
    </OnboardingLayout>
  );
}
