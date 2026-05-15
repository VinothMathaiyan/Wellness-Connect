import React from 'react';
import { Star, MessageSquare, ClipboardList, MapPin } from 'lucide-react';
import type { User } from '../../../types';

interface TrainerCardProps {
    trainer: User;
    isActive?: boolean;
    onPrimaryAction: () => void;
    onSecondaryAction: () => void;
}

export const TrainerCard = React.memo(({ trainer, isActive = false, onPrimaryAction, onSecondaryAction }: TrainerCardProps) => {
    // Generate initials for avatar
    const initials = trainer.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return (
        <div className="w-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4">
            {/* Header: Avatar, Name, Rating, Specialty */}
            <div className="flex gap-4">
                <div className="w-14 h-14 shrink-0 rounded-full bg-emerald-50 flex items-center justify-center text-[#1D9E75] font-bold text-lg border border-emerald-100">
                    {initials}
                </div>
                
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-[16px] text-gray-900 truncate pr-2">{trainer.full_name}</h3>
                        <div className="flex items-center gap-1 shrink-0 text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-md">
                            <Star size={13} className="fill-current" />
                            <span className="text-[12px] font-bold text-amber-600">{trainer.rating?.toFixed(1) || '5.0'}</span>
                        </div>
                    </div>
                    <p className="text-[13px] text-gray-500 font-medium truncate">
                        {trainer.specialties?.[0] || 'Wellness Coach'}
                    </p>
                </div>
            </div>

            {/* Expertise Tags / Meta */}
            <div className="flex flex-wrap gap-2">
                {trainer.certifications?.slice(0, 2).map((cert, i) => (
                    <span key={i} className="text-[11px] px-2.5 py-1 bg-gray-50 text-gray-600 rounded-lg font-semibold tracking-wide border border-gray-100">
                        {cert}
                    </span>
                ))}
                {!isActive && (
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-semibold px-2.5 py-1 bg-gray-50 rounded-lg border border-gray-100">
                        <MapPin size={12} />
                        <span>{trainer.city || 'Remote'}</span>
                    </div>
                )}
            </div>

            {/* CTAs */}
            <div className="flex gap-3 pt-2">
                <button 
                    onClick={onSecondaryAction}
                    className="flex-1 bg-white border-2 border-gray-100 hover:border-gray-200 text-gray-700 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-[13px]"
                >
                    <MessageSquare size={16} className="text-gray-400" />
                    {isActive ? 'Message Trainer' : 'Request Info'}
                </button>
                <button 
                    onClick={onPrimaryAction}
                    className="flex-1 bg-[#1D9E75] hover:bg-[#15825F] text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-[13px] shadow-sm shadow-[#1D9E75]/20"
                >
                    {isActive ? (
                        <>
                            <ClipboardList size={16} />
                            View Plan
                        </>
                    ) : (
                        'Connect'
                    )}
                </button>
            </div>
        </div>
    );
});
