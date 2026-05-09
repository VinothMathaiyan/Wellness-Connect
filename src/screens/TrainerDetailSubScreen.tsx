/**
 * Performance Strategy:
 * - Rendered as an absolute overlay within the mobile constraint container.
 * - Used framer-motion for smooth 60fps sliding transition.
 * - Removed heavy components and memoized where applicable.
 */

import { motion } from 'motion/react';
import {
    ChevronLeft,
    Star,
    MapPin,
    Clock,
    Award
} from 'lucide-react';
import type { User } from '../types';

interface TrainerDetailSubScreenProps {
    trainer: User;
    onBack: () => void;
}

export default function TrainerDetailSubScreen({ trainer, onBack }: TrainerDetailSubScreenProps) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 left-0 right-0 bottom-[56px] z-40 flex flex-col bg-gray-50 overflow-hidden"
        >
            {/* Header with Back Arrow */}
            <header className="bg-white px-4 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <button onClick={onBack} className="p-2 -ml-2 text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="font-bold text-[18px] text-gray-900">Trainer Profile</h1>
                <div className="w-10" />
            </header>

            <div className="flex-1 overflow-y-auto scrollbar-hide pb-28">
                {/* Profile Card */}
                <section className="bg-white p-6 space-y-6 shadow-sm mb-4">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-24 h-24 rounded-full bg-[#1D9E75]/10 flex items-center justify-center text-[#1D9E75] font-bold text-3xl border-4 border-white shadow-md mb-4">
                            {trainer.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <h2 className="text-[22px] font-bold text-gray-900">{trainer.full_name}</h2>
                        <p className="text-[14px] font-medium text-[#1D9E75] mt-1">{trainer.specialties?.join(' • ')}</p>
                        <div className="flex items-center gap-1.5 text-[13px] text-gray-500 font-medium mt-2">
                            <MapPin size={14} />
                            <span>{trainer.city || 'Remote'}</span>
                        </div>

                        <div className="flex gap-6 mt-6 w-full max-w-[280px] bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <div className="flex-1 flex flex-col items-center">
                                <div className="flex items-center gap-1 text-amber-500 font-bold text-[18px]">
                                    <Star size={18} className="fill-current" />
                                    <span>{trainer.rating?.toFixed(1) || '5.0'}</span>
                                </div>
                                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-1">Rating</p>
                            </div>
                            <div className="w-[1px] h-10 bg-gray-200 self-center" />
                            <div className="flex-1 flex flex-col items-center">
                                <span className="text-gray-900 font-bold text-[18px]">{trainer.sessionCount || 120}+</span>
                                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-1">Sessions</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-white p-6 space-y-6 shadow-sm border-t border-gray-100">
                    <div className="space-y-4">
                        <h3 className="text-[12px] font-bold text-gray-400 tracking-[0.08em] uppercase border-b border-gray-100 pb-2">Specialisations</h3>
                        <div className="flex flex-wrap gap-2">
                            {trainer.specialties?.map(s => (
                                <span key={s} className="px-3 py-1.5 bg-[#1D9E75]/10 text-[#1D9E75] text-[13px] font-bold rounded-lg border border-[#1D9E75]/20">
                                    {s}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 pt-2">
                        <h3 className="text-[12px] font-bold text-gray-400 tracking-[0.08em] uppercase border-b border-gray-100 pb-2">Certifications</h3>
                        <ul className="space-y-3">
                            {trainer.certifications?.map((cert, i) => (
                                <li key={i} className="flex items-start gap-3 text-[14px] text-gray-700 font-medium bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <Award size={18} className="text-[#1D9E75] shrink-0 mt-0.5" />
                                    <span>{cert}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="space-y-4 pt-2">
                        <h3 className="text-[12px] font-bold text-gray-400 tracking-[0.08em] uppercase border-b border-gray-100 pb-2">Availability</h3>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3 text-[14px] text-gray-700 font-medium bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <Clock size={18} className="text-[#1D9E75] shrink-0 mt-0.5" />
                                <div><strong className="text-gray-900">Weekdays:</strong> 7:00 AM - 11:00 AM, 5:00 PM - 9:00 PM</div>
                            </li>
                            <li className="flex items-start gap-3 text-[14px] text-gray-700 font-medium bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <Clock size={18} className="text-[#1D9E75] shrink-0 mt-0.5" />
                                <div><strong className="text-gray-900">Weekends:</strong> 9:00 AM - 1:00 PM</div>
                            </li>
                        </ul>
                    </div>

                    <div className="space-y-4 pt-2 pb-6">
                        <h3 className="text-[12px] font-bold text-gray-400 tracking-[0.08em] uppercase border-b border-gray-100 pb-2">Bio</h3>
                        <p className="text-[14px] text-gray-600 leading-relaxed font-medium">
                            {trainer.bio || `Hi, I'm ${trainer.full_name}. I specialize in helping clients achieve their wellness goals through personalized training and holistic approaches.`}
                        </p>
                    </div>
                </section>
            </div>

            {/* Persistence Bar */}
            <div className="bg-white border-t border-gray-200 p-4 absolute bottom-0 left-0 right-0 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <div className="flex gap-3">
                    <button 
                        onClick={() => alert('Request Sent')}
                        className="flex-1 flex items-center justify-center bg-white border-2 border-[#1D9E75] text-[#1D9E75] py-3 rounded-xl text-[14px] font-bold hover:bg-[#1D9E75]/5 active:bg-[#1D9E75]/10 transition-colors"
                    >
                        Request Call Back
                    </button>
                    <button 
                        onClick={() => alert('Messaging coming soon')}
                        className="flex-1 flex items-center justify-center bg-[#1D9E75] hover:bg-[#15825F] text-white py-3 rounded-xl text-[14px] font-bold shadow-lg shadow-[#1D9E75]/25 active:scale-[0.98] transition-all"
                    >
                        Message
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
