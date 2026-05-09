/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Calendar, 
  Minus, 
  Plus, 
  Moon, 
  Zap,
  Check,
} from 'lucide-react';
import { DailyTrackingLog } from '../types';
import { fetchDailyLog, saveDailyLog } from '../services/trackingService';

interface DailyWellnessTrackingScreenProps {
  clientId: string;
  onBack: () => void;
  onViewProgress?: () => void;
}

const EMOJI_MOOD = [
  { value: 1, label: 'Very low', emoji: '😞', color: '#FCEBEB', textColor: '#E24B4A' },
  { value: 2, label: 'Low', emoji: '😐', color: '#FEF3C7', textColor: '#D97706' },
  { value: 3, label: 'Neutral', emoji: '😐', color: '#FEF9C3', textColor: '#A16207' },
  { value: 4, label: 'Good', emoji: '😊', color: '#E1F5EE', textColor: '#1D9E75' },
  { value: 5, label: 'Great', emoji: '😄', color: '#D1FAE5', textColor: '#0F6E56' },
];

const EMOJI_PAIN = [
  { value: 0, label: 'None', emoji: '😌', color: '#E1F5EE', textColor: '#1D9E75' },
  { value: 2, label: 'Mild', emoji: '😐', color: '#F7FEE7', textColor: '#1D9E75' },
  { value: 5, label: 'Moderate', emoji: '😕', color: '#FEF3C7', textColor: '#EF9F27' },
  { value: 7, label: 'High', emoji: '😣', color: '#FFEDD5', textColor: '#F97316' },
  { value: 10, label: 'Severe', emoji: '😫', color: '#FCEBEB', textColor: '#E24B4A' },
];

const ENERGY_LEVELS = [
  { value: 1, label: 'Drained', color: '#E24B4A', light: '#FCEBEB' },
  { value: 2, label: 'Low', color: '#EF9F27', light: '#FEF3C7' },
  { value: 3, label: 'Balanced', color: '#EF9F27', light: '#FEF3C7' },
  { value: 4, label: 'Good', color: '#1D9E75', light: '#E1F5EE' },
  { value: 5, label: 'Excellent', color: '#0F6E56', light: '#D1FAE5' },
];

const SLEEP_QUALITY_ICONS = [
  { value: 1, label: 'Restless' },
  { value: 2, label: 'Poor' },
  { value: 3, label: 'Fair' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Refreshed' },
];

export default function DailyWellnessTrackingScreen({ clientId, onBack, onViewProgress }: DailyWellnessTrackingScreenProps) {
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [log, setLog] = useState<DailyTrackingLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastAddedWater, setLastAddedWater] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedState, setShowSavedState] = useState(false);
  
  const waterGoal = 2.5;

  useEffect(() => {
    loadLog(logDate);
  }, [clientId, logDate]);

  const loadLog = async (date: string) => {
    setIsLoading(true);
    try {
      const data = await fetchDailyLog(clientId, date);
      setLog(data);
    } catch (error) {
      console.error('Failed to load log:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = (updates: Partial<DailyTrackingLog>) => {
    setLog(prev => prev ? { ...prev, ...updates } : null);
  };

  const onSave = async () => {
    if (!log) return;
    setIsSaving(true);
    try {
      await saveDailyLog(clientId, log);
      setShowSavedState(true);
      setTimeout(() => setShowSavedState(false), 1000);
      
      if (isAllDone && onViewProgress) {
        setTimeout(onViewProgress, 500);
      }
    } catch (error) {
      console.error('Failed to save log:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const doneCount = log ? [
    (log.water_litres || 0) > 0,
    (log.sleep_hours || 0) > 0,
    (log.mood_score || 0) > 0,
    (log.energy_level || 0) > 0,
    (log.pain_score !== null && log.pain_score !== undefined),
    (log.mobility_score !== null && log.mobility_score !== undefined),
    (log.sleep_quality_score || 0) > 0
  ].filter(Boolean).length : 0;

  const isAllDone = doneCount >= 7;

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const waterConsumed = log?.water_litres || 0;
  const waterProgress = Math.min((waterConsumed / waterGoal) * 100, 100);

  return (
    <div className="flex justify-center bg-[#F3F4F6] h-screen font-sans overflow-hidden">
      <div className="w-[375px] bg-white h-full shadow-xl flex flex-col relative overflow-hidden">
        
        {/* HEADER */}
        <header className="px-5 pt-6 pb-4 bg-white border-b border-[#E5E7EB] sticky top-0 z-50 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-1">
            <button onClick={onBack} className="p-1 -ml-1 text-[#111827]">
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-[16px] font-semibold text-[#111827]">Daily Tracking Log</h1>
            <div className={`px-4 py-1 rounded-full text-[11px] font-semibold transition-colors duration-500 ${doneCount === 7 ? 'bg-[#E1F5EE] text-[#0F6E56]' : 'bg-[#F3F4F6] text-[#9CA3AF]'}`}>
              {doneCount} of 7 done
            </div>
          </div>
          
          <div className="relative group cursor-pointer flex flex-col items-center">
            <input 
              type="date" 
              className="absolute inset-0 opacity-0 cursor-pointer z-10" 
              value={logDate} 
              onChange={(e) => setLogDate(e.target.value)}
            />
            <span className="text-[12px] font-medium text-[#1D9E75]">{formatDateLabel(logDate)}</span>
            <Calendar size={14} className="text-[#1D9E75]" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-hide pb-[80px]">
          
          {/* GROUP 1 DIVIDER */}
          <div className="mt-4 mb-2 flex justify-center">
            <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.07em]">TODAY'S TRACKING</span>
          </div>

          <div className="px-4 space-y-[10px]">
            
            {/* CARD 1 — WATER INTAKE */}
            <div className="bg-white border-[0.5px] border-[#E5E7EB] rounded-[12px] p-[14px]">
              <div className="flex justify-between items-center mb-[10px]">
                <h4 className="text-[13px] font-semibold text-[#111827]">Water Intake</h4>
                <div className="flex items-center gap-1.5 min-h-[20px]">
                  <span className={`text-[13px] font-semibold ${waterConsumed >= waterGoal ? 'text-[#1D9E75]' : 'text-[#3B9EE8]'}`}>
                    {waterConsumed.toFixed(2)} L of {waterGoal} L
                  </span>
                  {waterConsumed > waterGoal && (
                    <motion.div 
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="px-2 py-0.5 bg-[#D1FAE5] text-[#1D9E75] text-[10px] font-bold rounded-full"
                    >
                      Goal exceeded ✓
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6 mt-2 mb-4">
                {/* Bottle SVG */}
                <div className="relative w-[50px] h-[80px] shrink-0">
                  <svg width="50" height="80" viewBox="0 0 50 80">
                    <rect x="10" y="5" width="30" height="70" rx="6" fill="none" stroke="#3B9EE8" strokeWidth="2" strokeOpacity="0.2" />
                    <defs>
                      <clipPath id="bottleClip">
                        <rect x="10" y="5" width="30" height="70" rx="6" />
                      </clipPath>
                    </defs>
                    <g clipPath="url(#bottleClip)">
                      <motion.rect 
                        x="10" y={75} width="30" fill="#3B9EE8" 
                        animate={{ 
                          height: (Math.min(waterConsumed, waterGoal) / waterGoal) * 70, 
                          y: 75 - (Math.min(waterConsumed, waterGoal) / waterGoal) * 70 
                        }}
                        transition={{ type: 'spring', damping: 20 }}
                      />
                      {waterConsumed > waterGoal && (
                        <motion.rect 
                          x="10" y="5" width="30" height="4" fill="#1D9E75" 
                          animate={{ opacity: [0.6, 1, 0.6] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                      )}
                    </g>
                  </svg>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="w-full h-[6px] bg-[#E5E7EB] rounded-[3px] overflow-hidden">
                    <motion.div 
                      className={`h-full ${waterConsumed >= waterGoal ? 'bg-[#1D9E75]' : 'bg-[#3B9EE8]'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${waterProgress}%` }}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {[150, 250, 500, 1000].map(amt => (
                      <button
                        key={amt}
                        onClick={() => {
                          const val = amt / 1000;
                          handleUpdate({ water_litres: waterConsumed + val });
                          setLastAddedWater(prev => [...prev, val]);
                        }}
                        className="h-[44px] bg-white border border-[#D1D5DB] rounded-[8px] text-[13px] font-semibold text-[#111827] active:bg-[#E1F5EE] active:border-[#1D9E75] active:text-[#0F6E56] transition-all"
                      >
                        + {amt >= 1000 ? (amt/1000) + ' L' : amt + ' ml'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {waterConsumed > 0 && (
                <div className="flex justify-center">
                  <button 
                    onClick={() => {
                      const last = lastAddedWater[lastAddedWater.length - 1];
                      if (last !== undefined) {
                        handleUpdate({ water_litres: Math.max(0, waterConsumed - last) });
                        setLastAddedWater(prev => prev.slice(0, -1));
                      }
                    }}
                    className="text-[12px] text-[#6B7280] underline"
                  >
                    Undo last entry
                  </button>
                </div>
              )}
            </div>

            {/* CARD 2 — SLEEP DURATION */}
            <div className="bg-white border-[0.5px] border-[#E5E7EB] rounded-[12px] p-[14px]">
               <div className="flex justify-between items-center mb-1">
                 <h4 className="text-[13px] font-semibold text-[#111827]">Sleep Duration</h4>
                 <span className="text-[13px] font-semibold text-[#111827]">{(log?.sleep_hours || 8).toFixed(1)} hrs</span>
               </div>
               <p className="text-[11px] text-[#9CA3AF] italic mb-[10px]">How many hours did you sleep last night?</p>

               <div className="flex flex-col items-center py-2">
                  <div className="relative w-[180px] h-[100px] flex justify-center items-end overflow-hidden mb-4">
                     <svg width="180" height="180" className="absolute top-0">
                        <path 
                          d="M10,90 A80,80 0 0,1 170,90" 
                          fill="none" stroke="#E5E7EB" strokeWidth="10" strokeLinecap="round"
                        />
                        <motion.path 
                          d="M10,90 A80,80 0 0,1 170,90" 
                          fill="none" stroke="#7C3AED" strokeWidth="10" strokeLinecap="round"
                          strokeDasharray="251.32"
                          strokeDashoffset={251.32 - (Math.min(log?.sleep_hours || 8, 12) / 12) * 251.32}
                          transition={{ type: 'spring', damping: 25 }}
                        />
                     </svg>
                     <div className="flex flex-col items-center z-10 mb-2">
                        <span className="text-[24px] mb-1">🌙</span>
                        <span className="text-[20px] font-semibold text-[#111827]">
                           {Math.floor(log?.sleep_hours || 8)}h {Math.round(((log?.sleep_hours || 8) % 1) * 60).toString().padStart(2, '0')}m
                        </span>
                     </div>
                  </div>

                  <div className="flex items-center gap-8 mb-4">
                     <button 
                       onClick={() => handleUpdate({ sleep_hours: Math.max(0.5, (log?.sleep_hours || 8) - 0.5) })}
                       className="w-[44px] h-[44px] border-[1.5px] border-[#D1D5DB] rounded-full flex items-center justify-center text-[#111827] active:bg-gray-100 bg-white"
                     >
                       <Minus size={20} />
                     </button>
                     <span className="text-[22px] font-bold text-[#111827] w-20 text-center">{(log?.sleep_hours || 8)} hrs</span>
                     <button 
                       onClick={() => handleUpdate({ sleep_hours: Math.min(12, (log?.sleep_hours || 8) + 0.5) })}
                       className="w-[44px] h-[44px] border-[1.5px] border-[#D1D5DB] rounded-full flex items-center justify-center text-[#111827] active:bg-gray-100 bg-white"
                     >
                       <Plus size={20} />
                     </button>
                  </div>

                  <p className="text-[11px] text-[#9CA3AF] mb-6">
                    Bedtime around {(() => {
                      const h = log?.sleep_hours || 8;
                      const wake = 6;
                      const bed = (24 + (wake - h)) % 24;
                      return `${bed % 12 || 12}:00 ${bed >= 12 ? 'PM' : 'AM'}`;
                    })()} · Wake around 6:00 AM
                  </p>

                  <div className="w-full pt-4 border-t border-[#E5E7EB]">
                     <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.06em] block mb-3">SLEEP QUALITY</span>
                     <div className="flex justify-between w-full px-1">
                        {SLEEP_QUALITY_ICONS.map(sq => (
                          <button
                            key={sq.value}
                            onClick={() => handleUpdate({ sleep_quality_score: sq.value })}
                            className="flex flex-col items-center gap-1.5"
                          >
                             <div className={`w-[48px] h-[48px] rounded-full flex items-center justify-center transition-all ${log?.sleep_quality_score === sq.value ? 'bg-[#EEEDFE] scale-110' : 'bg-[#F3F4F6]'}`}>
                                <Moon 
                                  size={20} 
                                  className={log?.sleep_quality_score === sq.value ? 'text-[#7C3AED]' : 'text-[#9CA3AF]'} 
                                  fill={log?.sleep_quality_score === sq.value ? 'currentColor' : 'none'} 
                                />
                             </div>
                             <span className={`text-[10px] font-medium leading-tight ${log?.sleep_quality_score === sq.value ? 'text-[#7C3AED] font-bold' : 'text-[#6B7280]'}`}>{sq.label}</span>
                          </button>
                        ))}
                     </div>
                  </div>
               </div>
            </div>

            {/* CARD 3 — MOOD */}
            <div className="bg-white border-[0.5px] border-[#E5E7EB] rounded-[12px] p-[14px]">
               <div className="flex justify-between items-center mb-1">
                 <h4 className="text-[13px] font-semibold text-[#111827]">How are you feeling?</h4>
                 <span className="text-[13px] font-semibold" style={{ color: EMOJI_MOOD.find(m => m.value === log?.mood_score)?.textColor }}>
                    {EMOJI_MOOD.find(m => m.value === log?.mood_score)?.label || ''}
                 </span>
               </div>
               <p className="text-[11px] text-[#9CA3AF] italic mb-[10px]">Your emotional state today</p>
               <div className="flex justify-between mt-2">
                  {EMOJI_MOOD.map(m => (
                    <button
                      key={m.value}
                      onClick={() => handleUpdate({ mood_score: m.value })}
                      className="flex flex-col items-center w-[52px] gap-2 py-2 rounded-[10px] transition-all border-[0.5px]"
                      style={{ 
                        backgroundColor: log?.mood_score === m.value ? m.color : 'transparent',
                        borderColor: log?.mood_score === m.value ? 'transparent' : '#E5E7EB'
                      }}
                    >
                       <span className={`text-[28px] transition-transform ${log?.mood_score === m.value ? 'scale-115' : ''}`}>
                          {m.emoji}
                       </span>
                       <span className={`text-[10px] ${log?.mood_score === m.value ? 'font-bold' : 'text-[#6B7280]'}`} style={{ color: log?.mood_score === m.value ? m.textColor : undefined }}>
                          {m.label}
                       </span>
                    </button>
                  ))}
               </div>
            </div>

            {/* CARD 4 — ENERGY LEVEL */}
            <div className="bg-white border-[0.5px] border-[#E5E7EB] rounded-[12px] p-[14px]">
               <div className="flex justify-between items-center mb-1">
                 <h4 className="text-[13px] font-semibold text-[#111827]">Energy Level</h4>
                 <span className="text-[13px] font-semibold" style={{ color: ENERGY_LEVELS.find(e => e.value === log?.energy_level)?.color }}>
                    {ENERGY_LEVELS.find(e => e.value === log?.energy_level)?.label || ''}
                 </span>
               </div>
               <p className="text-[11px] text-[#9CA3AF] italic mb-[10px]">How energised do you feel right now?</p>
               <div className="flex justify-between mt-2">
                  {ENERGY_LEVELS.map(lv => (
                    <button
                      key={lv.value}
                      onClick={() => handleUpdate({ energy_level: lv.value })}
                      className="flex flex-col items-center w-[52px] gap-2 py-2 rounded-[10px] transition-all border-[0.5px]"
                      style={{ 
                        backgroundColor: log?.energy_level === lv.value ? lv.light : 'transparent',
                        borderColor: log?.energy_level === lv.value ? lv.color : '#E5E7EB'
                      }}
                    >
                       <div className="flex flex-col items-center min-h-[25px] justify-center">
                          {[...Array(lv.value)].map((_, i) => (
                            <Zap 
                              key={i} size={10} 
                              className={log?.energy_level === lv.value ? '' : 'text-[#9CA3AF]'} 
                              style={{ color: log?.energy_level === lv.value ? lv.color : undefined, fill: log?.energy_level === lv.value ? 'currentColor' : 'none' }} 
                            />
                          ))}
                       </div>
                       <span className={`text-[10px] ${log?.energy_level === lv.value ? 'font-bold' : 'text-[#6B7280]'}`} style={{ color: log?.energy_level === lv.value ? lv.color : undefined }}>
                          {lv.label}
                       </span>
                    </button>
                  ))}
               </div>
            </div>

            {/* GROUP 2 DIVIDER */}
            <div className="py-6 flex items-center w-full">
               <div className="h-[0.5px] bg-[#E5E7EB] flex-1" />
               <span className="px-2 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.07em] bg-white">BODY SIGNALS</span>
               <div className="h-[0.5px] bg-[#E5E7EB] flex-1" />
            </div>

            {/* CARD 5 — PAIN LEVEL */}
            <div className="bg-white border-[0.5px] border-[#E5E7EB] rounded-[12px] p-[14px]">
               <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-[13px] font-semibold text-[#111827]">Pain Level</h4>
                    <div className="px-2 py-0.5 bg-[#F3F4F6] text-[#6B7280] text-[10px] font-medium rounded-full">vs. yesterday</div>
                  </div>
                  <span className="text-[13px] font-semibold" style={{ color: EMOJI_PAIN.find(p => p.value === log?.pain_score)?.textColor }}>
                    {EMOJI_PAIN.find(p => p.value === log?.pain_score)?.label || ''}
                  </span>
               </div>
               <p className="text-[11px] text-[#9CA3AF] italic mb-[10px]">Compared to how you felt yesterday</p>
               <div className="flex justify-between mt-2">
                  {EMOJI_PAIN.map(p => (
                    <button
                      key={p.value}
                      onClick={() => handleUpdate({ pain_score: p.value })}
                      className="flex flex-col items-center w-[52px] gap-2 py-2 rounded-[10px] transition-all border-[0.5px]"
                      style={{ 
                        backgroundColor: log?.pain_score === p.value ? p.color : 'transparent',
                        borderColor: log?.pain_score === p.value ? 'transparent' : '#E5E7EB'
                      }}
                    >
                       <span className={`text-[28px] transition-transform ${log?.pain_score === p.value ? 'scale-115' : ''}`}>
                          {p.emoji}
                       </span>
                       <span className={`text-[10px] ${log?.pain_score === p.value ? 'font-bold' : 'text-[#6B7280]'}`}>
                          {p.label}
                       </span>
                    </button>
                  ))}
               </div>
            </div>

            {/* CARD 6 — MOBILITY */}
            <div className="bg-white border-[0.5px] border-[#E5E7EB] rounded-[12px] p-[14px]">
               <div className="flex justify-between items-center mb-1">
                 <div className="flex items-center gap-1.5">
                    <h4 className="text-[13px] font-semibold text-[#111827]">Mobility</h4>
                    <div className="px-2 py-0.5 bg-[#F3F4F6] text-[#6B7280] text-[10px] font-medium rounded-full">vs. yesterday</div>
                 </div>
                 <span className="text-[12px] font-bold text-[#1D9E75]">{(log?.mobility_score || 5)}/10</span>
               </div>
               <p className="text-[11px] text-[#9CA3AF] italic mb-[10px]">Compared to your movement yesterday</p>

               <div className="relative pt-6 pb-2">
                  <div className="h-[6px] w-full bg-[#E5E7EB] rounded-[3px] relative overflow-hidden">
                     <div className="h-full bg-[#1D9E75]" style={{ width: `${(log?.mobility_score || 5) * 10}%` }} />
                  </div>
                  <input 
                    type="range" min="0" max="10" step="1"
                    className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
                    value={log?.mobility_score || 5}
                    onChange={(e) => handleUpdate({ mobility_score: parseInt(e.target.value) })}
                  />
                  <div 
                    className="absolute top-0 w-[26px] h-[26px] bg-white border-2 border-[#1D9E75] rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.15)] flex items-center justify-center pointer-events-none"
                    style={{ left: `calc(${(log?.mobility_score || 5) * 10}% - 13px)` }}
                  >
                     <div className="absolute -top-7 bg-[#1D9E75] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {log?.mobility_score || 5}
                     </div>
                  </div>
                  <div className="flex justify-between mt-3">
                     <span className="text-[10px] text-[#9CA3AF]">Stiff</span>
                     <span className="text-[10px] text-[#9CA3AF]">Moderate</span>
                     <span className="text-[10px] text-[#9CA3AF]">Full range</span>
                  </div>
               </div>
            </div>

            {/* CARD 7 — NOTE FOR TRAINER */}
            <div className="bg-white border-[0.5px] border-[#E5E7EB] rounded-[12px] p-[14px]">
               <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[12px] font-bold text-[#111827] uppercase">NOTE FOR TRAINER</h4>
                    <span className="px-2 py-0.5 border border-[#D1D5DB] text-[#6B7280] text-[10px] font-medium rounded-full">Optional</span>
                  </div>
               </div>
               <div className="relative">
                  <textarea 
                    className="w-full min-h-[80px] bg-[#F9FAFB] border-[0.5px] border-[#D1D5DB] rounded-[10px] p-3 text-[13px] placeholder:italic placeholder:text-[#9CA3AF] outline-none focus:min-h-[140px] focus:border-[#1D9E75] transition-all duration-300"
                    placeholder="Share any wins, concerns or training feedback..."
                    maxLength={1000}
                    value={log?.trainer_note || ''}
                    onChange={(e) => handleUpdate({ trainer_note: e.target.value })}
                  />
                  <span className="absolute bottom-2 right-3 text-[10px] text-[#9CA3AF] font-medium">
                    {(log?.trainer_note || '').length} / 1000
                  </span>
               </div>
            </div>

            {/* CARD 8 — TODAY AT A GLANCE */}
            <div className="bg-white border-[0.5px] border-[#E5E7EB] rounded-[12px] p-[14px] mb-8">
               <h4 className="text-[13px] font-semibold text-[#111827] mb-5">Today at a glance</h4>
               <div className="flex justify-between px-1">
                  {[
                    { label: 'Water', emoji: '💧', active: (log?.water_litres || 0) > 0 },
                    { label: 'Sleep', emoji: '🌙', active: (log?.sleep_hours || 0) > 0 },
                    { label: 'Mood', emoji: '😊', active: (log?.mood_score || 0) > 0 },
                    { label: 'Energy', emoji: '⚡', active: (log?.energy_level || 0) > 0 },
                    { label: 'Pain', emoji: '😌', active: (log?.pain_score !== null && log?.pain_score !== undefined) },
                    { label: 'Mobility', emoji: '🦵', active: (log?.mobility_score !== null && log?.mobility_score !== undefined) },
                  ].map(it => (
                    <div key={it.label} className="flex flex-col items-center gap-1.5">
                       <span className="text-[32px] mb-0.5 leading-none">{it.emoji}</span>
                       <span className="text-[10px] text-[#9CA3AF]">{it.label}</span>
                        {it.active ? (
                          <div className="w-[16px] h-[16px] rounded-full bg-[#1D9E75] flex items-center justify-center">
                            <Check size={10} className="text-white" strokeWidth={4} />
                          </div>
                        ) : (
                          <div className="w-[16px] h-[16px] rounded-full border border-[#D1D5DB]" />
                        )}
                    </div>
                  ))}
               </div>
               {doneCount >= 6 && (
                 <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-2.5 bg-[#E1F5EE] rounded-[8px] flex items-center justify-center"
                 >
                    <span className="text-[12px] font-medium text-[#0F6E56]">All sections complete — great work today! 🎉</span>
                 </motion.div>
               )}
            </div>

          </div>
        </div>

        {/* STICKY BOTTOM BUTTON */}
        <div className="absolute bottom-0 left-0 right-0 p-3 px-4 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.06)] z-[100]">
           <button 
             onClick={onSave}
             disabled={isSaving}
             className="w-full h-[48px] bg-[#1D9E75] text-white rounded-[10px] text-[14px] font-bold flex items-center justify-center active:scale-[0.98] transition-transform shadow-sm"
           >
             {isSaving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
             ) : showSavedState ? (
                <span>Saved ✓</span>
             ) : isAllDone ? (
                <span>Done — view my score →</span>
             ) : (
                <span>Save progress</span>
             )}
           </button>
        </div>

      </div>
    </div>
  );
}
