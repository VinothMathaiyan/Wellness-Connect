/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronLeft, 
  Check, 
  Video, 
  MapPin, 
  Clock, 
  MessageSquare,
  CheckCircle2
} from 'lucide-react';
import { TrainingSession, SessionExercise } from '../types';

interface SessionDetailScreenProps {
  session: TrainingSession;
  onBack: () => void;
  userInitials: string;
}

export default function SessionDetailScreen({ session, onBack, userInitials }: SessionDetailScreenProps) {
  const [exercises, setExercises] = useState<SessionExercise[]>(session.exercises || []);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const toggleExercise = (id: string) => {
    setExercises(prev => prev.map(ex => 
      ex.id === id ? { ...ex, client_completed: !ex.client_completed } : ex
    ));
  };

  const completedCount = exercises.filter(ex => ex.client_completed).length;
  const totalCount = exercises.length;

  const startTime = new Date(session.scheduled_at);
  const endTime = new Date(startTime.getTime() + session.duration_minutes * 60 * 1000);
  const diffMinutes = (startTime.getTime() - currentTime.getTime()) / (1000 * 60);

  const isCompleted = session.status === 'completed';
  const isImminent = !isCompleted && diffMinutes <= 10 && currentTime < endTime;
  const isLive = isImminent && currentTime >= startTime;
  const isUpcoming = !isCompleted && !isImminent;

  const formatFullDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    return isToday ? `Today, ${formatTime(iso)}` : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const getTimingTag = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (d.toDateString() === today.toDateString()) return <span className="bg-[#DCFCE7] text-[#1D9E75] px-2 py-0.5 rounded-full text-[11px] font-bold">Today</span>;
    if (d.toDateString() === tomorrow.toDateString()) return <span className="bg-[#FEF3C7] text-[#EF9F27] px-2 py-0.5 rounded-full text-[11px] font-bold">Tomorrow</span>;
    return <span className="bg-gray-100 text-[#6B7280] px-2 py-0.5 rounded-full text-[11px] font-bold">{d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>;
  };

  return (
    <div className="flex flex-col h-full bg-[#FFFFFF]">
      {/* Header */}
      <header className="bg-[#1D9E75] text-white px-6 py-5 flex items-center justify-between sticky top-0 z-50">
        <button onClick={onBack} className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-[17px] font-bold tracking-tight">Session Detail</h1>
        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#1D9E75] font-bold text-[14px]">
          {userInitials}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-24">
        {/* SECTION 1 — Session Overview card */}
        <section className="bg-white rounded-[12px] p-4 border border-[#E5E7EB] space-y-4 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-[18px] font-semibold text-[#111827]">{session.session_name}</h2>
            <p className="text-[13px] text-[#6B7280]">
              With {session.trainer_name} · {formatFullDate(session.scheduled_at)} · {session.duration_minutes} min
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-[#E6F1FB] text-[#185FA5] px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1">
              <Video size={10} /> Virtual
            </span>
            {getTimingTag(session.scheduled_at)}
          </div>

          <div className="w-full">
            {isCompleted ? (
              <div className="bg-gray-100 text-[#6B7280] px-3 py-2 rounded-full text-[12px] font-bold flex items-center justify-center">
                Completed · {new Date(session.scheduled_at).toLocaleDateString()} {formatTime(session.scheduled_at)}
              </div>
            ) : isImminent ? (
              <div className="bg-[#E1F5EE] text-[#1D9E75] px-3 py-2 rounded-full text-[12px] font-bold flex items-center justify-center gap-2">
                <motion.div 
                  animate={{ opacity: [1, 0.4, 1] }} 
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-[#1D9E75]" 
                />
                Live now — join immediately
              </div>
            ) : (
              <div className="bg-[#FEF3C7] text-[#EF9F27] px-3 py-2 rounded-full text-[12px] font-bold flex items-center justify-center">
                Upcoming · Starts in {Math.round(diffMinutes / 60)} hours
              </div>
            )}
          </div>
        </section>

        {/* SECTION 2 — Trainer's Note (conditional) */}
        {session.trainer_note && (
          <section className="bg-[#E1F5EE] rounded-[10px] p-3 space-y-1">
            <h4 className="text-[10px] uppercase text-[#0F6E56] font-bold tracking-[0.06em]">Trainer's note</h4>
            <p className="text-[13px] text-[#111827] leading-relaxed">
              {session.trainer_note}
            </p>
          </section>
        )}

        {/* SECTION 3 — Today's Plan */}
        <section className="space-y-3">
          <h3 className="text-[11px] uppercase text-[#6B7280] font-bold tracking-[0.07em]">Today's Plan</h3>
          <div className="space-y-3">
            {exercises.map((ex, index) => (
              <button 
                key={ex.id}
                onClick={() => toggleExercise(ex.id)}
                className={`w-full p-4 rounded-[12px] border transition-all flex items-center gap-4 text-left cursor-pointer ${
                  ex.client_completed ? 'bg-[#F0FDF4] border-[#1D9E75]/20 shadow-sm' : 'bg-white border-[#E5E7EB]'
                }`}
              >
                <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center font-bold text-[12px] shrink-0 transition-colors ${
                  ex.client_completed ? 'bg-[#1D9E75] text-white' : 'bg-[#E1F5EE] text-[#0F6E56]'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`text-[13px] font-semibold text-[#111827] truncate ${ex.client_completed ? 'line-through text-[#9CA3AF]' : ''}`}>
                    {ex.name}
                  </h4>
                  <p className="text-[12px] text-[#6B7280] truncate">{ex.instructions}</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  ex.client_completed ? 'bg-[#1D9E75] border-[#1D9E75]' : 'border-[#D1D5DB]'
                }`}>
                  {ex.client_completed && <Check size={14} className="text-white" />}
                </div>
              </button>
            ))}
          </div>
          <p className="text-[12px] text-[#6B7280] text-center">{completedCount} of {totalCount} exercises done</p>
        </section>

        {/* SECTION 4 — Join Button (state-aware) */}
        <section className="space-y-4 pt-4">
          {isCompleted ? (
            <div className="space-y-4">
              <div className="bg-[#E1F5EE] text-[#0F6E56] p-3 rounded-[12px] flex items-center justify-center gap-2 text-[12px] font-bold">
                <CheckCircle2 size={16} /> Great work! Session logged.
              </div>
              <div className="bg-gray-100 text-[#9CA3AF] p-4 rounded-[12px] text-center text-[14px] font-bold">
                Session completed · {new Date(session.scheduled_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}, {formatTime(session.scheduled_at)}
              </div>
            </div>
          ) : !session.meeting_url ? (
            <div className="space-y-2">
              <button disabled className="w-full h-12 rounded-[12px] border-2 border-gray-200 text-gray-400 bg-gray-50 flex items-center justify-center gap-2 font-bold opacity-40">
                <Video size={20} /> Meet link not yet set
              </button>
              <p className="text-[11px] text-[#9CA3AF] text-center">Your trainer will add the link before the session.</p>
            </div>
          ) : isImminent ? (
            <div className="space-y-2">
              <motion.button 
                whileTap={{ scale: 0.98 }}
                animate={{ boxShadow: ["0 0 0px rgba(29, 158, 117, 0.4)", "0 0 15px rgba(29, 158, 117, 0.4)", "0 0 0px rgba(29, 158, 117, 0.4)"] }}
                transition={{ duration: 2, repeat: Infinity }}
                onClick={() => window.open(session.meeting_url, '_blank')}
                className="w-full h-12 rounded-[12px] bg-[#1D9E75] text-white flex items-center justify-center gap-2 font-bold cursor-pointer"
              >
                <Video size={20} /> Join via Google Meet — Session is live
              </motion.button>
              <p className="text-[11px] text-[#1D9E75] text-center font-medium">Session is active · Tap to join now</p>
            </div>
          ) : (
            <div className="space-y-2">
              <button 
                onClick={() => window.open(session.meeting_url, '_blank')}
                className="w-full h-12 rounded-[12px] border-2 border-[#1D9E75] text-[#1D9E75] bg-white flex items-center justify-center gap-2 font-bold cursor-pointer active:bg-gray-50 transition-colors"
              >
                <Video size={20} /> Join via Google Meet
              </button>
              <p className="text-[11px] text-[#9CA3AF] text-center">Link will be active 10 minutes before the session.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
