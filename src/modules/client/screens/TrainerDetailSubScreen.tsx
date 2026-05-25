/**
 * Performance Strategy:
 * - Rendered as an absolute overlay within the mobile constraint container.
 * - Used framer-motion for smooth 60fps sliding transition.
 * - Fetches full trainer profile on mount via getTrainerProfile.
 * - Shows loading skeleton, error+retry state, and per-field empty states.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
    ChevronLeft,
    Star,
    MapPin,
    Clock,
    Award,
    AlertCircle,
    RefreshCw,
    Loader2,
} from 'lucide-react';
import type { TrainerProfile, User } from '../../../types';
import { getTrainerProfile, requestCallback, sendMessage } from '../../../services/supabaseService';
import { useWellness } from '../../../context/WellnessContext';

interface TrainerDetailSubScreenProps {
    trainer: User;
    onBack: () => void;
}

/** Returns single initial — first letter of full name */
function getInitials(name: string): string {
    return name?.charAt(0).toUpperCase() ?? '?';
}

export default function TrainerDetailSubScreen({ trainer, onBack }: TrainerDetailSubScreenProps) {
    const { userId } = useWellness();

    const [profile, setProfile]   = useState<TrainerProfile | null>(null);
    const [loading, setLoading]   = useState(true);
    const [hasError, setHasError] = useState(false);

    // ── Request Call Back state ──────────────────────────────────────────────────
    const [callbackLoading,    setCallbackLoading]    = useState(false);
    const [callbackSent,       setCallbackSent]       = useState(false);
    const [callbackError,      setCallbackError]      = useState('');

    // ── Message modal state ──────────────────────────────────────────────────────
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [messageText,      setMessageText]      = useState('');
    const [messageSending,   setMessageSending]   = useState(false);
    const [messageError,     setMessageError]     = useState('');
    const [messageSent,      setMessageSent]      = useState(false);

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        setHasError(false);
        try {
            const data = await getTrainerProfile(trainer.id);
            setProfile(data);
        } catch {
            setHasError(true);
        } finally {
            setLoading(false);
        }
    }, [trainer.id]);

    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    // Resolve avatar: avatar_url → photo_url → initials
    const avatarUrl = profile?.avatar_url ?? profile?.photo_url ?? null;
    const displayName = profile?.full_name ?? trainer.full_name;

    // ── Request Call Back handler ────────────────────────────────────────────────
    const handleRequestCallback = useCallback(async () => {
        if (!userId || callbackLoading || callbackSent) return;
        setCallbackLoading(true);
        setCallbackError('');
        try {
            const result = await requestCallback(userId, trainer.id);
            if (!result.success) {
                setCallbackError(result.error || 'Could not send request. Try again.');
                return;
            }
            setCallbackSent(true);
        } catch {
            setCallbackError('Could not send request. Try again.');
        } finally {
            setCallbackLoading(false);
        }
    }, [userId, trainer.id, callbackLoading, callbackSent]);

    // ── Message handlers ─────────────────────────────────────────────────────────
    const handleOpenMessage = useCallback(() => {
        setMessageText('');
        setMessageError('');
        setShowMessageModal(true);
    }, []);

    const handleCloseMessage = useCallback(() => {
        setShowMessageModal(false);
        setMessageText('');
        setMessageError('');
    }, []);

    const handleSendMessage = useCallback(async () => {
        if (!userId || messageText.trim() === '' || messageSending) return;
        setMessageSending(true);
        setMessageError('');
        try {
            await sendMessage(userId, trainer.id, messageText.trim());
            setShowMessageModal(false);
            setMessageText('');
            setMessageSent(true);
            // Auto-clear success text after 3 seconds
            setTimeout(() => setMessageSent(false), 3000);
        } catch {
            setMessageError('Could not send. Please try again.');
        } finally {
            setMessageSending(false);
        }
    }, [userId, trainer.id, messageText, messageSending]);

    return (
        <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 left-0 right-0 bottom-[56px] z-40 flex flex-col bg-gray-50 overflow-hidden"
        >
            {/* Header */}
            <header className="bg-white px-4 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="font-bold text-[18px] text-gray-900">Trainer Profile</h1>
                <div className="w-10" />
            </header>

            <div className="flex-1 overflow-y-auto scrollbar-hide pb-28">

                {/* ── Loading skeleton ───────────────────────────────────────── */}
                {loading && (
                    <div className="animate-pulse">
                        <section className="bg-white p-6 shadow-sm mb-4 flex flex-col items-center gap-4">
                            <div className="w-24 h-24 rounded-full bg-gray-200" />
                            <div className="h-4 bg-gray-200 rounded w-40" />
                            <div className="h-3 bg-gray-200 rounded w-28" />
                            <div className="flex gap-6 w-full max-w-[280px] bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <div className="flex-1 h-10 bg-gray-200 rounded-xl" />
                                <div className="w-[1px] h-10 bg-gray-200 self-center" />
                                <div className="flex-1 h-10 bg-gray-200 rounded-xl" />
                            </div>
                        </section>
                        <section className="bg-white p-6 shadow-sm space-y-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="space-y-3">
                                    <div className="h-3 bg-gray-200 rounded w-24" />
                                    <div className="h-16 bg-gray-100 rounded-xl" />
                                </div>
                            ))}
                        </section>
                    </div>
                )}

                {/* ── Error state ────────────────────────────────────────────── */}
                {!loading && hasError && (
                    <div className="flex flex-col items-center justify-center text-center gap-4 py-16 px-6">
                        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                            <AlertCircle size={26} color="#F87171" />
                        </div>
                        <p className="text-[14px] font-semibold text-gray-700">
                            Could not load trainer profile. Please try again.
                        </p>
                        <button
                            onClick={fetchProfile}
                            className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-[14px] transition-colors"
                            style={{ backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #BBF7D0' }}
                        >
                            <RefreshCw size={15} />
                            Retry
                        </button>
                    </div>
                )}

                {/* ── Loaded content ─────────────────────────────────────────── */}
                {!loading && !hasError && profile && (
                    <>
                        {/* Profile Card */}
                        <section className="bg-white p-6 space-y-6 shadow-sm mb-4">
                            <div className="flex flex-col items-center text-center">

                                {/* Avatar */}
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={displayName}
                                        className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md mb-4"
                                    />
                                ) : (
                                    <div
                                        className="w-24 h-24 rounded-full flex items-center justify-center font-bold text-3xl border-4 border-white shadow-md mb-4"
                                        style={{ backgroundColor: '#F0FDF4', color: '#166534' }}
                                    >
                                        {getInitials(displayName)}
                                    </div>
                                )}

                                <h2 className="text-[22px] font-bold text-gray-900">{displayName}</h2>

                                {profile.specialties && profile.specialties.length > 0 && (
                                    <p className="text-[14px] font-medium text-[#1D9E75] mt-1">
                                        {profile.specialties.join(' • ')}
                                    </p>
                                )}

                                <div className="flex items-center gap-1.5 text-[13px] text-gray-500 font-medium mt-2">
                                    <MapPin size={14} />
                                    <span>{profile.city || 'Remote'}</span>
                                </div>

                                {/* Rating + Sessions stat row */}
                                <div className="flex gap-6 mt-6 w-full max-w-[280px] bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <div className="flex-1 flex flex-col items-center">
                                        <div className="flex items-center gap-1 text-amber-500 font-bold text-[18px]">
                                            <Star size={18} className="fill-current" />
                                            <span>{profile.rating?.toFixed(1) ?? '—'}</span>
                                        </div>
                                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-1">Rating</p>
                                    </div>

                                    <div className="w-[1px] h-10 bg-gray-200 self-center" />

                                    <div className="flex-1 flex flex-col items-center">
                                        <span className="text-gray-900 font-bold text-[18px]">
                                            {profile.session_count != null ? `${profile.session_count}+` : '—'}
                                        </span>
                                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-1">Sessions</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white p-6 space-y-6 shadow-sm border-t border-gray-100">

                            {/* Specialisations */}
                            <div className="space-y-4">
                                <h3 className="text-[12px] font-bold text-gray-400 tracking-[0.08em] uppercase border-b border-gray-100 pb-2">
                                    Specialisations
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {(profile.specialties ?? []).length > 0
                                        ? profile.specialties!.map(s => (
                                            <span
                                                key={s}
                                                className="px-3 py-1.5 text-[13px] font-bold rounded-lg border"
                                                style={{
                                                    backgroundColor: 'rgba(29,158,117,0.10)',
                                                    color: '#1D9E75',
                                                    borderColor: 'rgba(29,158,117,0.20)',
                                                }}
                                            >
                                                {s}
                                            </span>
                                        ))
                                        : <p className="text-[13px] text-gray-400">No specialties listed yet.</p>
                                    }
                                </div>
                            </div>

                            {/* Certifications — individual chips */}
                            <div className="space-y-4 pt-2">
                                <h3 className="text-[12px] font-bold text-gray-400 tracking-[0.08em] uppercase border-b border-gray-100 pb-2">
                                    Certifications
                                </h3>
                                {(profile.certifications ?? []).length > 0 ? (
                                    <ul className="space-y-3">
                                        {profile.certifications!.map((cert) => (
                                            <li
                                                key={cert}
                                                className="flex items-start gap-3 text-[14px] text-gray-700 font-medium bg-gray-50 p-3 rounded-xl border border-gray-100"
                                            >
                                                <Award size={18} className="text-[#1D9E75] shrink-0 mt-0.5" />
                                                <span>{cert}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-[13px] text-gray-400">No certifications listed yet.</p>
                                )}
                            </div>

                            {/* Availability */}
                            <div className="space-y-4 pt-2">
                                <h3 className="text-[12px] font-bold text-gray-400 tracking-[0.08em] uppercase border-b border-gray-100 pb-2">
                                    Availability
                                </h3>
                                {profile.availability ? (
                                    <ul className="space-y-3">
                                        <li className="flex items-start gap-3 text-[14px] text-gray-700 font-medium bg-gray-50 p-3 rounded-xl border border-gray-100">
                                            <Clock size={18} className="text-[#1D9E75] shrink-0 mt-0.5" />
                                            <div>
                                                <strong className="text-gray-900">Weekdays: </strong>
                                                {profile.availability.weekdays ?? 'Not specified'}
                                            </div>
                                        </li>
                                        <li className="flex items-start gap-3 text-[14px] text-gray-700 font-medium bg-gray-50 p-3 rounded-xl border border-gray-100">
                                            <Clock size={18} className="text-[#1D9E75] shrink-0 mt-0.5" />
                                            <div>
                                                <strong className="text-gray-900">Weekends: </strong>
                                                {profile.availability.weekends ?? 'Not specified'}
                                            </div>
                                        </li>
                                    </ul>
                                ) : (
                                    <p className="text-[13px] text-gray-400">Availability not set yet.</p>
                                )}
                            </div>

                            {/* Experience */}
                            {profile.experience_years != null && (
                                <div className="space-y-2 pt-2">
                                    <h3 className="text-[12px] font-bold text-gray-400 tracking-[0.08em] uppercase border-b border-gray-100 pb-2">
                                        Experience
                                    </h3>
                                    <p className="text-[14px] text-gray-700 font-medium">
                                        {profile.experience_years} yrs
                                    </p>
                                </div>
                            )}

                            {/* Bio */}
                            <div className="space-y-4 pt-2 pb-6">
                                <h3 className="text-[12px] font-bold text-gray-400 tracking-[0.08em] uppercase border-b border-gray-100 pb-2">
                                    Bio
                                </h3>
                                <p className="text-[14px] text-gray-600 leading-relaxed font-medium">
                                    {profile.bio ?? 'No bio available yet.'}
                                </p>
                            </div>
                        </section>

                        {/* ── Action buttons — inline, below content (not fixed) ──────────── */}
                        <div className="px-4" style={{ marginTop: '24px', marginBottom: '24px' }}>

                            {/* Inline feedback messages */}
                            {callbackError && (
                                <p style={{ fontSize: '13px', color: '#EF4444', marginBottom: '8px', textAlign: 'center' }}>
                                    {callbackError}
                                </p>
                            )}
                            {messageSent && (
                                <p style={{ fontSize: '13px', color: '#166534', marginBottom: '8px', textAlign: 'center' }}>
                                    Message sent!
                                </p>
                            )}

                            {callbackSent ? (
                                <div className="bg-green-50 p-4 rounded-xl border border-green-200 text-center mb-4">
                                    <p className="text-green-700 font-bold text-[14px] flex items-center justify-center gap-1.5 mb-1">
                                        <span className="text-[16px]">✓</span> Call back requested
                                    </p>
                                    <p className="text-green-600 text-[13px] font-medium">
                                        {trainer.full_name} will call you soon.
                                    </p>
                                </div>
                            ) : null}

                            <div className="flex gap-3">
                                {/* Request Call Back */}
                                {!callbackSent && (
                                    <button
                                        onClick={handleRequestCallback}
                                        disabled={callbackLoading}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-bold transition-colors"
                                        style={{ border: '2px solid #1D9E75', color: '#1D9E75', backgroundColor: 'white' }}
                                    >
                                        {callbackLoading && <Loader2 size={15} className="animate-spin" />}
                                        Request Call Back
                                    </button>
                                )}

                                {/* Message */}
                                <button
                                    onClick={handleOpenMessage}
                                    className="flex-1 flex items-center justify-center py-3 rounded-xl text-[14px] font-bold transition-all active:scale-[0.98]"
                                    style={{ backgroundColor: '#1D9E75', color: 'white' }}
                                >
                                    Message
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ── Message Modal (centered overlay) ─────────────────────────────────────── */}
            {showMessageModal && (
                <div
                    onClick={handleCloseMessage}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        zIndex: 1000,
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'fixed',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '90%',
                            maxWidth: '400px',
                            backgroundColor: '#ffffff',
                            borderRadius: '16px',
                            padding: '24px',
                            zIndex: 1001,
                        }}
                    >
                        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: '#111827' }}>
                            Message {displayName}
                        </h2>

                        <textarea
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            maxLength={300}
                            rows={4}
                            placeholder="Write a short message..."
                            style={{
                                width: '100%',
                                border: '1px solid #D1D5DB',
                                borderRadius: '12px',
                                padding: '12px',
                                fontSize: '14px',
                                resize: 'none',
                                outline: 'none',
                                color: '#111827',
                                boxSizing: 'border-box',
                            }}
                        />

                        <p style={{ fontSize: '12px', color: '#9CA3AF', textAlign: 'right', marginTop: '4px' }}>
                            {messageText.length}/300
                        </p>

                        {messageError ? (
                            <p style={{ fontSize: '13px', color: '#EF4444', marginBottom: '8px' }}>{messageError}</p>
                        ) : null}

                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                            <button
                                onClick={handleCloseMessage}
                                style={{
                                    flex: 1,
                                    minHeight: '48px',
                                    borderRadius: '12px',
                                    border: '1px solid #E5E7EB',
                                    backgroundColor: '#ffffff',
                                    color: '#374151',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendMessage}
                                disabled={messageText.trim() === '' || messageSending}
                                style={{
                                    flex: 1,
                                    minHeight: '48px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    backgroundColor: messageText.trim() === '' || messageSending ? '#D1D5DB' : '#1D9E75',
                                    color: '#ffffff',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: messageText.trim() === '' || messageSending ? 'default' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                }}
                            >
                                {messageSending && <Loader2 size={16} className="animate-spin" />}
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
