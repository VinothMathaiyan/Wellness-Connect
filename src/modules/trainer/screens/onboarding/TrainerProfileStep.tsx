import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { ChevronLeft, Camera, Images, Check, X, Upload, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { StepProps } from './TrainerOnboardingFlow';
import { validateStep1, BIO_MIN, BIO_MAX } from '../../hooks/useTrainerOnboarding';
import OnboardingLayout from '../../../client/components/OnboardingLayout';
import Button from '../../../../components/Button';
import Input from '../../../../components/Input';
import ProgressBar from '../../../../components/ProgressBar';

const CERT_SUGGESTIONS = ['NASM-CPT', 'RYT 200', 'RYT 500', 'CSCS', 'ACE-CPT', 'ACSM'];
const MAX_CERT_SIZE = 5 * 1024 * 1024; // 5 MB

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Resize and compress to JPEG. Returns original dataUrl on any failure.
async function compressImage(
  dataUrl: string,
  maxDimension = 800,
  quality = 0.85
): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (Math.max(width, height) > maxDimension) {
        if (width >= height) {
          height = Math.round((height / width) * maxDimension);
          width = maxDimension;
        } else {
          width = Math.round((width / height) * maxDimension);
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(dataUrl); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export default function TrainerProfileStep({
  data,
  updateData,
  onNext,
  onBack,
  currentStep,
  totalSteps,
}: StepProps) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const certInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // Wire the media stream to the video element once the overlay is shown
  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraOpen]);

  // Release camera track on unmount
  useEffect(() => () => stopStream(), []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const openCamera = async () => {
    setCameraError('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera not supported in this browser. Please use the Gallery option.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch (err) {
      const name = (err as DOMException).name;
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraError('Camera access was denied. Please allow camera access in your browser settings.');
      } else if (name === 'NotFoundError') {
        setCameraError('No camera found on this device. Please use the Gallery option.');
      } else {
        setCameraError('Could not start camera. Please try using the Gallery option.');
      }
    }
  };

  const closeCamera = () => {
    stopStream();
    setCameraOpen(false);
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror horizontally to match the mirrored preview (front camera)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    const raw = canvas.toDataURL('image/jpeg', 1.0);
    const compressed = await compressImage(raw);
    updateData({ photoUrl: compressed });
    setErrors(prev => ({ ...prev, photo: '' }));
    closeCamera();
    setShowPhotoOptions(false);
  };

  const handleGalleryChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = async () => {
      const compressed = await compressImage(reader.result as string);
      updateData({ photoUrl: compressed });
      setErrors(prev => ({ ...prev, photo: '' }));
      setShowPhotoOptions(false);
    };
    reader.readAsDataURL(file);
  };

  const touch = (field: string) =>
    setTouched(prev => ({ ...prev, [field]: true }));

  const handleNext = () => {
    setTouched({ photo: true, certificationName: true, yearsOfExperience: true, bio: true });
    const e = validateStep1(data);
    setErrors(e);
    if (Object.keys(e).length === 0) onNext();
  };

  const handleCertDocChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (file.size > MAX_CERT_SIZE) {
      setErrors(prev => ({ ...prev, certificationDocument: `File must be under 5 MB (this file is ${formatBytes(file.size)})` }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateData({
        certificationDocument: {
          name: file.name,
          size: file.size,
          mimeType: file.type,
          dataUrl: reader.result as string,
        },
      });
      setErrors(prev => ({ ...prev, certificationDocument: '' }));
    };
    reader.readAsDataURL(file);
  };

  const certDoc = data.certificationDocument;
  const isCertPdf = certDoc?.mimeType === 'application/pdf';
  const bioLength = data.bio.length;
  const bioTrimLen = data.bio.trim().length;
  const bioCountColor =
    bioLength > BIO_MAX
      ? 'bg-red-light text-red'
      : bioTrimLen >= BIO_MIN
      ? 'bg-green-light text-primary'
      : 'bg-input-bg text-text-secondary';

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
            title="build your professional profile"
          />
        </>
      }
      footer={<Button onClick={handleNext}>Continue</Button>}
      useStandardPadding={false}
    >
      <div className="px-6 pt-4 pb-32 space-y-8">
        <p className="label-caps !text-[11px] text-text-secondary pt-2">
          Section 1 — Profile &amp; Trust
        </p>

        {/* ── Profile Photo ─────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3">
          {/* Gallery-only hidden input */}
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleGalleryChange}
          />

          {/* Avatar */}
          <button
            type="button"
            onClick={() => {
              setCameraError('');
              setShowPhotoOptions(prev => !prev);
            }}
            className="relative"
            aria-label="Upload profile photo"
          >
            {data.photoUrl ? (
              <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-primary ring-offset-2">
                <img
                  src={data.photoUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div
                className={`w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed ${
                  touched.photo && errors.photo ? 'border-red' : 'border-gray-300'
                }`}
              >
                <Camera size={28} className="text-gray-400" />
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-md">
              <Camera size={14} className="text-white" />
            </div>
          </button>

          {/* Camera / Gallery buttons */}
          <AnimatePresence>
            {showPhotoOptions && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="flex gap-2"
              >
                <button
                  type="button"
                  onClick={openCamera}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-[12px] font-medium text-text-primary hover:border-primary hover:text-primary active:scale-[0.96] transition-all shadow-sm"
                >
                  <Camera size={14} />
                  Camera
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCameraError('');
                    galleryRef.current?.click();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-[12px] font-medium text-text-primary hover:border-primary hover:text-primary active:scale-[0.96] transition-all shadow-sm"
                >
                  <Images size={14} />
                  Gallery
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Camera permission / device error */}
          <AnimatePresence>
            {showPhotoOptions && cameraError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="bg-red-light/50 border border-red/20 rounded-xl px-4 py-3 max-w-[260px]"
              >
                <p className="text-red text-[11px] text-center leading-relaxed">
                  {cameraError}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Label + required badge */}
          {!showPhotoOptions && (
            <div className="text-center">
              <p className="text-[13px] font-medium text-text-primary">
                {data.photoUrl ? 'Tap to change photo' : 'Upload profile photo'}
              </p>
              <span className="text-[10px] font-semibold text-red px-1.5 py-0.5 bg-red-light rounded-md mt-1 inline-block">
                Required
              </span>
            </div>
          )}

          {touched.photo && errors.photo && (
            <p className="text-red text-[11px] text-center">{errors.photo}</p>
          )}
        </div>

        {/* ── Certification Name ────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[13px] font-medium text-text-primary">
              Certification name
            </label>
            <span className="text-[10px] font-semibold text-red px-1.5 py-0.5 bg-red-light rounded-md">
              Required
            </span>
          </div>
          <Input
            type="text"
            placeholder="e.g. NASM-CPT · RYT 500 · CSCS"
            value={data.certificationName}
            onChange={e => {
              updateData({ certificationName: e.target.value });
              if (touched.certificationName) {
                setErrors(prev => ({
                  ...prev,
                  certificationName: e.target.value.trim()
                    ? ''
                    : 'Please enter your primary certification',
                }));
              }
            }}
            onBlur={() => {
              touch('certificationName');
              setErrors(prev => ({
                ...prev,
                certificationName: data.certificationName.trim()
                  ? ''
                  : 'Please enter your primary certification',
              }));
            }}
            error={touched.certificationName ? errors.certificationName : undefined}
          />

          {/* Quick-fill chips */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <span className="text-[10px] text-text-secondary w-full">Quick fill:</span>
            {CERT_SUGGESTIONS.map(cert => {
              const currentCerts = data.certificationName
                .split(',')
                .map(c => c.trim())
                .filter(Boolean);
              const isSelected = currentCerts.includes(cert);
              return (
                <button
                  key={cert}
                  type="button"
                  onClick={() => {
                    const newCerts = isSelected
                      ? currentCerts.filter(c => c !== cert)
                      : [...currentCerts, cert];
                    updateData({ certificationName: newCerts.join(', ') });
                    setErrors(prev => ({ ...prev, certificationName: '' }));
                  }}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-all flex items-center gap-1 ${
                    isSelected
                      ? 'bg-green-light text-primary border-primary/30 shadow-sm'
                      : 'bg-gray-100 text-text-secondary border-transparent hover:bg-green-light/50 hover:text-primary hover:border-primary/20'
                  }`}
                >
                  {isSelected && <Check size={12} className="text-primary" />}
                  {cert}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Years of Experience ───────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[13px] font-medium text-text-primary">
              Years of experience
            </label>
            <span className="text-[10px] text-text-secondary font-medium px-2 py-0.5 bg-input-bg rounded-md">
              Optional
            </span>
          </div>
          <Input
            type="number"
            placeholder="e.g. 5"
            min={0}
            max={50}
            value={data.yearsOfExperience}
            onChange={e => {
              updateData({ yearsOfExperience: e.target.value });
              if (touched.yearsOfExperience && e.target.value) {
                const yoe = parseInt(e.target.value, 10);
                setErrors(prev => ({
                  ...prev,
                  yearsOfExperience:
                    isNaN(yoe) || yoe < 0 || yoe > 50
                      ? 'Must be between 0 and 50 years'
                      : '',
                }));
              }
            }}
            onBlur={() => {
              touch('yearsOfExperience');
              if (data.yearsOfExperience) {
                const yoe = parseInt(data.yearsOfExperience, 10);
                setErrors(prev => ({
                  ...prev,
                  yearsOfExperience:
                    isNaN(yoe) || yoe < 0 || yoe > 50
                      ? 'Must be between 0 and 50 years'
                      : '',
                }));
              }
            }}
            error={touched.yearsOfExperience ? errors.yearsOfExperience : undefined}
          />
        </div>

        {/* ── Bio ──────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[13px] font-medium text-text-primary">
              About you
            </label>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${bioCountColor}`}>
              {bioLength}/{BIO_MAX}
            </span>
          </div>
          <textarea
            placeholder="Describe your training philosophy, background, and what clients can expect working with you..."
            value={data.bio}
            rows={5}
            onChange={e => {
              updateData({ bio: e.target.value });
              if (touched.bio) {
                const val = e.target.value;
                const trimLen = val.trim().length;
                if (trimLen > 0 && trimLen < BIO_MIN)
                  setErrors(prev => ({
                    ...prev,
                    bio: `${BIO_MIN - trimLen} more characters to complete your bio`,
                  }));
                else if (val.length > BIO_MAX)
                  setErrors(prev => ({ ...prev, bio: `Maximum ${BIO_MAX} characters` }));
                else setErrors(prev => ({ ...prev, bio: '' }));
              }
            }}
            onBlur={() => {
              touch('bio');
              const trimLen = data.bio.trim().length;
              if (trimLen > 0 && trimLen < BIO_MIN)
                setErrors(prev => ({
                  ...prev,
                  bio: `${BIO_MIN - trimLen} more characters to complete your bio`,
                }));
              else if (data.bio.length > BIO_MAX)
                setErrors(prev => ({ ...prev, bio: `Maximum ${BIO_MAX} characters` }));
              else setErrors(prev => ({ ...prev, bio: '' }));
            }}
            className={`w-full bg-input-bg border rounded-xl p-4 text-[14px] text-text-primary placeholder:text-text-secondary placeholder:opacity-60 resize-none transition-all outline-none focus:ring-1 focus:border-primary focus:ring-primary/20 leading-relaxed ${
              touched.bio && errors.bio ? 'border-red ring-1 ring-red/20' : 'border-gray-300'
            }`}
          />
          {touched.bio && errors.bio ? (
            <p className="text-red text-[11px]">{errors.bio}</p>
          ) : (
            <p className="text-text-secondary text-[11px]">
              Tell clients about your coaching approach and experience.
            </p>
          )}
        </div>

        {/* ── Professional Certification ────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-[13px] font-medium text-text-primary">
              Professional Certification
            </label>
            <span className="text-[10px] font-medium px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md border border-amber-200">
              Recommended
            </span>
          </div>
          <p className="text-[12px] text-text-secondary -mt-1">
            Upload a photo or PDF of your professional certification to increase trust and verification speed.
          </p>

          <input
            ref={certInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleCertDocChange}
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
                {isCertPdf ? (
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText size={20} className="text-primary" />
                  </div>
                ) : (
                  <img
                    src={certDoc.dataUrl}
                    alt="Certification preview"
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
                className="w-full flex flex-col items-center gap-3 py-8 border-2 border-dashed rounded-2xl transition-all active:scale-[0.98] border-primary/30 bg-green-light/20 hover:bg-green-light/40 hover:border-primary/50"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Upload size={22} className="text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-semibold text-text-primary">
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
      </div>

      {/* ── Camera Overlay ────────────────────────────────────────────────── */}
      {cameraOpen && (
        <div className="absolute inset-0 bg-black z-[80] flex flex-col">
          {/* Live preview */}
          <div className="relative flex-1 overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            {/* Cancel */}
            <button
              type="button"
              onClick={closeCamera}
              className="absolute top-4 left-4 p-2 rounded-full bg-black/50 text-white active:bg-black/70 transition-colors"
              aria-label="Cancel camera"
            >
              <X size={20} />
            </button>
          </div>

          {/* Shutter controls */}
          <div className="bg-black py-10 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={capturePhoto}
              className="w-16 h-16 rounded-full bg-white border-4 border-white/30 shadow-lg active:scale-90 transition-transform"
              aria-label="Take photo"
            />
            <p className="text-white/50 text-[11px]">Tap to capture</p>
          </div>
        </div>
      )}
    </OnboardingLayout>
  );
}
