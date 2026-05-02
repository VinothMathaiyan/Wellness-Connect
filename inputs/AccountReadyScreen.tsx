/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Copy, Check } from 'lucide-react';

interface AccountReadyScreenProps {
  userData: {
    full_name: string;
    goals_json: string[];
    fitness_level: string;
  };
  onGoToDashboard: (id: string) => void;
}

export default function AccountReadyScreen({ userData, onGoToDashboard }: AccountReadyScreenProps) {
  const [copied, setCopied] = useState(false);
  
  const firstName = userData.full_name?.split(' ')[0] || "User";
  const currentYear = new Date().getFullYear();
  
  // Generate a mock sequential 5-digit number
  const clientId = useMemo(() => {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `WC-${currentYear}-${randomNum}`;
  }, [currentYear]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(clientId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Progress Bar */}
      <div className="w-full h-1 bg-border-light sticky top-0 z-10">
        <div className="h-full bg-primary w-full transition-all duration-500" />
      </div>

      <main className="flex-1 px-6 flex flex-col items-center justify-center text-center space-y-8 py-12">
        
        {/* Celebration Header */}
        <div className="space-y-4">
          <div className="text-[48px] animate-bounce">🎉</div>
          <h1 className="text-lg font-medium text-text-primary">
            You're all set, {firstName}!
          </h1>
          <p className="text-[13px] text-text-secondary leading-relaxed max-w-[280px] mx-auto">
            Your profile is created! 🚀 Our assessment team will call you 
            within 24 hours for a quick health review. Once confirmed, 
            you'll be able to select your trainer and start your journey.
          </p>
        </div>

        {/* Client ID Card */}
        <section className="w-full bg-white border border-border-light rounded-xl p-5 text-left shadow-sm">
          <p className="text-[12px] text-text-secondary mb-1">Your unique client ID</p>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[18px] font-medium text-primary tracking-tight">
              {clientId}
            </span>
            <div className="relative">
              <button 
                onClick={copyToClipboard}
                className="p-2 bg-input-bg rounded-lg text-text-secondary active:scale-90 transition-transform"
              >
                {copied ? <Check size={18} className="text-primary" /> : <Copy size={18} />}
              </button>
              {copied && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -top-10 left-1/2 -translate-x-1/2 bg-text-primary text-white text-[10px] px-2 py-1 rounded whitespace-nowrap"
                >
                  Copied!
                </motion.div>
              )}
            </div>
          </div>
        </section>

        {/* Summary Chips */}
        <div className="w-full flex flex-col items-center gap-4">
          <p className="label-caps text-[11px] text-text-secondary opacity-60">Summary of selections</p>
          <div className="flex flex-wrap justify-center gap-2">
            {userData.goals_json?.map((goal: string) => (
              <span 
                key={goal} 
                className="px-3 py-1 bg-green-light text-primary text-[11px] font-medium rounded-full border border-primary/10"
              >
                {goal}
              </span>
            ))}
            <span className="px-3 py-1 bg-input-bg text-text-secondary text-[11px] font-medium rounded-full border border-border-light">
              {userData.fitness_level}
            </span>
          </div>
        </div>

      </main>

      {/* CTA Button */}
      <div className="absolute bottom-0 w-full p-6 bg-white border-t border-border-light z-10">
        <button
          onClick={() => onGoToDashboard(clientId)}
          className="btn-primary"
        >
          Go to dashboard
        </button>
      </div>
    </div>
  );
}
