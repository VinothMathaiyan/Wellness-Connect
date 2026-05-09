import React from 'react';
import { Loader2, MessageSquare, CheckCircle2, Send, X } from 'lucide-react';

interface PlanActionSectionProps {
    approvalChoice: 'approved' | 'changes_requested' | null;
    isSubmitting: boolean;
    onStartProgram: () => void;
    onRequestChanges: () => void;
    onSendFeedback: () => void;
    onCancelChanges: () => void;
    isFeedbackValid: boolean;
}

export const PlanActionSection = React.memo(({ 
    approvalChoice, 
    isSubmitting, 
    onStartProgram, 
    onRequestChanges, 
    onSendFeedback, 
    onCancelChanges,
    isFeedbackValid
}: PlanActionSectionProps) => {

    if (approvalChoice === 'changes_requested') {
        return (
            <div className="flex gap-3 w-full">
                <button
                    disabled={isSubmitting}
                    onClick={onCancelChanges}
                    className="flex-1 h-[52px] bg-white border-2 border-gray-100 text-gray-700 rounded-xl flex items-center justify-center gap-2 font-bold transition-all active:scale-[0.98]"
                >
                    <X size={18} />
                    Cancel
                </button>
                <button
                    disabled={!isFeedbackValid || isSubmitting}
                    onClick={onSendFeedback}
                    className={`flex-1 h-[52px] rounded-xl flex items-center justify-center gap-2 font-bold transition-all active:scale-[0.98] ${
                        !isFeedbackValid 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20'
                    }`}
                >
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                    Send Feedback
                </button>
            </div>
        );
    }

    return (
        <div className="flex gap-3 w-full">
            <button
                disabled={isSubmitting}
                onClick={onRequestChanges}
                className="flex-[0.8] h-[52px] bg-white border-2 border-gray-100 hover:border-gray-200 text-gray-700 rounded-xl flex items-center justify-center gap-2 font-bold transition-all active:scale-[0.98] text-[14px]"
            >
                <MessageSquare size={18} className="text-gray-400" />
                Request Changes
            </button>
            <button
                disabled={isSubmitting}
                onClick={onStartProgram}
                className="flex-[1.2] h-[52px] bg-[#1D9E75] hover:bg-[#15825F] text-white rounded-xl flex items-center justify-center gap-2 font-bold transition-all active:scale-[0.98] text-[14px] shadow-sm shadow-[#1D9E75]/20"
            >
                {isSubmitting ? (
                    <Loader2 className="animate-spin" size={18} />
                ) : (
                    <>
                        <CheckCircle2 size={18} />
                        Start Program
                    </>
                )}
            </button>
        </div>
    );
});
