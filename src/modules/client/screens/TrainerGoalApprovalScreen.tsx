/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    ChevronLeft,
    CheckCircle2,
    Clock,
    AlertCircle,
    Loader2,
    ArrowRight
} from 'lucide-react';
import type { TrainingProgram } from '../../../types';
import { fetchTrainingProgram, submitProgramApproval } from '../../../services/supabaseService';
import { PlanActionSection } from '../components/PlanActionSection';

type ScreenState =
    | 'LOADING'
    | 'WAITING'
    | 'READY'
    | 'APPROVE_SELECTED'
    | 'CHANGES_SELECTED'
    | 'SUBMITTING'
    | 'APPROVED'
    | 'CHANGES_SUBMITTED'
    | 'ERROR_NETWORK'
    | 'ERROR_FORBIDDEN';

export default function TrainingGoalApprovalScreen({ clientId, isFirstEntry = false }: any) {
    const navigate = useNavigate();
    const [state, setState] = useState<ScreenState>('LOADING');
    const [program, setProgram] = useState<TrainingProgram | null>(null);
    const [approvalChoice, setApprovalChoice] = useState<'approved' | 'changes_requested' | null>(null);
    const [notes, setNotes] = useState('');
    const [charCount, setCharCount] = useState(0);

    useEffect(() => {
        loadProgram();
    }, [clientId]);

    async function loadProgram() {
        setState('LOADING');
        try {
            const data = await fetchTrainingProgram(clientId);
            setProgram(data);
            setState('READY');
        } catch (error: any) {
            if (error.message === 'program_not_ready') {
                setState('WAITING');
            } else if (error.message === 'forbidden') {
                setState('ERROR_FORBIDDEN');
            } else {
                setState('ERROR_NETWORK');
            }
        }
    }

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        if (text.length <= 500) {
            setNotes(text);
            setCharCount(text.length);
        }
    };

    const handleSubmit = async (choice: 'approved' | 'changes_requested') => {
        if (!program) return;
        if (choice === 'changes_requested' && !notes.trim()) return;

        setState('SUBMITTING');
        try {
            await submitProgramApproval(program.program_id, choice, notes);
            if (choice === 'approved') {
                setState('APPROVED');
                setTimeout(() => navigate('/client/dashboard'), 1500);
            } else {
                setState('CHANGES_SUBMITTED');
            }
        } catch (error) {
            setState('ERROR_NETWORK');
        }
    };

    const getCharCountColor = () => {
        if (charCount >= 500) return 'text-red';
        if (charCount >= 450) return 'text-amber';
        return 'text-text-secondary';
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 left-0 right-0 bottom-[56px] z-40 flex flex-col bg-[#F9FAFB] overflow-hidden"
        >
            {state === 'LOADING' && (
                <div className="flex-1 flex flex-col items-center justify-center px-8 text-center space-y-4 bg-white">
                    <Loader2 className="animate-spin text-primary" size={40} />
                    <div className="space-y-1">
                        <p className="font-semibold text-text-primary">Loading your program...</p>
                        <p className="text-xs text-text-secondary leading-relaxed">Retrieving the plan your trainer has built for you.</p>
                    </div>
                </div>
            )}

            {state === 'WAITING' && (
                <div className="flex-1 flex flex-col bg-white">
                    <header className="px-4 py-4 border-b border-border-light flex items-center bg-white sticky top-0 z-10 shrink-0">
                        <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-text-primary relative z-50"><ChevronLeft size={24} /></button>
                        <h1 className="flex-1 text-center font-semibold text-[18px] mr-6">Review Your Plan</h1>
                    </header>
                    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center space-y-6">
                        <div className="w-20 h-20 rounded-full bg-amber-light flex items-center justify-center text-amber">
                            <Clock size={40} strokeWidth={1.5} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-text-primary">Your trainer is setting up your program</h3>
                            <p className="text-sm text-text-secondary leading-relaxed max-w-[280px]">
                                You'll be notified when your personalized goals are ready to review.
                            </p>
                        </div>
                        <button onClick={() => navigate(-1)} className="btn-primary w-full max-w-[240px]">Back to Home</button>
                    </div>
                </div>
            )}

            {(state === 'ERROR_FORBIDDEN' || state === 'ERROR_NETWORK') && (
                <div className="flex-1 flex flex-col bg-white">
                    <header className="px-4 py-4 border-b border-border-light flex items-center bg-white sticky top-0 z-10 shrink-0">
                        <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-text-primary relative z-50"><ChevronLeft size={24} /></button>
                        <h1 className="flex-1 text-center font-semibold text-[18px] mr-6">Review Your Plan</h1>
                    </header>
                    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center space-y-6">
                        <div className="w-16 h-16 rounded-full bg-red-light flex items-center justify-center text-red">
                            <AlertCircle size={32} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-text-primary">{state === 'ERROR_FORBIDDEN' ? 'Access Denied' : 'Something went wrong'}</h3>
                            <p className="text-sm text-text-secondary leading-relaxed">
                                {state === 'ERROR_FORBIDDEN' ? "You don't have permission to view this program." : "We couldn't load your program right now. Please check your connection and try again."}
                            </p>
                        </div>
                        <button onClick={loadProgram} className="btn-primary w-full max-w-[240px]">Retry</button>
                        <button onClick={() => navigate(-1)} className="text-sm font-medium text-text-secondary">Back to Home</button>
                    </div>
                </div>
            )}

            {(state === 'READY' || state === 'SUBMITTING' || state === 'APPROVED' || state === 'CHANGES_SUBMITTED') && (
                <>
                    {/* Top Nav */}
                    <header className="bg-primary px-4 py-4 text-white flex items-center shrink-0 z-40 transition-all duration-300">
                        {!isFirstEntry || approvalChoice || state === 'CHANGES_SUBMITTED' ? (
                            <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-white active:scale-90 transition-transform">
                                <ChevronLeft size={24} />
                            </button>
                        ) : (
                            <div className="w-8" />
                        )}
                        <h1 className="flex-1 text-center font-semibold text-[18px] mr-8">Review Your Plan</h1>
                    </header>

                    <div className="flex-1 overflow-y-auto">
                        {program && (
                            <div className="p-4 space-y-6">
                                {/* Trainer Summary Strip */}
                                <div className="bg-white rounded-2xl p-4 shadow-sm border border-border-light flex items-center gap-4">
                                    <img
                                        src={program.trainer.photo_url}
                                        alt={program.trainer.full_name}
                                        className="w-12 h-12 rounded-xl object-cover shrink-0"
                                        referrerPolicy="no-referrer"
                                    />
                                    <div className="flex-1">
                                        <h4 className="text-[14px] font-bold text-text-primary leading-tight">{program.trainer.full_name}</h4>
                                        <p className="text-[11px] text-text-secondary uppercase tracking-wider font-bold opacity-70">
                                            {program.trainer.specialisations.join(' & ')}
                                        </p>
                                    </div>
                                </div>

                                {/* Program Card */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-2xl shadow-sm border border-border-light overflow-hidden"
                                >
                                    <div className="p-6 border-b border-border-light bg-gradient-to-br from-primary/[0.02] to-transparent">
                                        <h2 className="text-[18px] font-bold text-text-primary mb-3 leading-tight">{program.program_name}</h2>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="bg-input-bg px-3 py-1 rounded-full text-[11px] font-bold text-text-secondary border border-border-light">
                                                {program.duration_weeks} weeks
                                            </span>
                                            <span className="bg-input-bg px-3 py-1 rounded-full text-[11px] font-bold text-text-secondary border border-border-light">
                                                {program.sessions_per_week} sessions/wk
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-6 space-y-6 bg-white">
                                        <h3 className="label-caps text-[11px] text-text-secondary tracking-widest">YOUR GOALS</h3>
                                        <div className="space-y-4">
                                            {program.goals.map((goal: string, i: number) => (
                                                <div key={i} className="flex gap-4 items-start group">
                                                    <div className="w-6 h-6 rounded-lg bg-green-light flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-bold text-primary shadow-sm">
                                                        {i + 1}
                                                    </div>
                                                    <p className="text-[14px] leading-relaxed text-text-primary group-hover:text-primary transition-colors">
                                                        {goal}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Change Request Note Area */}
                                {state !== 'CHANGES_SUBMITTED' ? (
                                    <div className="pt-4 pb-4">
                                        <AnimatePresence>
                                            {approvalChoice === 'changes_requested' && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="px-2 pt-2 space-y-3">
                                                        <label className="text-[13px] font-bold text-text-primary ml-1 flex items-center gap-2">
                                                            What would you like to change?
                                                        </label>
                                                        <div className="relative">
                                                            <textarea
                                                                autoFocus
                                                                value={notes}
                                                                onChange={handleNotesChange}
                                                                placeholder="Describe what you would like to change..."
                                                                className="w-full bg-white border border-border-light rounded-xl p-4 text-[14px] min-h-[120px] focus:ring-2 focus:ring-amber/10 focus:border-amber outline-none leading-relaxed transition-all"
                                                            />
                                                            <div className={`absolute bottom-3 right-3 text-[10px] font-bold ${getCharCountColor()}`}>
                                                                {charCount} / 500
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ) : (
                                    /* Feedback Sent State */
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-white border border-green-light rounded-2xl p-6 space-y-5 shadow-sm"
                                    >
                                        <div className="flex items-center gap-3 text-primary">
                                            <ShieldCheck size={24} />
                                            <h3 className="text-lg font-bold">Feedback sent</h3>
                                        </div>
                                        <div className="bg-input-bg p-4 rounded-xl border border-border-light">
                                            <p className="text-[13px] text-text-primary italic leading-relaxed font-medium">"{notes}"</p>
                                        </div>
                                        <p className="text-[13px] text-text-secondary leading-relaxed">
                                            Your trainer will review your notes, update the program, and ask you to review it again.
                                        </p>
                                        <button
                                            onClick={() => navigate(-1)}
                                            className="w-full btn-outline py-3.5 flex items-center justify-center gap-2 font-bold"
                                        >
                                            Back to Home
                                        </button>
                                    </motion.div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Persistence Footer */}
                    {state !== 'CHANGES_SUBMITTED' && (
                        <div className="bg-white border-t border-gray-100 px-6 pt-4 pb-6 sm:pb-8 shrink-0 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                            <PlanActionSection 
                                approvalChoice={approvalChoice}
                                isSubmitting={state === 'SUBMITTING'}
                                onStartProgram={() => handleSubmit('approved')}
                                onRequestChanges={() => setApprovalChoice('changes_requested')}
                                onSendFeedback={() => handleSubmit('changes_requested')}
                                onCancelChanges={() => {
                                    setApprovalChoice(null);
                                    setNotes('');
                                }}
                                isFeedbackValid={notes.trim().length > 0}
                            />
                        </div>
                    )}

                    {/* Success View for Approval */}
                    <AnimatePresence>
                        {state === 'APPROVED' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 bg-white z-[100] flex flex-col items-center justify-center p-8 text-center"
                            >
                                <div className="w-24 h-24 rounded-full bg-green-light flex items-center justify-center text-primary mb-8 shadow-inner ring-8 ring-primary/5">
                                    <CheckCircle2 size={64} />
                                </div>
                                <h3 className="text-2xl font-bold text-text-primary mb-3">All Set!</h3>
                                <p className="text-[15px] text-text-secondary leading-relaxed mb-8">
                                    Program approved. Your trainer has been notified. You can now start scheduling your sessions.
                                </p>
                                <div className="flex items-center gap-2 text-primary font-bold animate-pulse">
                                    <span>Redirecting home</span>
                                    <ArrowRight size={18} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}
        </motion.div>
    );
}

// Add ghost prop support to CheckCircle2 via CSS or use explicit SVG if needed
function ShieldCheck({ size }: { size: number }) {
    return <CheckCircle2 size={size} className="fill-primary text-white" />;
}
